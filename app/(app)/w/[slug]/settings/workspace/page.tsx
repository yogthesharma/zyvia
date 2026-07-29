import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Workspace" }

export default async function WorkspaceSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name, slug")
    .eq("slug", slug)
    .maybeSingle()

  if (!workspace) notFound()

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-8">
      <h1 className="text-xl font-semibold tracking-tight">Workspace</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        General workspace settings.
      </p>
      <Separator className="my-6" />
      <div className="space-y-4 text-sm">
        <div>
          <p className="text-muted-foreground">Name</p>
          <p className="font-medium">{workspace.name}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Slug</p>
          <p className="font-mono font-medium">{workspace.slug}</p>
        </div>
      </div>
    </div>
  )
}
