import type { ProfileSettings } from "@/lib/profile/types"
import { createClient } from "@/lib/supabase/server"

const PROFILE_SELECT = "id, full_name, avatar_url, username, title" as const

export async function getProfileSettings(
  userId: string,
  email: string
): Promise<ProfileSettings> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_SELECT)
    .eq("id", userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error("Profile not found.")

  return {
    id: data.id,
    email,
    fullName: data.full_name ?? "",
    title: data.title ?? "",
    username: data.username ?? "",
    avatarUrl: data.avatar_url,
  }
}
