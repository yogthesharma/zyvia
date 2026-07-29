import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage({
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
    <div className="flex flex-1 flex-col">
      <div className="px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Workspace preferences</p>
      </div>
      <Separator />
      <div className="space-y-4 px-6 py-6 text-sm">
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
