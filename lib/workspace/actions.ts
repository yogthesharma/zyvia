"use server"

import { isValidWorkspaceSlug } from "@/lib/profile/schema"
import { createClient } from "@/lib/supabase/server"
import {
  normalizeWorkspaceName,
  parseWorkspaceUpdate,
} from "@/lib/workspace/schema"
import { getWorkspaceSettings } from "@/lib/workspace/queries"
import type {
  WorkspaceActionResult,
  WorkspaceSettingsUpdate,
} from "@/lib/workspace/types"

const LOGO_BUCKET = "workspace-logos"
const MAX_LOGO_BYTES = 2 * 1024 * 1024
const ALLOWED_LOGO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
])

async function requireAuthedUser(): Promise<
  | { error: string; user?: undefined }
  | { error?: undefined; user: { id: string } }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) return { error: "You must be signed in." }
  return { user: { id: user.id } }
}

async function requireWorkspaceEditor(slug: string, userId: string) {
  const workspace = await getWorkspaceSettings(slug, userId)
  if (!workspace) return { error: "Workspace not found." } as const
  if (!workspace.canEdit) {
    return {
      error: "Only workspace owners and admins can change these settings.",
    } as const
  }
  return { workspace } as const
}

async function clearLogoFolder(workspaceId: string, keepPath?: string) {
  const supabase = await createClient()
  const { data: listed } = await supabase.storage
    .from(LOGO_BUCKET)
    .list(workspaceId)
  const toRemove = (listed ?? [])
    .map((item) => `${workspaceId}/${item.name}`)
    .filter((path) => path !== keepPath)

  if (toRemove.length) {
    await supabase.storage.from(LOGO_BUCKET).remove(toRemove)
  }
}

export async function updateWorkspaceSettings(
  slug: string,
  input: WorkspaceSettingsUpdate
): Promise<WorkspaceActionResult> {
  try {
    const auth = await requireAuthedUser()
    if (auth.error || !auth.user) return { error: auth.error }

    const access = await requireWorkspaceEditor(slug, auth.user.id)
    if ("error" in access) return { error: access.error }

    const parsed = parseWorkspaceUpdate(input)
    if (parsed.error || !parsed.data) {
      return { error: parsed.error ?? "Invalid workspace." }
    }

    const patch: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) patch.name = parsed.data.name
    if (parsed.data.slug !== undefined) patch.slug = parsed.data.slug
    if (parsed.data.fiscalYearStartMonth !== undefined) {
      patch.fiscal_year_start_month = parsed.data.fiscalYearStartMonth
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from("workspaces")
      .update(patch)
      .eq("id", access.workspace.id)

    if (error) {
      if (error.code === "23505") {
        return { error: "That workspace URL is already taken." }
      }
      if (error.code === "23514") {
        return { error: "That workspace URL format is invalid." }
      }
      return { error: error.message }
    }

    const nextSlug = parsed.data.slug ?? access.workspace.slug
    const workspace = await getWorkspaceSettings(nextSlug, auth.user.id)
    if (!workspace) return { error: "Workspace not found after save." }

    const result: WorkspaceActionResult = { workspace }
    if (parsed.data.slug && parsed.data.slug !== slug) {
      result.redirectTo = `/w/${parsed.data.slug}/settings/workspace`
    }
    return result
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not update workspace settings.",
    }
  }
}

export async function uploadWorkspaceLogo(
  slug: string,
  formData: FormData
): Promise<WorkspaceActionResult> {
  try {
    const auth = await requireAuthedUser()
    if (auth.error || !auth.user) return { error: auth.error }

    const access = await requireWorkspaceEditor(slug, auth.user.id)
    if ("error" in access) return { error: access.error }

    const file = formData.get("logo")
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Choose an image to upload." }
    }
    if (file.size > MAX_LOGO_BYTES) {
      return { error: "Logo must be 2MB or smaller." }
    }
    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
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

    const path = `${access.workspace.id}/logo.${ext}`
    const supabase = await createClient()

    await clearLogoFolder(access.workspace.id, path)

    const { error: uploadError } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      })

    if (uploadError) return { error: uploadError.message }

    const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path)
    const logoUrl = `${data.publicUrl}?v=${Date.now()}`

    const { error } = await supabase
      .from("workspaces")
      .update({ logo_url: logoUrl })
      .eq("id", access.workspace.id)

    if (error) return { error: error.message }

    const workspace = await getWorkspaceSettings(slug, auth.user.id)
    if (!workspace) return { error: "Workspace not found after upload." }
    return { workspace }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not upload logo.",
    }
  }
}

export async function removeWorkspaceLogo(
  slug: string
): Promise<WorkspaceActionResult> {
  try {
    const auth = await requireAuthedUser()
    if (auth.error || !auth.user) return { error: auth.error }

    const access = await requireWorkspaceEditor(slug, auth.user.id)
    if ("error" in access) return { error: access.error }

    const supabase = await createClient()
    await clearLogoFolder(access.workspace.id)

    const { error } = await supabase
      .from("workspaces")
      .update({ logo_url: null })
      .eq("id", access.workspace.id)

    if (error) return { error: error.message }

    const workspace = await getWorkspaceSettings(slug, auth.user.id)
    if (!workspace) return { error: "Workspace not found after remove." }
    return { workspace }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not remove logo.",
    }
  }
}

export async function scheduleWorkspaceDeletion(
  slug: string,
  confirmName: string
): Promise<WorkspaceActionResult> {
  try {
    const auth = await requireAuthedUser()
    if (auth.error || !auth.user) return { error: auth.error }

    if (!isValidWorkspaceSlug(slug)) return { error: "Invalid workspace." }

    const workspace = await getWorkspaceSettings(slug, auth.user.id)
    if (!workspace) return { error: "Workspace not found." }
    if (!workspace.canDelete) {
      return { error: "Only the workspace owner can delete this workspace." }
    }

    const confirmed = normalizeWorkspaceName(confirmName)
    if (confirmed !== workspace.name) {
      return { error: "Type the workspace name exactly to confirm deletion." }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from("workspaces")
      .update({ deletion_scheduled_at: new Date().toISOString() })
      .eq("id", workspace.id)

    if (error) return { error: error.message }

    const next = await getWorkspaceSettings(slug, auth.user.id)
    if (!next) return { error: "Workspace not found after scheduling." }
    return { workspace: next }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not schedule workspace deletion.",
    }
  }
}

export async function cancelWorkspaceDeletion(
  slug: string
): Promise<WorkspaceActionResult> {
  try {
    const auth = await requireAuthedUser()
    if (auth.error || !auth.user) return { error: auth.error }

    const workspace = await getWorkspaceSettings(slug, auth.user.id)
    if (!workspace) return { error: "Workspace not found." }
    if (!workspace.canDelete) {
      return { error: "Only the workspace owner can manage deletion." }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from("workspaces")
      .update({ deletion_scheduled_at: null })
      .eq("id", workspace.id)

    if (error) return { error: error.message }

    const next = await getWorkspaceSettings(slug, auth.user.id)
    if (!next) return { error: "Workspace not found after cancel." }
    return { workspace: next }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not cancel workspace deletion.",
    }
  }
}

export async function permanentlyDeleteWorkspace(
  slug: string,
  confirmName: string
): Promise<WorkspaceActionResult> {
  try {
    const auth = await requireAuthedUser()
    if (auth.error || !auth.user) return { error: auth.error }

    if (!isValidWorkspaceSlug(slug)) return { error: "Invalid workspace." }

    const workspace = await getWorkspaceSettings(slug, auth.user.id)
    if (!workspace) return { error: "Workspace not found." }
    if (!workspace.canDelete) {
      return { error: "Only the workspace owner can delete this workspace." }
    }

    const confirmed = normalizeWorkspaceName(confirmName)
    if (confirmed !== workspace.name) {
      return { error: "Type the workspace name exactly to confirm deletion." }
    }

    const supabase = await createClient()
    await clearLogoFolder(workspace.id)

    const { error } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", workspace.id)

    if (error) return { error: error.message }

    // Prefer another membership; otherwise restart onboarding.
    const { data: nextMembership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()

    if (!nextMembership) {
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
      return { redirectTo: "/onboarding/workspace" }
    }

    return { redirectTo: `/w/${nextWorkspace.slug}/issues` }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not delete workspace.",
    }
  }
}

