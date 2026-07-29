import type { Metadata } from "next"
import Link from "next/link"
import { notFound, unstable_rethrow } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { WorkspaceIssuesQuery } from "@/lib/graphql/documents"
import { executeGraphQL } from "@/lib/graphql/execute"

export const metadata: Metadata = { title: "Issues" }

type WorkspaceIssuesData = {
  workspace: {
    id: string
    name: string
    slug: string
    teams: Array<{ id: string; key: string; name: string }>
    issues: Array<{
      id: string
      number: number
      title: string
      priority: number
      identifier: string
      createdAt: string
      status: { id: string; name: string; color: string | null } | null
      team: { id: string; key: string; name: string } | null
    }>
  } | null
}

export default async function IssuesPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  let data: WorkspaceIssuesData | null = null
  let loadError: string | null = null

  try {
    data = await executeGraphQL<WorkspaceIssuesData>(WorkspaceIssuesQuery, {
      slug,
      limit: 100,
    })
  } catch (error) {
    unstable_rethrow(error)
    console.error("Failed to load issues", error)
    loadError = "Could not load issues. Try refreshing the page."
  }

  if (!loadError && !data?.workspace) notFound()

  const issues = data?.workspace?.issues ?? []
  const canCreate = (data?.workspace?.teams.length ?? 0) > 0

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Issues</h1>
          <p className="text-sm text-muted-foreground">
            {loadError
              ? loadError
              : issues.length
                ? `${issues.length} issue${issues.length === 1 ? "" : "s"}`
                : "No issues yet — create your first one."}
          </p>
        </div>
        {canCreate ? (
          <Button asChild size="sm">
            <Link href={`/w/${slug}/issues/new`}>New issue</Link>
          </Button>
        ) : (
          <Button size="sm" disabled>
            New issue
          </Button>
        )}
      </div>
      <Separator />
      {loadError ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center">
          <p className="text-sm font-medium">Something went wrong</p>
          <p className="max-w-sm text-sm text-muted-foreground">{loadError}</p>
        </div>
      ) : !issues.length ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-24 text-center">
          <p className="text-sm font-medium">Your issue list is empty</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {canCreate
              ? "Create an issue with a rich description, mentions, and media."
              : "Create a team first, then come back to file issues."}
          </p>
          {canCreate ? (
            <Button asChild size="sm">
              <Link href={`/w/${slug}/issues/new`}>New issue</Link>
            </Button>
          ) : null}
        </div>
      ) : (
        <ul>
          {issues.map((issue) => (
            <li key={issue.id}>
              <Link
                href={`/w/${slug}/issues/${issue.id}`}
                className="flex items-center gap-3 px-6 py-3 text-sm transition-colors hover:bg-muted/40"
              >
                <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                  {issue.identifier}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {issue.title}
                </span>
                {issue.status ? (
                  <Badge variant="secondary" className="shrink-0">
                    {issue.status.name}
                  </Badge>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
