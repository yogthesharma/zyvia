import { GraphQLError } from "graphql"

import type { Builder } from "@/lib/graphql/builder"
import { richDocToPlainText } from "@/lib/rich-editor/plain-text"
import { isEmptyRichDoc, parseRichDocInput } from "@/lib/rich-editor/schema"

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
  description?: string | null
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
  description_doc?: unknown | null
  status_id: string
  priority: number
  assignee_id: string | null
  creator_id: string | null
  created_at: string
  updated_at: string
  /** Prefetched relations (avoids N+1 on list queries) */
  team?: TeamRow | null
  status?: WorkflowStateRow | null
}

const ISSUE_SELECT = `
  id, workspace_id, team_id, number, title, description, description_doc, status_id,
  priority, assignee_id, creator_id, created_at, updated_at,
  team:teams(id, workspace_id, name, key, issue_counter),
  status:workflow_states(id, team_id, name, description, category, position, is_default, color)
`

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function mapIssueRow(row: Record<string, unknown>): IssueRow {
  return {
    ...(row as unknown as IssueRow),
    team: asOne(row.team as TeamRow | TeamRow[] | null),
    status: asOne(row.status as WorkflowStateRow | WorkflowStateRow[] | null),
  }
}

function resolveDescriptionFields(input: {
  description?: string | null | undefined
  descriptionDoc?: unknown
}) {
  if (input.descriptionDoc !== undefined && input.descriptionDoc !== null) {
    const doc = parseRichDocInput(input.descriptionDoc)
    const plain =
      isEmptyRichDoc(doc) ? null : richDocToPlainText(doc) || null
    return {
      description: plain,
      description_doc: isEmptyRichDoc(doc) ? null : doc,
    }
  }
  return {
    description: input.description ?? null,
    description_doc: undefined as unknown | undefined,
  }
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
            .select(ISSUE_SELECT)
            .eq("workspace_id", workspace.id)
            .order("created_at", { ascending: false })
            .limit(args.limit ?? 100)

          if (error) throw new GraphQLError(error.message)

          return (data ?? []).map((row) => mapIssueRow(row))
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
      description: t.exposeString("description", { nullable: true }),
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
      descriptionDoc: t.field({
        type: "JSON",
        nullable: true,
        resolve: (issue) => issue.description_doc ?? null,
      }),
      priority: t.exposeInt("priority"),
      createdAt: t.expose("created_at", { type: "DateTime" }),
      updatedAt: t.expose("updated_at", { type: "DateTime" }),
      identifier: t.string({
        resolve: async (issue, _args, ctx) => {
          if (issue.team?.key) return `${issue.team.key}-${issue.number}`
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
          if (issue.team) return issue.team
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
          if (issue.status) return issue.status
          const { data, error } = await ctx.supabase
            .from("workflow_states")
            .select(
              "id, team_id, name, description, category, position, is_default, color"
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

  builder.queryField("issue", (t) =>
    t.field({
      type: IssueRef,
      nullable: true,
      args: {
        id: t.arg.id({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        if (!ctx.user) {
          throw new GraphQLError("Unauthorized", {
            extensions: { code: "UNAUTHORIZED" },
          })
        }

        const { data, error } = await ctx.supabase
          .from("issues")
          .select(ISSUE_SELECT)
          .eq("id", args.id)
          .maybeSingle()

        if (error) throw new GraphQLError(error.message)
        if (!data) return null
        return mapIssueRow(data)
      },
    })
  )

  const IssueCreateInput = builder.inputType("IssueCreateInput", {
    fields: (t) => ({
      workspaceId: t.id({ required: true }),
      teamId: t.id({ required: true }),
      title: t.string({ required: true }),
      description: t.string(),
      descriptionDoc: t.field({ type: "JSON" }),
      priority: t.int({ defaultValue: 0 }),
    }),
  })

  const IssueUpdateInput = builder.inputType("IssueUpdateInput", {
    fields: (t) => ({
      id: t.id({ required: true }),
      title: t.string(),
      description: t.string(),
      descriptionDoc: t.field({ type: "JSON" }),
      priority: t.int(),
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

        const priority = args.input.priority ?? 0
        if (priority < 0 || priority > 4) {
          throw new GraphQLError("Priority must be between 0 and 4")
        }

        const { data: team, error: teamError } = await ctx.supabase
          .from("teams")
          .select("id, workspace_id")
          .eq("id", args.input.teamId)
          .maybeSingle()

        if (teamError) throw new GraphQLError(teamError.message)
        if (!team) throw new GraphQLError("Team not found")
        if (team.workspace_id !== args.input.workspaceId) {
          throw new GraphQLError("Team does not belong to workspace")
        }

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

        const desc = resolveDescriptionFields({
          description: args.input.description,
          descriptionDoc: args.input.descriptionDoc,
        })

        const insertRow: Record<string, unknown> = {
          workspace_id: args.input.workspaceId,
          team_id: args.input.teamId,
          title,
          description: desc.description,
          priority,
          status_id: defaultStatus.id,
          creator_id: ctx.user.id,
          number: 0,
        }
        if (desc.description_doc !== undefined) {
          insertRow.description_doc = desc.description_doc
        }

        const { data, error } = await ctx.supabase
          .from("issues")
          .insert(insertRow)
          .select(ISSUE_SELECT)
          .single()

        if (error) throw new GraphQLError(error.message)

        return mapIssueRow(data)
      },
    })
  )

  builder.mutationField("issueUpdate", (t) =>
    t.field({
      type: IssueRef,
      args: {
        input: t.arg({ type: IssueUpdateInput, required: true }),
      },
      resolve: async (_root, args, ctx) => {
        if (!ctx.user) {
          throw new GraphQLError("Unauthorized", {
            extensions: { code: "UNAUTHORIZED" },
          })
        }

        const patch: Record<string, unknown> = {}

        if (args.input.title !== undefined && args.input.title !== null) {
          const title = args.input.title.trim()
          if (!title) throw new GraphQLError("Title is required")
          patch.title = title
        }

        if (args.input.priority !== undefined && args.input.priority !== null) {
          if (args.input.priority < 0 || args.input.priority > 4) {
            throw new GraphQLError("Priority must be between 0 and 4")
          }
          patch.priority = args.input.priority
        }

        if (
          args.input.descriptionDoc !== undefined ||
          args.input.description !== undefined
        ) {
          const desc = resolveDescriptionFields({
            description: args.input.description,
            descriptionDoc: args.input.descriptionDoc,
          })
          patch.description = desc.description
          if (desc.description_doc !== undefined) {
            patch.description_doc = desc.description_doc
          }
        }

        if (Object.keys(patch).length === 0) {
          throw new GraphQLError("No fields to update")
        }

        const { data, error } = await ctx.supabase
          .from("issues")
          .update(patch)
          .eq("id", args.input.id)
          .select(ISSUE_SELECT)
          .single()

        if (error) throw new GraphQLError(error.message)

        return mapIssueRow(data)
      },
    })
  )
}
