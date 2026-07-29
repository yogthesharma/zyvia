"use server"

import { isValidWorkspaceSlug } from "@/lib/profile/schema"
import { getSlaSettings } from "@/lib/sla/queries"
import {
  defaultSlaRules,
  isSlaRuleId,
  isSlaWorkWeek,
  parseSlaRuleInput,
} from "@/lib/sla/schema"
import type {
  SlaActionResult,
  SlaRuleInput,
  SlaWorkWeek,
} from "@/lib/sla/types"
import { createClient } from "@/lib/supabase/server"

async function requireSlaEditor(slug: string, userId: string) {
  const settings = await getSlaSettings(slug, userId)
  if (!settings) return { error: "Workspace not found." } as const
  if (!settings.canEdit) {
    return {
      error: "Only workspace owners and admins can manage SLAs.",
    } as const
  }
  return { settings } as const
}

async function reload(
  slug: string,
  userId: string
): Promise<SlaActionResult> {
  const settings = await getSlaSettings(slug, userId)
  if (!settings) return { error: "Workspace not found after save." }
  return { settings }
}

function ruleInsertRows(workspaceId: string, rules: SlaRuleInput[]) {
  return rules.map((rule, index) => ({
    workspace_id: workspaceId,
    position: index,
    action: rule.action,
    duration_preset: rule.durationPreset ?? null,
    custom_amount: rule.customAmount ?? null,
    custom_unit: rule.customUnit ?? null,
    filters: rule.filters,
  }))
}

export async function enableWorkspaceSlas(
  slug: string
): Promise<SlaActionResult> {
  try {
    if (!isValidWorkspaceSlug(slug)) return { error: "Invalid workspace." }
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return { error: "You must be signed in." }

    const access = await requireSlaEditor(slug, user.id)
    if ("error" in access) return { error: access.error }

    if (access.settings.enabled) {
      return { settings: access.settings }
    }

    const { error: upsertError } = await supabase
      .from("workspace_sla_settings")
      .upsert(
        {
          workspace_id: access.settings.workspaceId,
          enabled: true,
          work_week: access.settings.workWeek,
        },
        { onConflict: "workspace_id" }
      )
    if (upsertError) return { error: upsertError.message }

    if (access.settings.rules.length === 0) {
      const { error: seedError } = await supabase
        .from("workspace_sla_rules")
        .insert(
          ruleInsertRows(access.settings.workspaceId, defaultSlaRules())
        )
      if (seedError) {
        // Roll back enable so the workspace isn't stuck enabled with zero rules.
        await supabase
          .from("workspace_sla_settings")
          .update({ enabled: false })
          .eq("workspace_id", access.settings.workspaceId)
        return { error: seedError.message }
      }
    }

    return reload(slug, user.id)
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not enable SLAs.",
    }
  }
}

export async function disableWorkspaceSlas(
  slug: string
): Promise<SlaActionResult> {
  try {
    if (!isValidWorkspaceSlug(slug)) return { error: "Invalid workspace." }
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return { error: "You must be signed in." }

    const access = await requireSlaEditor(slug, user.id)
    if ("error" in access) return { error: access.error }
    if (!access.settings.enabled) return { settings: access.settings }

    const { error } = await supabase.from("workspace_sla_settings").upsert(
      {
        workspace_id: access.settings.workspaceId,
        enabled: false,
        work_week: access.settings.workWeek,
      },
      { onConflict: "workspace_id" }
    )
    if (error) return { error: error.message }

    return reload(slug, user.id)
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not disable SLAs.",
    }
  }
}

export async function updateSlaWorkWeek(
  slug: string,
  workWeek: SlaWorkWeek
): Promise<SlaActionResult> {
  try {
    if (!isValidWorkspaceSlug(slug)) return { error: "Invalid workspace." }
    if (!isSlaWorkWeek(workWeek)) return { error: "Invalid work week." }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return { error: "You must be signed in." }

    const access = await requireSlaEditor(slug, user.id)
    if ("error" in access) return { error: access.error }
    if (!access.settings.enabled) {
      return { error: "Enable SLAs before changing the work week." }
    }
    if (access.settings.workWeek === workWeek) {
      return { settings: access.settings }
    }

    const { error } = await supabase.from("workspace_sla_settings").upsert(
      {
        workspace_id: access.settings.workspaceId,
        enabled: true,
        work_week: workWeek,
      },
      { onConflict: "workspace_id" }
    )
    if (error) return { error: error.message }

    return reload(slug, user.id)
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not update work week.",
    }
  }
}

export async function createSlaRule(
  slug: string,
  input: SlaRuleInput
): Promise<SlaActionResult> {
  try {
    if (!isValidWorkspaceSlug(slug)) return { error: "Invalid workspace." }
    const parsed = parseSlaRuleInput(input)
    if (parsed.error || !parsed.data) {
      return { error: parsed.error ?? "Invalid SLA rule." }
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return { error: "You must be signed in." }

    const access = await requireSlaEditor(slug, user.id)
    if ("error" in access) return { error: access.error }
    if (!access.settings.enabled) {
      return { error: "Enable SLAs before adding rules." }
    }

    const position =
      access.settings.rules.reduce(
        (max, rule) => Math.max(max, rule.position),
        -1
      ) + 1
    const { error } = await supabase.from("workspace_sla_rules").insert({
      workspace_id: access.settings.workspaceId,
      position,
      action: parsed.data.action,
      duration_preset: parsed.data.durationPreset ?? null,
      custom_amount: parsed.data.customAmount ?? null,
      custom_unit: parsed.data.customUnit ?? null,
      filters: parsed.data.filters,
    })
    if (error) {
      if (error.code === "23505") {
        return {
          error: "Another rule was added at the same time. Try again.",
        }
      }
      if (error.code === "23514") {
        return { error: "That SLA rule format is invalid." }
      }
      return { error: error.message }
    }

    return reload(slug, user.id)
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not create SLA rule.",
    }
  }
}

export async function updateSlaRule(
  slug: string,
  ruleId: string,
  input: SlaRuleInput
): Promise<SlaActionResult> {
  try {
    if (!isValidWorkspaceSlug(slug)) return { error: "Invalid workspace." }
    if (!isSlaRuleId(ruleId)) return { error: "Rule not found." }
    const parsed = parseSlaRuleInput(input)
    if (parsed.error || !parsed.data) {
      return { error: parsed.error ?? "Invalid SLA rule." }
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return { error: "You must be signed in." }

    const access = await requireSlaEditor(slug, user.id)
    if ("error" in access) return { error: access.error }
    if (!access.settings.enabled) {
      return { error: "Enable SLAs before editing rules." }
    }

    const existing = access.settings.rules.find((rule) => rule.id === ruleId)
    if (!existing) return { error: "Rule not found." }

    const next = parsed.data
    const unchanged =
      existing.action === next.action &&
      existing.durationPreset === (next.durationPreset ?? null) &&
      existing.customAmount === (next.customAmount ?? null) &&
      existing.customUnit === (next.customUnit ?? null) &&
      existing.filters.priority.length === next.filters.priority.length &&
      existing.filters.priority.every((priority) =>
        next.filters.priority.includes(priority)
      )
    if (unchanged) return { settings: access.settings }

    const { error } = await supabase
      .from("workspace_sla_rules")
      .update({
        action: next.action,
        duration_preset: next.durationPreset ?? null,
        custom_amount: next.customAmount ?? null,
        custom_unit: next.customUnit ?? null,
        filters: next.filters,
      })
      .eq("id", ruleId)
      .eq("workspace_id", access.settings.workspaceId)

    if (error) {
      if (error.code === "23514") {
        return { error: "That SLA rule format is invalid." }
      }
      return { error: error.message }
    }
    return reload(slug, user.id)
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update SLA rule.",
    }
  }
}

export async function deleteSlaRule(
  slug: string,
  ruleId: string
): Promise<SlaActionResult> {
  try {
    if (!isValidWorkspaceSlug(slug)) return { error: "Invalid workspace." }
    if (!isSlaRuleId(ruleId)) return { error: "Rule not found." }
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return { error: "You must be signed in." }

    const access = await requireSlaEditor(slug, user.id)
    if ("error" in access) return { error: access.error }
    if (!access.settings.enabled) {
      return { error: "Enable SLAs before deleting rules." }
    }

    const remaining = access.settings.rules
      .filter((rule) => rule.id !== ruleId)
      .sort((a, b) => a.position - b.position)
    if (remaining.length === access.settings.rules.length) {
      return { error: "Rule not found." }
    }

    const { error: deleteError } = await supabase
      .from("workspace_sla_rules")
      .delete()
      .eq("id", ruleId)
      .eq("workspace_id", access.settings.workspaceId)
    if (deleteError) return { error: deleteError.message }

    // Park then densify to avoid unique (workspace_id, position) collisions.
    const parkBase = remaining.length + 100
    for (let index = 0; index < remaining.length; index++) {
      const { error } = await supabase
        .from("workspace_sla_rules")
        .update({ position: parkBase + index })
        .eq("id", remaining[index].id)
        .eq("workspace_id", access.settings.workspaceId)
      if (error) return { error: error.message }
    }
    for (let index = 0; index < remaining.length; index++) {
      const { error } = await supabase
        .from("workspace_sla_rules")
        .update({ position: index })
        .eq("id", remaining[index].id)
        .eq("workspace_id", access.settings.workspaceId)
      if (error) return { error: error.message }
    }

    return reload(slug, user.id)
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not delete SLA rule.",
    }
  }
}

export async function reorderSlaRules(
  slug: string,
  orderedIds: string[]
): Promise<SlaActionResult> {
  try {
    if (!isValidWorkspaceSlug(slug)) return { error: "Invalid workspace." }
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return { error: "Invalid rule order." }
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) return { error: "You must be signed in." }

    const access = await requireSlaEditor(slug, user.id)
    if ("error" in access) return { error: access.error }
    if (!access.settings.enabled) {
      return { error: "Enable SLAs before reordering rules." }
    }

    const currentIds = access.settings.rules
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((rule) => rule.id)

    if (orderedIds.length !== currentIds.length) {
      return { error: "Rule list is out of date. Refresh and try again." }
    }
    const uniqueOrdered = new Set(orderedIds)
    if (uniqueOrdered.size !== orderedIds.length) {
      return { error: "Invalid rule order." }
    }
    for (const id of orderedIds) {
      if (!isSlaRuleId(id) || !currentIds.includes(id)) {
        return { error: "Rule list is out of date. Refresh and try again." }
      }
    }

    const unchanged = orderedIds.every((id, index) => id === currentIds[index])
    if (unchanged) return { settings: access.settings }

    // Park all rows first to avoid unique (workspace_id, position) collisions.
    const parkBase = orderedIds.length + 100
    for (let index = 0; index < orderedIds.length; index++) {
      const { error } = await supabase
        .from("workspace_sla_rules")
        .update({ position: parkBase + index })
        .eq("id", orderedIds[index])
        .eq("workspace_id", access.settings.workspaceId)
      if (error) return { error: error.message }
    }

    for (let index = 0; index < orderedIds.length; index++) {
      const { error } = await supabase
        .from("workspace_sla_rules")
        .update({ position: index })
        .eq("id", orderedIds[index])
        .eq("workspace_id", access.settings.workspaceId)
      if (error) return { error: error.message }
    }

    return reload(slug, user.id)
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not reorder SLA rules.",
    }
  }
}
