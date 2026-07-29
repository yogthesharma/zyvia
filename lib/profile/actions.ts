"use server"

import {
  isValidWorkspaceSlug,
  parseEmailChange,
  parseProfileUpdate,
} from "@/lib/profile/schema"
import type {
  ProfileActionResult,
  ProfileSettings,
  ProfileSettingsUpdate,
} from "@/lib/profile/types"
import { getProfileSettings } from "@/lib/profile/queries"
import { createClient } from "@/lib/supabase/server"
import { getWorkspaceHomePath } from "@/lib/preferences/queries"

const AVATAR_BUCKET = "avatars"
const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

async function requireAuthedProfile(): Promise<
  | { error: string; user?: undefined; email?: undefined }
  | { error?: undefined; user: { id: string }; email: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return { error: "You must be signed in." }
  }

  return { user: { id: user.id }, email: user.email ?? "" }
}

async function loadSettings(
  userId: string,
  email: string
): Promise<ProfileSettings> {
  return getProfileSettings(userId, email)
}

export async function updateProfileSettings(
  input: ProfileSettingsUpdate
): Promise<ProfileActionResult> {
  try {
    const auth = await requireAuthedProfile()
    if (auth.error || !auth.user) return { error: auth.error }

    const parsed = parseProfileUpdate(input)
    if (parsed.error || !parsed.data) {
      return { error: parsed.error ?? "Invalid profile." }
    }

    const supabase = await createClient()
    const patch: Record<string, unknown> = {}
    if (parsed.data.fullName !== undefined) {
      patch.full_name = parsed.data.fullName
    }
    if (parsed.data.title !== undefined) {
      patch.title = parsed.data.title || null
    }
    if (parsed.data.username !== undefined) {
      patch.username = parsed.data.username
    }

    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", auth.user.id)

    if (error) {
      if (error.code === "23505") {
        return { error: "That username is already taken." }
      }
      if (error.code === "23514") {
        return { error: "That username format is invalid." }
      }
      return { error: error.message }
    }

    return { profile: await loadSettings(auth.user.id, auth.email) }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not update profile.",
    }
  }
}

async function clearAvatarFolder(userId: string, keepPath?: string) {
  const supabase = await createClient()
  const { data: listed } = await supabase.storage.from(AVATAR_BUCKET).list(userId)
  const toRemove = (listed ?? [])
    .map((item) => `${userId}/${item.name}`)
    .filter((path) => path !== keepPath)

  if (toRemove.length) {
    await supabase.storage.from(AVATAR_BUCKET).remove(toRemove)
  }
}

export async function uploadAvatar(
  formData: FormData
): Promise<ProfileActionResult> {
  try {
    const auth = await requireAuthedProfile()
    if (auth.error || !auth.user) return { error: auth.error }

    const file = formData.get("avatar")
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Choose an image to upload." }
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return { error: "Avatar must be 2MB or smaller." }
    }
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      return { error: "Use a JPEG, PNG, WebP, or GIF image." }
    }

    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : file.type === "image/gif"
            ? "gif"
            : "jpg"

    const path = `${auth.user.id}/avatar.${ext}`
    const supabase = await createClient()

    // Remove other format leftovers so only one avatar object remains.
    await clearAvatarFolder(auth.user.id, path)

    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      })

    if (uploadError) return { error: uploadError.message }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
    const avatarUrl = `${data.publicUrl}?v=${Date.now()}`

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", auth.user.id)

    if (error) return { error: error.message }

    return { profile: await loadSettings(auth.user.id, auth.email) }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not upload avatar.",
    }
  }
}

export async function removeAvatar(): Promise<ProfileActionResult> {
  try {
    const auth = await requireAuthedProfile()
    if (auth.error || !auth.user) return { error: auth.error }

    const supabase = await createClient()
    await clearAvatarFolder(auth.user.id)

    const { error } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", auth.user.id)

    if (error) return { error: error.message }

    return { profile: await loadSettings(auth.user.id, auth.email) }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not remove avatar.",
    }
  }
}

export async function checkEmailAvailability(
  emailInput: string
): Promise<ProfileActionResult> {
  try {
    const auth = await requireAuthedProfile()
    if (auth.error || !auth.user) return { error: auth.error }

    const parsed = parseEmailChange(emailInput)
    if (parsed.error || !parsed.email) return { error: parsed.error }

    if (!auth.email) {
      return { error: "Your account has no email on file." }
    }

    if (parsed.email === auth.email.toLowerCase()) {
      return { error: "That’s already your current email.", available: false }
    }

    const supabase = await createClient()
    const { data: taken, error } = await supabase.rpc("auth_email_taken", {
      p_email: parsed.email,
    })

    if (error) return { error: error.message, available: false }

    if (taken === true) {
      return {
        error: "An account already exists with that email address.",
        available: false,
      }
    }

    return { available: true }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not check that email address.",
      available: false,
    }
  }
}

export async function requestEmailChange(
  emailInput: string
): Promise<ProfileActionResult> {
  try {
    const check = await checkEmailAvailability(emailInput)
    if (check.error || !check.available) {
      return {
        error: check.error ?? "That email is not available.",
        available: false,
      }
    }

    const parsed = parseEmailChange(emailInput)
    if (parsed.error || !parsed.email) return { error: parsed.error }

    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({ email: parsed.email })
    if (error) {
      const message = error.message.toLowerCase()
      if (
        message.includes("already") ||
        message.includes("exists") ||
        message.includes("registered")
      ) {
        return {
          error: "An account already exists with that email address.",
          available: false,
        }
      }
      return { error: error.message }
    }

    return { available: true }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not start the email change.",
    }
  }
}

export async function leaveWorkspace(slug: string): Promise<ProfileActionResult> {
  try {
    const auth = await requireAuthedProfile()
    if (auth.error || !auth.user) return { error: auth.error }

    if (!isValidWorkspaceSlug(slug)) {
      return { error: "Invalid workspace." }
    }

    const supabase = await createClient()
    const { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle()

    if (workspaceError) return { error: workspaceError.message }
    if (!workspace) return { error: "Workspace not found." }

    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspace.id)
      .eq("user_id", auth.user.id)
      .maybeSingle()

    if (membershipError) return { error: membershipError.message }
    if (!membership) return { error: "You are not a member of this workspace." }

    if (membership.role === "owner") {
      const { count, error: ownerCountError } = await supabase
        .from("workspace_members")
        .select("*", { count: "exact", head: true })
        .eq("workspace_id", workspace.id)
        .eq("role", "owner")

      if (ownerCountError) return { error: ownerCountError.message }
      if ((count ?? 0) <= 1) {
        return {
          error:
            "You’re the only owner. Transfer ownership before leaving this workspace.",
        }
      }
    }

    const { error: deleteError } = await supabase
      .from("workspace_members")
      .delete()
      .eq("workspace_id", workspace.id)
      .eq("user_id", auth.user.id)

    if (deleteError) return { error: deleteError.message }

    const { data: nextMembership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!nextMembership) {
      // Re-enter onboarding so creating a workspace works with existing guards.
      const { error: resetError } = await supabase
        .from("profiles")
        .update({
          onboarding_step: "workspace",
          onboarding_completed_at: null,
        })
        .eq("id", auth.user.id)

      if (resetError) return { error: resetError.message }
      return { redirectTo: "/onboarding/workspace" }
    }

    const { data: nextWorkspace } = await supabase
      .from("workspaces")
      .select("slug")
      .eq("id", nextMembership.workspace_id)
      .maybeSingle()

    if (!nextWorkspace?.slug) {
      const { error: resetError } = await supabase
        .from("profiles")
        .update({
          onboarding_step: "workspace",
          onboarding_completed_at: null,
        })
        .eq("id", auth.user.id)

      if (resetError) return { error: resetError.message }
      return { redirectTo: "/onboarding/workspace" }
    }

    return {
      redirectTo: await getWorkspaceHomePath(auth.user.id, nextWorkspace.slug),
    }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not leave workspace.",
    }
  }
}
