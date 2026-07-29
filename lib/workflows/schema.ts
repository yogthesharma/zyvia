import type {
  AutoArchiveAfterPreset,
  BranchWorkflowRule,
  PrAutomationKey,
  StaleAfterPreset,
  StatusProgressPlacement,
  TeamWorkflowSettingsUpdate,
} from "@/lib/workflows/types"

export const NO_ACTION_VALUE = "__none__"

export const STALE_AFTER_PRESETS = [
  "1_week",
  "2_weeks",
  "1_month",
  "3_months",
  "6_months",
  "1_year",
] as const satisfies readonly StaleAfterPreset[]

export const AUTO_ARCHIVE_AFTER_PRESETS = [
  "never",
  "1_week",
  "2_weeks",
  "1_month",
  "3_months",
  "6_months",
  "1_year",
] as const satisfies readonly AutoArchiveAfterPreset[]

export const STATUS_PROGRESS_PLACEMENTS = [
  "none",
  "first",
  "last",
] as const satisfies readonly StatusProgressPlacement[]

export const PR_AUTOMATION_FIELDS = [
  {
    key: "draftPrStatusId",
    label: "On draft PR open, move to…",
  },
  {
    key: "prOpenStatusId",
    label: "On PR or commit open, move to…",
  },
  {
    key: "prReviewStatusId",
    label: "On PR review request or activity, move to…",
  },
  {
    key: "prReadyStatusId",
    label: "On PR ready for merge, move to…",
  },
  {
    key: "prMergeStatusId",
    label: "On PR or commit merge, move to…",
  },
] as const satisfies readonly {
  key: PrAutomationKey
  label: string
}[]

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isWorkflowTeamId(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value)
}

export function isStatusIdOrNull(
  value: unknown
): value is string | null {
  if (value === null) return true
  return typeof value === "string" && UUID_RE.test(value)
}

export function isStaleAfterPreset(value: unknown): value is StaleAfterPreset {
  return (
    typeof value === "string" &&
    (STALE_AFTER_PRESETS as readonly string[]).includes(value)
  )
}

export function isAutoArchiveAfterPreset(
  value: unknown
): value is AutoArchiveAfterPreset {
  return (
    typeof value === "string" &&
    (AUTO_ARCHIVE_AFTER_PRESETS as readonly string[]).includes(value)
  )
}

export function isStatusProgressPlacement(
  value: unknown
): value is StatusProgressPlacement {
  return (
    typeof value === "string" &&
    (STATUS_PROGRESS_PLACEMENTS as readonly string[]).includes(value)
  )
}

export function staleAfterLabel(preset: StaleAfterPreset) {
  switch (preset) {
    case "1_week":
      return "1 week"
    case "2_weeks":
      return "2 weeks"
    case "1_month":
      return "1 month"
    case "3_months":
      return "3 months"
    case "6_months":
      return "6 months"
    case "1_year":
      return "1 year"
  }
}

export function autoArchiveAfterLabel(preset: AutoArchiveAfterPreset) {
  if (preset === "never") return "Never"
  return staleAfterLabel(preset)
}

export function statusProgressPlacementLabel(
  value: StatusProgressPlacement
) {
  switch (value) {
    case "none":
      return "No action"
    case "first":
      return "First"
    case "last":
      return "Last"
  }
}

export function normalizeBranchName(value: string) {
  return value.trim().replace(/\s+/g, "")
}

export function parseBranchRules(value: unknown): BranchWorkflowRule[] {
  if (!Array.isArray(value)) return []
  const rules: BranchWorkflowRule[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const row = item as Record<string, unknown>
    const id = typeof row.id === "string" ? row.id : null
    const branch =
      typeof row.branch === "string" ? normalizeBranchName(row.branch) : ""
    if (!id || !UUID_RE.test(id) || !branch) continue
    rules.push({
      id,
      branch,
      draftPrStatusId: isStatusIdOrNull(row.draftPrStatusId)
        ? row.draftPrStatusId
        : null,
      prOpenStatusId: isStatusIdOrNull(row.prOpenStatusId)
        ? row.prOpenStatusId
        : null,
      prReviewStatusId: isStatusIdOrNull(row.prReviewStatusId)
        ? row.prReviewStatusId
        : null,
      prReadyStatusId: isStatusIdOrNull(row.prReadyStatusId)
        ? row.prReadyStatusId
        : null,
      prMergeStatusId: isStatusIdOrNull(row.prMergeStatusId)
        ? row.prMergeStatusId
        : null,
    })
  }
  return rules
}

export function parseWorkflowSettingsUpdate(
  input: TeamWorkflowSettingsUpdate,
  validStatusIds: Set<string>
): { error: string } | { data: TeamWorkflowSettingsUpdate } {
  const data: TeamWorkflowSettingsUpdate = {}

  function parseStatusField(
    key: keyof TeamWorkflowSettingsUpdate,
    value: unknown
  ) {
    if (value === undefined) return null
    if (value === null) {
      ;(data as Record<string, unknown>)[key] = null
      return null
    }
    if (typeof value !== "string" || !UUID_RE.test(value)) {
      return "Choose a valid status."
    }
    if (!validStatusIds.has(value)) {
      return "Status not found for this team."
    }
    ;(data as Record<string, unknown>)[key] = value
    return null
  }

  for (const key of [
    "draftPrStatusId",
    "prOpenStatusId",
    "prReviewStatusId",
    "prReadyStatusId",
    "prMergeStatusId",
    "staleStatusId",
  ] as const) {
    if (input[key] !== undefined) {
      const error = parseStatusField(key, input[key])
      if (error) return { error }
    }
  }

  if (input.branchRules !== undefined) {
    if (!Array.isArray(input.branchRules)) {
      return { error: "Invalid branch rules." }
    }
    if (input.branchRules.length > 50) {
      return { error: "You can add up to 50 branch rules." }
    }
    const seen = new Set<string>()
    const rules: BranchWorkflowRule[] = []
    for (const rule of input.branchRules) {
      const branch = normalizeBranchName(rule.branch ?? "")
      if (!branch) return { error: "Enter a branch name." }
      if (branch.length > 120) {
        return { error: "Branch name must be 120 characters or fewer." }
      }
      const key = branch.toLowerCase()
      if (seen.has(key)) {
        return { error: "That branch already has a rule." }
      }
      seen.add(key)
      if (!rule.id || !UUID_RE.test(rule.id)) {
        return { error: "Invalid branch rule." }
      }
      const statusFields = [
        rule.draftPrStatusId,
        rule.prOpenStatusId,
        rule.prReviewStatusId,
        rule.prReadyStatusId,
        rule.prMergeStatusId,
      ]
      for (const statusId of statusFields) {
        if (statusId == null) continue
        if (!UUID_RE.test(statusId) || !validStatusIds.has(statusId)) {
          return { error: "Status not found for this team." }
        }
      }
      rules.push({
        id: rule.id,
        branch,
        draftPrStatusId: rule.draftPrStatusId ?? null,
        prOpenStatusId: rule.prOpenStatusId ?? null,
        prReviewStatusId: rule.prReviewStatusId ?? null,
        prReadyStatusId: rule.prReadyStatusId ?? null,
        prMergeStatusId: rule.prMergeStatusId ?? null,
      })
    }
    data.branchRules = rules
  }

  if (input.autoCloseParent !== undefined) {
    data.autoCloseParent = Boolean(input.autoCloseParent)
  }
  if (input.autoCloseSubIssues !== undefined) {
    data.autoCloseSubIssues = Boolean(input.autoCloseSubIssues)
  }
  if (input.autoCloseStale !== undefined) {
    data.autoCloseStale = Boolean(input.autoCloseStale)
  }
  if (input.staleAfterPreset !== undefined) {
    if (!isStaleAfterPreset(input.staleAfterPreset)) {
      return { error: "Choose a valid stale period." }
    }
    data.staleAfterPreset = input.staleAfterPreset
  }
  if (input.autoArchiveAfterPreset !== undefined) {
    if (!isAutoArchiveAfterPreset(input.autoArchiveAfterPreset)) {
      return { error: "Choose a valid archive period." }
    }
    data.autoArchiveAfterPreset = input.autoArchiveAfterPreset
  }
  if (input.statusProgressPlacement !== undefined) {
    if (!isStatusProgressPlacement(input.statusProgressPlacement)) {
      return { error: "Choose a valid placement." }
    }
    data.statusProgressPlacement = input.statusProgressPlacement
  }

  if (Object.keys(data).length === 0) {
    return { error: "Nothing to update." }
  }

  return { data }
}

export function emptyBranchRule(branch: string): BranchWorkflowRule {
  return {
    id: crypto.randomUUID(),
    branch: normalizeBranchName(branch),
    draftPrStatusId: null,
    prOpenStatusId: null,
    prReviewStatusId: null,
    prReadyStatusId: null,
    prMergeStatusId: null,
  }
}
