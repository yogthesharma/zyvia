import { createClient } from "@/lib/supabase/server"
import type { RichMentionable } from "@/lib/rich-editor/types"

export async function listWorkspaceMentionables(
  workspaceId: string
): Promise<RichMentionable[]> {
  const supabase = await createClient()

  const { data: members, error: membersError } = await supabase
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)

  if (membersError || !members?.length) return []

  const userIds = members.map((row) => row.user_id)
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", userIds)
    .order("full_name", { ascending: true })

  if (profilesError || !profiles) return []

  return profiles.map((profile) => ({
    key: profile.id,
    text:
      profile.full_name?.trim() ||
      profile.username?.trim() ||
      "Member",
    avatarUrl: profile.avatar_url,
  }))
}
