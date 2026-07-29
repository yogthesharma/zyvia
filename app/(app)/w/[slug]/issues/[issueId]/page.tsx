import type { Metadata } from "next"
import Link from "next/link"
import { notFound, unstable_rethrow } from "next/navigation"

import { IssueDetailEditor } from "@/components/issues/issue-detail-editor"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { IssueDetailQuery } from "@/lib/graphql/documents"
import { executeGraphQL } from "@/lib/graphql/execute"
import { createClient } from "@/lib/supabase/server"
import { listWorkspaceMentionables } from "@/lib/workspace/mentionables"

type IssueDetailData = {
  issue: {
    id: string
    number: number
    title: string
    description: string | null
    descriptionDoc: unknown
    priority: number
    identifier: string
    createdAt: string
    updatedAt: string
    status: { id: string; name: string; color: string | null } | null
    team: { id: string; key: string; name: string } | null
  } | null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; issueId: string }>
}): Promise<Metadata> {
  const { issueId } = await params
  try {
    const data = await executeGraphQL<IssueDetailData>(IssueDetailQuery, {
      id: issueId,
    })
    if (!data.issue) return { title: "Issue" }
    return { title: `${data.issue.identifier} · ${data.issue.title}` }
  } catch {
    return { title: "Issue" }
  }
}

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ slug: string; issueId: string }>
}) {
  const { slug, issueId } = await params

  let data: IssueDetailData | null = null
  try {
    data = await executeGraphQL<IssueDetailData>(IssueDetailQuery, {
      id: issueId,
    })
  } catch (error) {
    unstable_rethrow(error)
    console.error("Failed to load issue", error)
  }

  if (!data?.issue) notFound()

  const supabase = await createClient()
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle()

  if (!workspace) notFound()

  // Ensure issue belongs to this workspace slug
  const { data: issueWorkspace } = await supabase
    .from("issues")
    .select("workspace_id")
    .eq("id", issueId)
    .maybeSingle()

  if (!issueWorkspace || issueWorkspace.workspace_id !== workspace.id) {
    notFound()
  }

  const mentionables = await listWorkspaceMentionables(workspace.id)
  const issue = data.issue

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {issue.identifier}
          </span>
          {issue.status ? (
            <Badge variant="secondary">{issue.status.name}</Badge>
          ) : null}
          {issue.team ? (
            <span className="truncate text-sm text-muted-foreground">
              {issue.team.name}
            </span>
          ) : null}
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/w/${slug}/issues`}>All issues</Link>
        </Button>
      </div>
      <Separator />
      <div className="mx-auto w-full max-w-3xl px-6 py-6">
        <IssueDetailEditor
          issueId={issue.id}
          workspaceId={workspace.id}
          workspaceSlug={slug}
          initialTitle={issue.title}
          initialDescriptionDoc={issue.descriptionDoc}
          mentionables={mentionables}
        />
      </div>
    </div>
  )
}
