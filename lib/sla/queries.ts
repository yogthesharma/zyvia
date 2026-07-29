import { isValidWorkspaceSlug } from "@/lib/profile/schema"
import { isSlaPriority, isSlaWorkWeek } from "@/lib/sla/schema"
import type {
  SlaPriority,
  SlaRule,
  SlaRuleFilters,
  SlaRuleRow,
  SlaSettings,
  SlaSettingsRow,
  SlaWorkWeek,
} from "@/lib/sla/types"
import type { WorkspaceRole } from "@/lib/workspace/types"
import { createClient } from "@/lib/supabase/server"

function parseFilters(raw: unknown): SlaRuleFilters {
  if (!raw || typeof raw !== "object") return { priority: [] }
  const priorityRaw = (raw as Record<string, unknown>).priority
  if (!Array.isArray(priorityRaw)) return { priority: [] }
  const priority: SlaPriority[] = []
  for (const item of priorityRaw) {
    if (isSlaPriority(item) && !priority.includes(item)) priority.push(item)
  }
  return { priority }
}

export function mapSlaRuleRow(row: SlaRuleRow): SlaRule {
  return {
    id: row.id,
    position: row.position,
    action: row.action,
    durationPreset: row.duration_preset,
    customAmount: row.custom_amount,
    customUnit: row.custom_unit,
    filters: parseFilters(row.filters),
  }
}

export async function getSlaSettings(
  slug: string,
  userId: string
): Promise<SlaSettings | null> {
  if (!isValidWorkspaceSlug(slug)) return null

  const supabase = await createClient()
  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .select("id, slug, deletion_scheduled_at")
    .eq("slug", slug)
    .maybeSingle()

  if (workspaceError) throw new Error(workspaceError.message)
  if (!workspace) return null

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", userId)
    .maybeSingle()

  if (membershipError) throw new Error(membershipError.message)
  if (!membership) return null

  const role = membership.role as WorkspaceRole
  const deletionLocked = Boolean(workspace.deletion_scheduled_at)
  const canEdit =
    (role === "owner" || role === "admin") && !deletionLocked

  const { data: settingsRow, error: settingsError } = await supabase
    .from("workspace_sla_settings")
    .select("workspace_id, enabled, work_week")
    .eq("workspace_id", workspace.id)
    .maybeSingle()

  if (settingsError) throw new Error(settingsError.message)

  const settings: SlaSettingsRow = settingsRow
    ? (settingsRow as SlaSettingsRow)
    : {
        workspace_id: workspace.id,
        enabled: false,
        work_week: "mon_fri",
      }

  const workWeek: SlaWorkWeek = isSlaWorkWeek(settings.work_week)
    ? settings.work_week
    : "mon_fri"

  const { data: ruleRows, error: rulesError } = await supabase
    .from("workspace_sla_rules")
    .select(
      "id, workspace_id, position, action, duration_preset, custom_amount, custom_unit, filters"
    )
    .eq("workspace_id", workspace.id)
    .order("position", { ascending: true })

  if (rulesError) throw new Error(rulesError.message)

  return {
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    enabled: Boolean(settings.enabled),
    workWeek,
    canEdit,
    rules: ((ruleRows ?? []) as SlaRuleRow[]).map(mapSlaRuleRow),
  }
}
