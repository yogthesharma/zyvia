import { GraphQLError } from "graphql"

import { builder } from "@/lib/graphql/builder"
import { IssueRef } from "@/lib/graphql/schema/workspace"

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
