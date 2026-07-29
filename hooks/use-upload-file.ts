import * as React from "react"

import type { OurFileRouter } from "@/lib/uploadthing"
import type {
  ClientUploadedFileData,
  UploadFilesOptions,
} from "uploadthing/types"

import { generateReactHelpers } from "@uploadthing/react"
import { toast } from "sonner"
import { z } from "zod"

import { useEditorWorkspaceId } from "@/components/rich-editor/editor-context"
import { uploadEditorMedia } from "@/lib/rich-editor/actions"

export type UploadedFile<T = unknown> = ClientUploadedFileData<T>

interface UseUploadFileProps
  extends Pick<
    UploadFilesOptions<OurFileRouter["editorUploader"]>,
    "headers" | "onUploadBegin" | "onUploadProgress" | "skipPolling"
  > {
  onUploadComplete?: (file: UploadedFile) => void
  onUploadError?: (error: unknown) => void
}

export function useUploadFile({
  onUploadComplete,
  onUploadError,
  ...props
}: UseUploadFileProps = {}) {
  const workspaceId = useEditorWorkspaceId()
  const [uploadedFile, setUploadedFile] = React.useState<UploadedFile>()
  const [uploadingFile, setUploadingFile] = React.useState<File>()
  const [progress, setProgress] = React.useState<number>(0)
  const [isUploading, setIsUploading] = React.useState(false)

  async function uploadViaSupabase(file: File, id: string) {
    const formData = new FormData()
    formData.set("file", file)
    const result = await uploadEditorMedia(id, formData)
    if ("error" in result) {
      throw new Error(result.error)
    }
    return {
      key: result.key,
      appUrl: result.url,
      name: result.name,
      size: result.size,
      type: result.type,
      url: result.url,
    } as UploadedFile
  }

  async function uploadThing(file: File) {
    setIsUploading(true)
    setUploadingFile(file)
    setProgress(8)

    try {
      if (workspaceId) {
        const uploaded = await uploadViaSupabase(file, workspaceId)
        setProgress(100)
        setUploadedFile(uploaded)
        onUploadComplete?.(uploaded)
        return uploaded
      }

      const res = await uploadFiles("editorUploader", {
        ...props,
        files: [file],
        onUploadProgress: ({ progress: next }) => {
          setProgress(Math.min(next, 100))
        },
      })

      setUploadedFile(res[0])
      onUploadComplete?.(res[0])
      return res[0]
    } catch (error) {
      const errorMessage = getErrorMessage(error)
      const message =
        errorMessage.length > 0
          ? errorMessage
          : "Something went wrong, please try again later."

      if (workspaceId) {
        toast.error(message)
        onUploadError?.(error)
        throw error
      }

      toast.error(message)
      onUploadError?.(error)

      // Playground fallback: mock blob URL when UploadThing is unavailable.
      const mockUploadedFile = {
        key: "mock-key-0",
        appUrl: `https://mock-app-url.com/${file.name}`,
        name: file.name,
        size: file.size,
        type: file.type,
        url: URL.createObjectURL(file),
      } as UploadedFile

      let mockProgress = 0
      while (mockProgress < 100) {
        await new Promise((resolve) => setTimeout(resolve, 50))
        mockProgress += 2
        setProgress(Math.min(mockProgress, 100))
      }

      setUploadedFile(mockUploadedFile)
      return mockUploadedFile
    } finally {
      setProgress(0)
      setIsUploading(false)
      setUploadingFile(undefined)
    }
  }

  return {
    isUploading,
    progress,
    uploadedFile,
    uploadFile: uploadThing,
    uploadingFile,
  }
}

export const { uploadFiles, useUploadThing } =
  generateReactHelpers<OurFileRouter>()

export function getErrorMessage(err: unknown) {
  const unknownError = "Something went wrong, please try again later."

  if (err instanceof z.ZodError) {
    return err.issues.map((issue) => issue.message).join("\n")
  }
  if (err instanceof Error) {
    return err.message
  }
  return unknownError
}

export function showErrorToast(err: unknown) {
  return toast.error(getErrorMessage(err))
}
