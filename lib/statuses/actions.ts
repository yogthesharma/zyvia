"use server"

import { isValidWorkspaceSlug } from "@/lib/profile/schema"
import { getStatusesSettings } from "@/lib/statuses/queries"
import {
  categoriesForKind,
  defaultColorForCategory,
  isStatusId,
  isStatusKind,
  nextAvailableStatusName,
  parseStatusCreateInput,
  parseStatusUpdateInput,
  uniqueConstraintMessage,
} from "@/lib/statuses/schema"
import type {
  StatusCategory,
  StatusCreateInput,
  StatusesActionResult,
  StatusesSettings,
  StatusKind,
  StatusUpdateInput,
} from "@/lib/statuses/types"
import { createClient } from "@/lib/supabase/server"

type Access = {
  settings: StatusesSettings
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function requireStatusesAccess(input: {
  slug: string
  kind: StatusKind
  teamId?: string | null
}): Promise<{ error: string } | Access> {
  if (!isValidWorkspaceSlug(input.slug)) {
    return { error: "Invalid workspace." }
  }
  if (!isStatusKind(input.kind)) {
    return { error: "Invalid status type." }
  }
  if (input.kind === "project" && input.teamId) {
    return { error: "Project statuses are workspace-scoped." }
  }
  if (input.kind === "issue") {
    if (!input.teamId || !UUID_RE.test(input.teamId)) {
      return { error: "Issue statuses require a team." }
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()
  if (authError || !user) return { error: "You must be signed in." }

  const settings = await getStatusesSettings({
    slug: input.slug,
    userId: user.id,
    kind: input.kind,
    teamId: input.teamId,
  })
  if (!settings) return { error: "Workspace not found." }
  if (!settings.canEdit) {
    return {
      error:
        settings.kind === "issue"
          ? "Only team managers can manage issue statuses."
          : "Only workspace owners and admins can manage project statuses.",
    }
  }

  return { settings, supabase, userId: user.id }
}

async function reload(access: Access): Promise<StatusesActionResult> {
  const settings = await getStatusesSettings({
    slug: access.settings.workspaceSlug,
    userId: access.userId,
    kind: access.settings.kind,
    teamId: access.settings.teamId,
  })
  if (!settings) return { error: "Could not reload statuses." }
  return { settings }
}

function findStatus(settings: StatusesSettings, id: string) {
  return settings.statuses.find((status) => status.id === id) ?? null
}

function countInCategory(settings: StatusesSettings, category: StatusCategory) {
  return settings.statuses.filter((status) => status.category === category)
    .length
}

function isValidCategoryForKind(kind: StatusKind, category: StatusCategory) {
  return (categoriesForKind(kind) as readonly string[]).includes(category)
}

function nextPosition(access: Access, category: StatusCategory) {
  const inCategory = access.settings.statuses.filter(
    (status) => status.category === category
  )
  if (inCategory.length === 0) return 0
  return Math.max(...inCategory.map((status) => status.position)) + 1
}

async function clearDefaults(access: Access) {
  if (access.settings.kind === "issue") {
    return access.supabase
      .from("workflow_states")
      .update({ is_default: false })
      .eq("team_id", access.settings.teamId!)
      .eq("is_default", true)
  }
  return access.supabase
    .from("project_statuses")
    .update({ is_default: false })
    .eq("workspace_id", access.settings.workspaceId)
    .eq("is_default", true)
}

async function restoreDefault(access: Access, statusId: string) {
  if (access.settings.kind === "issue") {
    return access.supabase
      .from("workflow_states")
      .update({ is_default: true })
      .eq("id", statusId)
      .eq("team_id", access.settings.teamId!)
  }
  return access.supabase
    .from("project_statuses")
    .update({ is_default: true })
    .eq("id", statusId)
    .eq("workspace_id", access.settings.workspaceId)
}

export async function createStatus(input: {
  slug: string
  kind: StatusKind
  teamId?: string | null
  data: StatusCreateInput
}): Promise<StatusesActionResult> {
  try {
    const access = await requireStatusesAccess(input)
    if ("error" in access) return { error: access.error }

    const parsed = parseStatusCreateInput(access.settings.kind, input.data)
    if ("error" in parsed) return { error: parsed.error }

    const name = nextAvailableStatusName(
      parsed.data.name,
      access.settings.statuses.map((status) => status.name)
    )
    const position = nextPosition(access, parsed.data.category)

    if (access.settings.kind === "issue") {
      const { error } = await access.supabase.from("workflow_states").insert({
        team_id: access.settings.teamId!,
        name,
        description: parsed.data.description,
        category: parsed.data.category,
        position,
        is_default: false,
        color: parsed.data.color,
      })
      if (error) return { error: uniqueConstraintMessage(error.message) }
    } else {
      const { error } = await access.supabase.from("project_statuses").insert({
        workspace_id: access.settings.workspaceId,
        name,
        description: parsed.data.description,
        category: parsed.data.category,
        position,
        is_default: false,
        color: parsed.data.color,
      })
      if (error) return { error: uniqueConstraintMessage(error.message) }
    }

    return reload(access)
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not create status.",
    }
  }
}

export async function updateStatus(input: {
  slug: string
  kind: StatusKind
  teamId?: string | null
  statusId: string
  data: StatusUpdateInput
}): Promise<StatusesActionResult> {
  try {
    const access = await requireStatusesAccess(input)
    if ("error" in access) return { error: access.error }
    if (!isStatusId(input.statusId)) return { error: "Status not found." }

    const existing = findStatus(access.settings, input.statusId)
    if (!existing) return { error: "Status not found." }

    const parsed = parseStatusUpdateInput(input.data)
    if ("error" in parsed) return { error: parsed.error }

    if (parsed.data.isDefault === false && existing.isDefault) {
      return { error: "Pick another status as the default first." }
    }

    const patch: Record<string, unknown> = {}
    if (
      parsed.data.name !== undefined &&
      parsed.data.name !== existing.name
    ) {
      patch.name = parsed.data.name
    }
    if (
      parsed.data.description !== undefined &&
      parsed.data.description !== existing.description
    ) {
      patch.description = parsed.data.description
    }
    if (
      parsed.data.color !== undefined &&
      parsed.data.color !== existing.color
    ) {
      patch.color = parsed.data.color
    }

    const makeDefault =
      parsed.data.isDefault === true && !existing.isDefault

    if (!makeDefault && Object.keys(patch).length === 0) {
      return { settings: access.settings }
    }

    const previousDefault = access.settings.statuses.find(
      (status) => status.isDefault
    )

    if (makeDefault) {
      const { error: clearError } = await clearDefaults(access)
      if (clearError) return { error: clearError.message }
      patch.is_default = true
    }

    if (access.settings.kind === "issue") {
      const { error } = await access.supabase
        .from("workflow_states")
        .update(patch)
        .eq("id", input.statusId)
        .eq("team_id", access.settings.teamId!)
      if (error) {
        if (
          makeDefault &&
          previousDefault &&
          previousDefault.id !== existing.id
        ) {
          await restoreDefault(access, previousDefault.id)
        }
        return { error: uniqueConstraintMessage(error.message) }
      }
    } else {
      const { error } = await access.supabase
        .from("project_statuses")
        .update(patch)
        .eq("id", input.statusId)
        .eq("workspace_id", access.settings.workspaceId)
      if (error) {
        if (
          makeDefault &&
          previousDefault &&
          previousDefault.id !== existing.id
        ) {
          await restoreDefault(access, previousDefault.id)
        }
        return { error: uniqueConstraintMessage(error.message) }
      }
    }

    return reload(access)
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not update status.",
    }
  }
}

export async function reorderStatuses(input: {
  slug: string
  kind: StatusKind
  teamId?: string | null
  category: StatusCategory
  orderedIds: string[]
}): Promise<StatusesActionResult> {
  try {
    const access = await requireStatusesAccess(input)
    if ("error" in access) return { error: access.error }

    if (!isValidCategoryForKind(access.settings.kind, input.category)) {
      return { error: "Invalid status category." }
    }

    const inCategory = access.settings.statuses
      .filter((status) => status.category === input.category)
      .slice()
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))

    if (inCategory.length !== input.orderedIds.length) {
      return { error: "Status list is out of date. Refresh and try again." }
    }

    const idSet = new Set(inCategory.map((status) => status.id))
    for (const id of input.orderedIds) {
      if (!isStatusId(id) || !idSet.has(id)) {
        return { error: "Status list is out of date. Refresh and try again." }
      }
    }

    const unchanged = inCategory.every(
      (status, index) => status.id === input.orderedIds[index]
    )
    if (unchanged) return { settings: access.settings }

    const parkBase = inCategory.length + 100
    for (let index = 0; index < input.orderedIds.length; index++) {
      const id = input.orderedIds[index]!
      if (access.settings.kind === "issue") {
        const { error } = await access.supabase
          .from("workflow_states")
          .update({ position: parkBase + index })
          .eq("id", id)
          .eq("team_id", access.settings.teamId!)
        if (error) return { error: error.message }
      } else {
        const { error } = await access.supabase
          .from("project_statuses")
          .update({ position: parkBase + index })
          .eq("id", id)
          .eq("workspace_id", access.settings.workspaceId)
        if (error) return { error: error.message }
      }
    }

    for (let index = 0; index < input.orderedIds.length; index++) {
      const id = input.orderedIds[index]!
      if (access.settings.kind === "issue") {
        const { error } = await access.supabase
          .from("workflow_states")
          .update({ position: index })
          .eq("id", id)
          .eq("team_id", access.settings.teamId!)
        if (error) return { error: error.message }
      } else {
        const { error } = await access.supabase
          .from("project_statuses")
          .update({ position: index })
          .eq("id", id)
          .eq("workspace_id", access.settings.workspaceId)
        if (error) return { error: error.message }
      }
    }

    return reload(access)
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not reorder statuses.",
    }
  }
}

export async function deleteStatus(input: {
  slug: string
  kind: StatusKind
  teamId?: string | null
  statusId: string
  replacementStatusId?: string | null
}): Promise<StatusesActionResult> {
  try {
    const access = await requireStatusesAccess(input)
    if ("error" in access) return { error: access.error }
    if (!isStatusId(input.statusId)) return { error: "Status not found." }

    const existing = findStatus(access.settings, input.statusId)
    if (!existing) return { error: "Status not found." }

    if (countInCategory(access.settings, existing.category) <= 1) {
      return {
        error: "Each category needs at least one status.",
      }
    }

    if (existing.isDefault) {
      return {
        error: "Set another status as the default before deleting this one.",
      }
    }

    if (existing.usageCount > 0) {
      if (
        !input.replacementStatusId ||
        !isStatusId(input.replacementStatusId)
      ) {
        return {
          error: "Choose a replacement status for issues that use this status.",
        }
      }
      const replacement = findStatus(access.settings, input.replacementStatusId)
      if (!replacement || replacement.id === existing.id) {
        return { error: "Choose a valid replacement status." }
      }
      if (access.settings.kind === "issue") {
        const { error: moveError } = await access.supabase
          .from("issues")
          .update({ status_id: replacement.id })
          .eq("status_id", existing.id)
          .eq("team_id", access.settings.teamId!)
        if (moveError) return { error: moveError.message }
      }
    }

    if (access.settings.kind === "issue") {
      const { error } = await access.supabase
        .from("workflow_states")
        .delete()
        .eq("id", input.statusId)
        .eq("team_id", access.settings.teamId!)
      if (error) return { error: error.message }
    } else {
      const { error } = await access.supabase
        .from("project_statuses")
        .delete()
        .eq("id", input.statusId)
        .eq("workspace_id", access.settings.workspaceId)
      if (error) return { error: error.message }
    }

    return reload(access)
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Could not delete status.",
    }
  }
}

export async function addStatusInCategory(input: {
  slug: string
  kind: StatusKind
  teamId?: string | null
  category: StatusCategory
}): Promise<StatusesActionResult> {
  if (
    !isStatusKind(input.kind) ||
    !isValidCategoryForKind(input.kind, input.category)
  ) {
    return { error: "Invalid status category." }
  }

  return createStatus({
    slug: input.slug,
    kind: input.kind,
    teamId: input.teamId,
    data: {
      category: input.category,
      name: "New status",
      description: "",
      color: defaultColorForCategory(input.kind, input.category),
    },
  })
}
