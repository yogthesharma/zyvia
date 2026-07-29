import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Issues" }

export default async function IssuesPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("slug", slug)
    .maybeSingle()

  if (!workspace) notFound()

  const { data: issues } = await supabase
    .from("issues")
    .select(
      "id, number, title, priority, created_at, team:teams(key), status:workflow_states(name, color)"
    )
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false })
    .limit(100)

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Issues</h1>
          <p className="text-sm text-muted-foreground">
            {issues?.length
              ? `${issues.length} issue${issues.length === 1 ? "" : "s"}`
              : "No issues yet — create your first one soon."}
          </p>
        </div>
      </div>
      <Separator />
      {!issues?.length ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-24 text-center">
          <p className="text-sm font-medium">Your issue list is empty</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Issue creation lands next. For now the workspace, team, and workflow
            are ready.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {issues.map((issue) => {
            const team = Array.isArray(issue.team) ? issue.team[0] : issue.team
            const status = Array.isArray(issue.status)
              ? issue.status[0]
              : issue.status
            return (
              <li
                key={issue.id}
                className="flex items-center gap-3 px-6 py-3 text-sm"
              >
                <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                  {team?.key}-{issue.number}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {issue.title}
                </span>
                {status ? (
                  <Badge variant="secondary" className="shrink-0">
                    {status.name}
                  </Badge>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
