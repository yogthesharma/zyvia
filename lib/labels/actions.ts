"use server"

import { isValidWorkspaceSlug } from "@/lib/profile/schema"
import { getLabelsSettings } from "@/lib/labels/queries"
import {
  DEFAULT_LABEL_COLOR,
  isLabelId,
  isLabelKind,
  nextAvailableLabelName,
  parseLabelCreateInput,
  parseLabelUpdateInput,
  uniqueConstraintMessage,
} from "@/lib/labels/schema"
import type {
  LabelCreateInput,
  LabelKind,
  LabelRecord,
  LabelUpdateInput,
  LabelsActionResult,
  LabelsSettings,
} from "@/lib/labels/types"
import { createClient } from "@/lib/supabase/server"

type Access = {
  settings: LabelsSettings
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
}

async function requireLabelsAccess(input: {
  slug: string
  kind: LabelKind
  /** null = workspace settings page; uuid = team settings page */
  pageTeamId?: string | null
}): Promise<{ error: string } | Access> {
  if (!isValidWorkspaceSlug(input.slug)) {
    return { error: "Invalid workspace." }
  }
  if (!isLabelKind(input.kind)) {
    return { error: "Invalid label type." }
  }
  if (input.kind === "project" && input.pageTeamId) {
    return { error: "Project labels are workspace-scoped." }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: "You must be signed in." }

  const settings = await getLabelsSettings({
    slug: input.slug,
    userId: user.id,
    kind: input.kind,
    teamId: input.pageTeamId,
  })
  if (!settings) return { error: "Workspace not found." }
  if (!settings.canEdit) {
    return {
      error:
        settings.teamId != null
          ? "Only team managers can manage these labels."
          : "Only workspace owners and admins can manage labels.",
    }
  }

  return { settings, supabase, userId: user.id }
}

async function reload(access: Access): Promise<LabelsActionResult> {
  const settings = await getLabelsSettings({
    slug: access.settings.workspaceSlug,
    userId: access.userId,
    kind: access.settings.kind,
    teamId: access.settings.teamId,
  })
  if (!settings) return { error: "Could not reload labels." }
  return { settings }
}

function findLabel(settings: LabelsSettings, id: string) {
  return settings.labels.find((label) => label.id === id) ?? null
}

/** On the workspace page, team labels are editable by workspace admins
 *  (Linear shows them in “Workspace and teams” for editing). On a team page,
 *  only that team's labels may be mutated. */
function assertLabelEditable(
  settings: LabelsSettings,
  label: LabelRecord
): string | null {
  if (settings.teamId != null && label.teamId !== settings.teamId) {
    return "Label not found."
  }
  if (settings.kind !== label.kind) {
    return "Label not found."
  }
  return null
}

async function nextPosition(
  supabase: Access["supabase"],
  settings: LabelsSettings,
  parentId: string | null,
  teamId: string | null
) {
  let query = supabase
    .from("labels")
    .select("position")
    .eq("workspace_id", settings.workspaceId)
    .eq("kind", settings.kind)
    .order("position", { ascending: false })
    .limit(1)

  if (teamId) {
    query = query.eq("team_id", teamId)
  } else {
    query = query.is("team_id", null)
  }

  if (parentId) {
    query = query.eq("parent_id", parentId)
  } else {
    query = query.is("parent_id", null)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  const top = data?.[0]?.position
  return typeof top === "number" ? top + 1 : 0
}

export async function createLabel(
  slug: string,
  kind: LabelKind,
  input: LabelCreateInput,
  pageTeamId?: string | null
): Promise<LabelsActionResult> {
  try {
    const access = await requireLabelsAccess({ slug, kind, pageTeamId })
    if ("error" in access) return { error: access.error }

    const parsed = parseLabelCreateInput(input, { kind })
    if (parsed.error || !parsed.data) {
      return { error: parsed.error ?? "Invalid label." }
    }

    const { settings, supabase, userId } = access
    const teamId = settings.teamId
    const parentId = parsed.data.parentId ?? null

    if (parentId) {
      const parent = findLabel(settings, parentId)
      if (!parent || !parent.isGroup) {
        return { error: "Parent group not found." }
      }
      if (parent.archivedAt) {
        return { error: "Cannot add a label to an archived group." }
      }
      if (parent.teamId !== teamId) {
        return { error: "Parent group is out of scope." }
      }
      const childCount = settings.labels.filter(
        (label) => label.parentId === parentId
      ).length
      if (childCount >= 250) {
        return { error: "Label groups are limited to 250 labels." }
      }
    }

    const requestedName =
      parsed.data.name ?? (parsed.data.isGroup ? "New group" : "New label")
    const isDefaultName =
      requestedName === "New label" || requestedName === "New group"
    const name = isDefaultName
      ? nextAvailableLabelName(
          settings.labels,
          requestedName,
          parentId,
          teamId
        )
      : requestedName

    const position = await nextPosition(supabase, settings, parentId, teamId)
    const { error } = await supabase.from("labels").insert({
      workspace_id: settings.workspaceId,
      team_id: teamId,
      kind: settings.kind,
      name,
      description: parsed.data.description ?? "",
      color: parsed.data.isGroup
        ? DEFAULT_LABEL_COLOR
        : (parsed.data.color ?? DEFAULT_LABEL_COLOR),
      is_group: Boolean(parsed.data.isGroup),
      parent_id: parentId,
      position,
      created_by: userId,
    })

    if (error) {
      return { error: uniqueConstraintMessage(error.message) }
    }

    return reload(access)
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not create label.",
    }
  }
}

export async function updateLabel(
  slug: string,
  kind: LabelKind,
  labelId: string,
  input: LabelUpdateInput,
  pageTeamId?: string | null
): Promise<LabelsActionResult> {
  try {
    if (!isLabelId(labelId)) return { error: "Label not found." }

    const access = await requireLabelsAccess({ slug, kind, pageTeamId })
    if ("error" in access) return { error: access.error }

    const { settings, supabase } = access
    const existing = findLabel(settings, labelId)
    if (!existing) return { error: "Label not found." }
    const scopeError = assertLabelEditable(settings, existing)
    if (scopeError) return { error: scopeError }

    const parsed = parseLabelUpdateInput(input, {
      kind,
      isGroup: existing.isGroup,
    })
    if (parsed.error || !parsed.data) {
      return { error: parsed.error ?? "Invalid label." }
    }

    const patch: Record<string, unknown> = {}
    if (parsed.data.name !== undefined && parsed.data.name !== existing.name) {
      patch.name = parsed.data.name
    }
    if (
      parsed.data.description !== undefined &&
      parsed.data.description !== existing.description
    ) {
      patch.description = existing.isGroup ? "" : parsed.data.description
    }
    if (
      parsed.data.color !== undefined &&
      parsed.data.color !== existing.color &&
      !existing.isGroup
    ) {
      patch.color = parsed.data.color
    }
    if (
      parsed.data.parentId !== undefined &&
      parsed.data.parentId !== existing.parentId
    ) {
      if (existing.isGroup) {
        return { error: "Groups cannot be nested." }
      }
      if (parsed.data.parentId) {
        const parent = findLabel(settings, parsed.data.parentId)
        if (!parent || !parent.isGroup) {
          return { error: "Parent group not found." }
        }
        if (parent.teamId !== existing.teamId) {
          return { error: "Parent group is out of scope." }
        }
      }
      patch.parent_id = parsed.data.parentId
    }

    if (Object.keys(patch).length === 0) {
      return { settings }
    }

    const { error } = await supabase
      .from("labels")
      .update(patch)
      .eq("id", labelId)
      .eq("workspace_id", settings.workspaceId)

    if (error) {
      return { error: uniqueConstraintMessage(error.message) }
    }

    return reload(access)
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update label.",
    }
  }
}

export async function archiveLabel(
  slug: string,
  kind: LabelKind,
  labelId: string,
  pageTeamId?: string | null
): Promise<LabelsActionResult> {
  try {
    if (!isLabelId(labelId)) return { error: "Label not found." }

    const access = await requireLabelsAccess({ slug, kind, pageTeamId })
    if ("error" in access) return { error: access.error }

    const { settings, supabase } = access
    const existing = findLabel(settings, labelId)
    if (!existing) return { error: "Label not found." }
    const scopeError = assertLabelEditable(settings, existing)
    if (scopeError) return { error: scopeError }
    if (existing.archivedAt) return { settings }

    const now = new Date().toISOString()
    const ids = [labelId]
    if (existing.isGroup) {
      for (const child of settings.labels) {
        if (child.parentId === labelId) ids.push(child.id)
      }
    }

    const { error } = await supabase
      .from("labels")
      .update({ archived_at: now })
      .in("id", ids)
      .eq("workspace_id", settings.workspaceId)

    if (error) return { error: error.message }
    return reload(access)
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not archive label.",
    }
  }
}

export async function unarchiveLabel(
  slug: string,
  kind: LabelKind,
  labelId: string,
  pageTeamId?: string | null
): Promise<LabelsActionResult> {
  try {
    if (!isLabelId(labelId)) return { error: "Label not found." }

    const access = await requireLabelsAccess({ slug, kind, pageTeamId })
    if ("error" in access) return { error: access.error }

    const { settings, supabase } = access
    const existing = findLabel(settings, labelId)
    if (!existing) return { error: "Label not found." }
    const scopeError = assertLabelEditable(settings, existing)
    if (scopeError) return { error: scopeError }
    if (!existing.archivedAt) return { settings }

    if (existing.parentId) {
      const parent = findLabel(settings, existing.parentId)
      if (parent?.archivedAt) {
        return { error: "Unarchive the parent group first." }
      }
    }

    const ids = [labelId]
    if (existing.isGroup) {
      for (const child of settings.labels) {
        if (child.parentId === labelId) ids.push(child.id)
      }
    }

    // Parent first: child unarchive trigger rejects active children under archived groups.
    const { error: parentError } = await supabase
      .from("labels")
      .update({ archived_at: null })
      .eq("id", labelId)
      .eq("workspace_id", settings.workspaceId)

    if (parentError) return { error: parentError.message }

    const childIds = ids.filter((id) => id !== labelId)
    if (childIds.length > 0) {
      const { error: childError } = await supabase
        .from("labels")
        .update({ archived_at: null })
        .in("id", childIds)
        .eq("workspace_id", settings.workspaceId)
      if (childError) return { error: childError.message }
    }

    return reload(access)
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not restore label.",
    }
  }
}

export async function deleteLabel(
  slug: string,
  kind: LabelKind,
  labelId: string,
  pageTeamId?: string | null
): Promise<LabelsActionResult> {
  try {
    if (!isLabelId(labelId)) return { error: "Label not found." }

    const access = await requireLabelsAccess({ slug, kind, pageTeamId })
    if ("error" in access) return { error: access.error }

    const { settings, supabase } = access
    const existing = findLabel(settings, labelId)
    if (!existing) return { error: "Label not found." }
    const scopeError = assertLabelEditable(settings, existing)
    if (scopeError) return { error: scopeError }

    const { error } = await supabase
      .from("labels")
      .delete()
      .eq("id", labelId)
      .eq("workspace_id", settings.workspaceId)

    if (error) return { error: error.message }
    return reload(access)
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not delete label.",
    }
  }
}
