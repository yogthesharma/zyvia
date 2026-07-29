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
  WorkspaceSettings,
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

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
}

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
  if (workspace.deletionScheduledAt) {
    return {
      error:
        "This workspace is scheduled for deletion. Cancel deletion before editing.",
    } as const
  }
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

function logoTypeFromFile(file: File): { mime?: string; ext?: string; error?: string } {
  let mime = file.type
  if (!mime || mime === "application/octet-stream") {
    const match = /\.([a-z0-9]+)$/i.exec(file.name)
    const ext = match?.[1]?.toLowerCase()
    if (ext && EXT_TO_MIME[ext]) {
      mime = EXT_TO_MIME[ext]
    }
  }

  if (!mime || !ALLOWED_LOGO_TYPES.has(mime)) {
    return { error: "Use a JPEG, PNG, WebP, or GIF image." }
  }

  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/webp"
        ? "webp"
        : mime === "image/gif"
          ? "gif"
          : "jpg"

  return { mime, ext }
}

export async function updateWorkspaceSettings(
  slug: string,
  input: WorkspaceSettingsUpdate
): Promise<WorkspaceActionResult> {
  try {
    if (!isValidWorkspaceSlug(slug)) return { error: "Invalid workspace." }

    const auth = await requireAuthedUser()
    if (auth.error || !auth.user) return { error: auth.error }

    const access = await requireWorkspaceEditor(slug, auth.user.id)
    if ("error" in access) return { error: access.error }

    const parsed = parseWorkspaceUpdate(input)
    if (parsed.error || !parsed.data) {
      return { error: parsed.error ?? "Invalid workspace." }
    }

    const patch: Record<string, unknown> = {}
    if (parsed.data.name !== undefined) {
      if (parsed.data.name === access.workspace.name) {
        // no-op for this field
      } else {
        patch.name = parsed.data.name
      }
    }
    if (parsed.data.slug !== undefined) {
      if (parsed.data.slug !== access.workspace.slug) {
        patch.slug = parsed.data.slug
      }
    }
    if (parsed.data.fiscalYearStartMonth !== undefined) {
      if (
        parsed.data.fiscalYearStartMonth !==
        access.workspace.fiscalYearStartMonth
      ) {
        patch.fiscal_year_start_month = parsed.data.fiscalYearStartMonth
      }
    }

    if (Object.keys(patch).length === 0) {
      return { workspace: access.workspace }
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

    const nextSlug =
      typeof patch.slug === "string" ? patch.slug : access.workspace.slug
    const workspace = await getWorkspaceSettings(nextSlug, auth.user.id)
    if (!workspace) return { error: "Workspace not found after save." }

    const result: WorkspaceActionResult = { workspace }
    if (typeof patch.slug === "string" && patch.slug !== slug) {
      result.redirectTo = `/w/${patch.slug}/settings/workspace`
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
    if (!isValidWorkspaceSlug(slug)) return { error: "Invalid workspace." }

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

    const typed = logoTypeFromFile(file)
    if (typed.error || !typed.mime || !typed.ext) {
      return { error: typed.error ?? "Use a JPEG, PNG, WebP, or GIF image." }
    }

    const path = `${access.workspace.id}/logo.${typed.ext}`
    const supabase = await createClient()

    await clearLogoFolder(access.workspace.id, path)

    const { error: uploadError } = await supabase.storage
      .from(LOGO_BUCKET)
      .upload(path, file, {
        upsert: true,
        contentType: typed.mime,
        cacheControl: "3600",
      })

    if (uploadError) return { error: uploadError.message }

    const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path)
    const logoUrl = `${data.publicUrl}?v=${Date.now()}`

    const { error } = await supabase
      .from("workspaces")
      .update({ logo_url: logoUrl })
      .eq("id", access.workspace.id)

    if (error) {
      // Best-effort cleanup so a failed DB write doesn't leave orphans.
      await supabase.storage.from(LOGO_BUCKET).remove([path])
      return { error: error.message }
    }

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
    if (!isValidWorkspaceSlug(slug)) return { error: "Invalid workspace." }

    const auth = await requireAuthedUser()
    if (auth.error || !auth.user) return { error: auth.error }

    const access = await requireWorkspaceEditor(slug, auth.user.id)
    if ("error" in access) return { error: access.error }

    if (!access.workspace.logoUrl) {
      return { workspace: access.workspace }
    }

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

    if (workspace.deletionScheduledAt) {
      return { workspace }
    }

    const confirmed = normalizeWorkspaceName(confirmName)
    if (!confirmed || confirmed !== workspace.name) {
      return { error: "Type the workspace name exactly to confirm deletion." }
    }

    const supabase = await createClient()
    const scheduledAt = new Date().toISOString()
    const { error } = await supabase
      .from("workspaces")
      .update({ deletion_scheduled_at: scheduledAt })
      .eq("id", workspace.id)

    if (error) return { error: error.message }

    const next: WorkspaceSettings = {
      ...workspace,
      deletionScheduledAt: scheduledAt,
      canEdit: false,
    }
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

    if (!isValidWorkspaceSlug(slug)) return { error: "Invalid workspace." }

    const workspace = await getWorkspaceSettings(slug, auth.user.id)
    if (!workspace) return { error: "Workspace not found." }
    if (!workspace.canDelete) {
      return { error: "Only the workspace owner can manage deletion." }
    }

    if (!workspace.deletionScheduledAt) {
      return { workspace }
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
    if (!confirmed || confirmed !== workspace.name) {
      return { error: "Type the workspace name exactly to confirm deletion." }
    }

    const supabase = await createClient()
    await clearLogoFolder(workspace.id)

    const { error } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", workspace.id)

    if (error) return { error: error.message }

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
