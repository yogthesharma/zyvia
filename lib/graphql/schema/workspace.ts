import { GraphQLError } from "graphql"

import type { Builder } from "@/lib/graphql/builder"

export type WorkspaceRow = {
  id: string
  name: string
  slug: string
  created_by: string | null
}

export type TeamRow = {
  id: string
  workspace_id: string
  name: string
  key: string
  issue_counter: number
}

export type WorkflowStateRow = {
  id: string
  team_id: string
  name: string
  category: string
  position: number
  is_default: boolean
  color: string | null
}

export type IssueRow = {
  id: string
  workspace_id: string
  team_id: string
  number: number
  title: string
  description: string | null
  status_id: string
  priority: number
  assignee_id: string | null
  creator_id: string | null
  created_at: string
  updated_at: string
}

export function registerWorkspace(builder: Builder) {
  const WorkspaceRef = builder.objectRef<WorkspaceRow>("Workspace")
  const TeamRef = builder.objectRef<TeamRow>("Team")
  const WorkflowStateRef = builder.objectRef<WorkflowStateRow>("WorkflowState")
  const IssueRef = builder.objectRef<IssueRow>("Issue")

  WorkspaceRef.implement({
    fields: (t) => ({
      id: t.exposeID("id"),
      name: t.exposeString("name"),
      slug: t.exposeString("slug"),
      teams: t.field({
        type: [TeamRef],
        resolve: async (workspace, _args, ctx) => {
          const { data, error } = await ctx.supabase
            .from("teams")
            .select("id, workspace_id, name, key, issue_counter")
            .eq("workspace_id", workspace.id)
            .order("name")

          if (error) throw new GraphQLError(error.message)
          return data ?? []
        },
      }),
      issues: t.field({
        type: [IssueRef],
        args: {
          limit: t.arg.int({ defaultValue: 100 }),
        },
        resolve: async (workspace, args, ctx) => {
          const { data, error } = await ctx.supabase
            .from("issues")
            .select(
              "id, workspace_id, team_id, number, title, description, status_id, priority, assignee_id, creator_id, created_at, updated_at"
            )
            .eq("workspace_id", workspace.id)
            .order("created_at", { ascending: false })
            .limit(args.limit ?? 100)

          if (error) throw new GraphQLError(error.message)
          return data ?? []
        },
      }),
    }),
  })

  TeamRef.implement({
    fields: (t) => ({
      id: t.exposeID("id"),
      name: t.exposeString("name"),
      key: t.exposeString("key"),
      issueCounter: t.exposeInt("issue_counter"),
    }),
  })

  WorkflowStateRef.implement({
    fields: (t) => ({
      id: t.exposeID("id"),
      name: t.exposeString("name"),
      category: t.exposeString("category"),
      position: t.exposeInt("position"),
      isDefault: t.exposeBoolean("is_default"),
      color: t.exposeString("color", { nullable: true }),
    }),
  })

  IssueRef.implement({
    fields: (t) => ({
      id: t.exposeID("id"),
      number: t.exposeInt("number"),
      title: t.exposeString("title"),
      description: t.exposeString("description", { nullable: true }),
      priority: t.exposeInt("priority"),
      createdAt: t.expose("created_at", { type: "DateTime" }),
      updatedAt: t.expose("updated_at", { type: "DateTime" }),
      identifier: t.string({
        resolve: async (issue, _args, ctx) => {
          const { data } = await ctx.supabase
            .from("teams")
            .select("key")
            .eq("id", issue.team_id)
            .maybeSingle()
          return `${data?.key ?? "???"}-${issue.number}`
        },
      }),
      team: t.field({
        type: TeamRef,
        nullable: true,
        resolve: async (issue, _args, ctx) => {
          const { data, error } = await ctx.supabase
            .from("teams")
            .select("id, workspace_id, name, key, issue_counter")
            .eq("id", issue.team_id)
            .maybeSingle()
          if (error) throw new GraphQLError(error.message)
          return data
        },
      }),
      status: t.field({
        type: WorkflowStateRef,
        nullable: true,
        resolve: async (issue, _args, ctx) => {
          const { data, error } = await ctx.supabase
            .from("workflow_states")
            .select(
              "id, team_id, name, category, position, is_default, color"
            )
            .eq("id", issue.status_id)
            .maybeSingle()
          if (error) throw new GraphQLError(error.message)
          return data
        },
      }),
    }),
  })

  builder.queryField("workspace", (t) =>
    t.field({
      type: WorkspaceRef,
      nullable: true,
      args: {
        slug: t.arg.string({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        if (!ctx.user) {
          throw new GraphQLError("Unauthorized", {
            extensions: { code: "UNAUTHORIZED" },
          })
        }

        const { data, error } = await ctx.supabase
          .from("workspaces")
          .select("id, name, slug, created_by")
          .eq("slug", args.slug)
          .maybeSingle()

        if (error) throw new GraphQLError(error.message)
        return data
      },
    })
  )

  const IssueCreateInput = builder.inputType("IssueCreateInput", {
    fields: (t) => ({
      workspaceId: t.id({ required: true }),
      teamId: t.id({ required: true }),
      title: t.string({ required: true }),
      description: t.string(),
      priority: t.int({ defaultValue: 0 }),
    }),
  })

  builder.mutationField("issueCreate", (t) =>
    t.field({
      type: IssueRef,
      args: {
        input: t.arg({ type: IssueCreateInput, required: true }),
      },
      resolve: async (_root, args, ctx) => {
        if (!ctx.user) {
          throw new GraphQLError("Unauthorized", {
            extensions: { code: "UNAUTHORIZED" },
          })
        }

        const title = args.input.title.trim()
        if (!title) throw new GraphQLError("Title is required")

        const { data: defaultStatus, error: statusError } = await ctx.supabase
          .from("workflow_states")
          .select("id")
          .eq("team_id", args.input.teamId)
          .eq("is_default", true)
          .maybeSingle()

        if (statusError) throw new GraphQLError(statusError.message)
        if (!defaultStatus) {
          throw new GraphQLError("No default workflow state for this team")
        }

        const { data, error } = await ctx.supabase
          .from("issues")
          .insert({
            workspace_id: args.input.workspaceId,
            team_id: args.input.teamId,
            title,
            description: args.input.description ?? null,
            priority: args.input.priority ?? 0,
            status_id: defaultStatus.id,
            creator_id: ctx.user.id,
            number: 0,
          })
          .select(
            "id, workspace_id, team_id, number, title, description, status_id, priority, assignee_id, creator_id, created_at, updated_at"
          )
          .single()

        if (error) throw new GraphQLError(error.message)
        return data
      },
    })
  )
}
