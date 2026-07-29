import type { Metadata } from "next"
import Link from "next/link"
import { notFound, unstable_rethrow } from "next/navigation"

import { CreateIssueForm } from "@/components/issues/create-issue-form"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { WorkspaceIssuesQuery } from "@/lib/graphql/documents"
import { executeGraphQL } from "@/lib/graphql/execute"
import { listWorkspaceMentionables } from "@/lib/workspace/mentionables"

export const metadata: Metadata = { title: "New issue" }

type WorkspaceData = {
  workspace: {
    id: string
    name: string
    slug: string
    teams: Array<{ id: string; key: string; name: string }>
  } | null
}

export default async function NewIssuePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let data: WorkspaceData | null = null
  try {
    data = await executeGraphQL<WorkspaceData>(WorkspaceIssuesQuery, {
      slug,
      limit: 1,
    })
  } catch (error) {
    unstable_rethrow(error)
    console.error("Failed to load workspace for new issue", error)
  }

  if (!data?.workspace) notFound()

  const mentionables = await listWorkspaceMentionables(data.workspace.id)

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">New issue</h1>
          <p className="text-sm text-muted-foreground">
            Rich description with slash commands, mentions, and media.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/w/${slug}/issues`}>Back</Link>
        </Button>
      </div>
      <Separator />
      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        <CreateIssueForm
          workspaceId={data.workspace.id}
          workspaceSlug={data.workspace.slug}
          teams={data.workspace.teams}
          mentionables={mentionables}
        />
      </div>
    </div>
  )
}
