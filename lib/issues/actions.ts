"use server"

import { revalidatePath } from "next/cache"

import {
  IssueCreateMutation,
  IssueUpdateMutation,
} from "@/lib/graphql/documents"
import { executeGraphQL } from "@/lib/graphql/execute"
import type { RichDoc } from "@/lib/rich-editor/types"

export type IssueActionResult =
  | { error: string }
  | { id: string; identifier: string }

type CreateIssueInput = {
  workspaceId: string
  workspaceSlug: string
  teamId: string
  title: string
  descriptionDoc?: RichDoc | null
  priority?: number
}

type UpdateIssueInput = {
  id: string
  workspaceSlug: string
  title?: string
  descriptionDoc?: RichDoc | null
  priority?: number
}

export async function createIssueAction(
  input: CreateIssueInput
): Promise<IssueActionResult> {
  try {
    const title = input.title.trim()
    if (!title) return { error: "Title is required." }
    if (!input.teamId) return { error: "Choose a team." }

    const data = await executeGraphQL<{
      issueCreate: { id: string; identifier: string }
    }>(IssueCreateMutation, {
      input: {
        workspaceId: input.workspaceId,
        teamId: input.teamId,
        title,
        descriptionDoc: input.descriptionDoc ?? null,
        priority: input.priority ?? 0,
      },
    })

    revalidatePath(`/w/${input.workspaceSlug}/issues`)
    return {
      id: data.issueCreate.id,
      identifier: data.issueCreate.identifier,
    }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not create issue.",
    }
  }
}

export async function updateIssueAction(
  input: UpdateIssueInput
): Promise<IssueActionResult> {
  try {
    const patch: Record<string, unknown> = { id: input.id }
    if (input.title !== undefined) {
      const title = input.title.trim()
      if (!title) return { error: "Title is required." }
      patch.title = title
    }
    if (input.descriptionDoc !== undefined) {
      patch.descriptionDoc = input.descriptionDoc
    }
    if (input.priority !== undefined) {
      patch.priority = input.priority
    }

    const data = await executeGraphQL<{
      issueUpdate: { id: string; identifier: string }
    }>(IssueUpdateMutation, { input: patch })

    revalidatePath(`/w/${input.workspaceSlug}/issues`)
    revalidatePath(`/w/${input.workspaceSlug}/issues/${input.id}`)
    return {
      id: data.issueUpdate.id,
      identifier: data.issueUpdate.identifier,
    }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update issue.",
    }
  }
}
