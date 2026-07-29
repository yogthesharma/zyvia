export type OnboardingStep =
  | "profile"
  | "workspace"
  | "team"
  | "theme"
  | "invite"
  | "done"

export type WorkspaceRole = "owner" | "admin" | "member"

export type Profile = {
  id: string
  full_name: string | null
  avatar_url: string | null
  username: string | null
  title: string | null
  theme: "light" | "dark" | "system"
  onboarding_step: OnboardingStep
  onboarding_completed_at: string | null
}

export type Workspace = {
  id: string
  name: string
  slug: string
  logo_url?: string | null
  fiscal_year_start_month?: number
  region?: string
  deletion_scheduled_at?: string | null
  created_by: string | null
}

export type Team = {
  id: string
  workspace_id: string
  name: string
  key: string
  issue_counter: number
}

export type WorkflowState = {
  id: string
  team_id: string
  name: string
  category: "backlog" | "unstarted" | "started" | "completed" | "canceled"
  position: number
  is_default: boolean
  color: string | null
}

export type Issue = {
  id: string
  workspace_id: string
  team_id: string
  number: number
  title: string
  description: string | null
  /** Plate rich document JSON */
  description_doc?: unknown | null
  status_id: string
  priority: number
  assignee_id: string | null
  creator_id: string | null
  created_at: string
  updated_at: string
}
