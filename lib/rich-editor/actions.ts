"use server"

import { createClient } from "@/lib/supabase/server"
import type { UploadEditorMediaResult } from "@/lib/rich-editor/types"

const MEDIA_BUCKET = "editor-media"
const MAX_BYTES = 50 * 1024 * 1024
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "audio/mpeg",
  "audio/wav",
  "audio/mp4",
  "audio/webm",
  "audio/aac",
  "application/pdf",
])

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120) || "file"
}

export async function uploadEditorMedia(
  workspaceId: string,
  formData: FormData
): Promise<UploadEditorMediaResult> {
  try {
    if (!UUID_RE.test(workspaceId)) {
      return { error: "Workspace not found." }
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return { error: "You must be signed in." }
    }

    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle()

    if (membershipError) return { error: membershipError.message }
    if (!membership) {
      return { error: "You are not a member of this workspace." }
    }

    const file = formData.get("file")
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Choose a file to upload." }
    }
    if (file.size > MAX_BYTES) {
      return { error: "File must be 50MB or smaller." }
    }

    const mime = file.type || "application/octet-stream"
    if (!ALLOWED_MIME.has(mime)) {
      return {
        error:
          "Unsupported file type. Use image, video, audio, or PDF uploads.",
      }
    }

    const id = crypto.randomUUID()
    const safeName = sanitizeFileName(file.name)
    const path = `${workspaceId}/${user.id}/${id}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, file, {
        upsert: false,
        contentType: mime,
        cacheControl: "3600",
      })

    if (uploadError) return { error: uploadError.message }

    const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)

    return {
      key: path,
      name: file.name,
      size: file.size,
      type: mime,
      url: data.publicUrl,
    }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Could not upload media.",
    }
  }
}
