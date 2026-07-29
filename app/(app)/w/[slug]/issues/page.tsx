import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { WorkspaceIssuesQuery } from "@/lib/graphql/documents"
import { executeGraphQL } from "@/lib/graphql/execute"

export const metadata: Metadata = { title: "Issues" }

type WorkspaceIssuesData = {
  workspace: {
    id: string
    name: string
    slug: string
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

  const data = await executeGraphQL<WorkspaceIssuesData>(WorkspaceIssuesQuery, {
    slug,
    limit: 100,
  })

  const workspace = data.workspace
  if (!workspace) notFound()

  const issues = workspace.issues

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Issues</h1>
          <p className="text-sm text-muted-foreground">
            {issues.length
              ? `${issues.length} issue${issues.length === 1 ? "" : "s"}`
              : "No issues yet — create your first one soon."}
          </p>
        </div>
      </div>
      <Separator />
      {!issues.length ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center">
          <p className="text-sm font-medium">Your issue list is empty</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Data loads over GraphQL. Issue create UI is next — try{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              /api/graphql
            </code>{" "}
            in GraphiQL.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {issues.map((issue) => (
            <li
              key={issue.id}
              className="flex items-center gap-3 px-6 py-3 text-sm"
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
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
