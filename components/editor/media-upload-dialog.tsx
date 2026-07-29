"use client"

import * as React from "react"
import { PlaceholderPlugin } from "@platejs/media/react"
import {
  AudioLinesIcon,
  FileUpIcon,
  FilmIcon,
  ImageIcon,
  UploadIcon,
} from "lucide-react"
import { KEYS } from "platejs"
import {
  createPlatePlugin,
  useEditorRef,
  usePluginOption,
  type PlateEditor,
} from "platejs/react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type MediaUploadType =
  | typeof KEYS.img
  | typeof KEYS.video
  | typeof KEYS.audio
  | typeof KEYS.file

const MEDIA_OPTIONS: {
  accept: string
  description: string
  icon: React.ReactNode
  label: string
  value: MediaUploadType
}[] = [
  {
    accept: "image/*",
    description: "PNG, JPG, GIF, WebP",
    icon: <ImageIcon className="size-4" />,
    label: "Image",
    value: KEYS.img,
  },
  {
    accept: "video/*",
    description: "MP4, WebM, MOV",
    icon: <FilmIcon className="size-4" />,
    label: "Video",
    value: KEYS.video,
  },
  {
    accept: "audio/*",
    description: "MP3, WAV, AAC",
    icon: <AudioLinesIcon className="size-4" />,
    label: "Audio",
    value: KEYS.audio,
  },
  {
    accept: "*/*",
    description: "PDF, ZIP, docs, and more",
    icon: <FileUpIcon className="size-4" />,
    label: "File",
    value: KEYS.file,
  },
]

export const MediaUploadDialogPlugin = createPlatePlugin({
  key: "mediaUploadDialog",
  options: {
    mediaType: KEYS.img as MediaUploadType,
    open: false,
  },
  render: {
    afterEditable: MediaUploadDialog,
  },
})

export const MediaUploadDialogKit = [MediaUploadDialogPlugin]

export function openMediaUploadDialog(
  editor: PlateEditor,
  mediaType: MediaUploadType = KEYS.img
) {
  editor.setOption(MediaUploadDialogPlugin, "mediaType", mediaType)
  editor.setOption(MediaUploadDialogPlugin, "open", true)
}

function MediaUploadDialog() {
  const editor = useEditorRef()
  const open = usePluginOption(MediaUploadDialogPlugin, "open")
  const mediaType = usePluginOption(MediaUploadDialogPlugin, "mediaType")
  const [dragging, setDragging] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const current =
    MEDIA_OPTIONS.find((option) => option.value === mediaType) ??
    MEDIA_OPTIONS[0]

  const close = React.useCallback(() => {
    editor.setOption(MediaUploadDialogPlugin, "open", false)
  }, [editor])

  const insertFiles = React.useCallback(
    (files: FileList | File[]) => {
      const list = Array.from(files)
      if (list.length === 0) return

      const accepted = list.filter((file) => matchesAccept(file, current.accept))
      if (accepted.length === 0) {
        toast.error(`Please choose a valid ${current.label.toLowerCase()} file.`)
        return
      }

      const transfer = new DataTransfer()
      accepted.forEach((file) => transfer.items.add(file))
      editor.getTransforms(PlaceholderPlugin).insert.media(transfer.files)
      close()
    },
    [close, current, editor]
  )

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
    >
      <DialogContent className="gap-5 sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>Upload asset</DialogTitle>
          <DialogDescription>
            Pick a type, then drop files or browse from your computer.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MEDIA_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg px-3 py-2.5 text-left transition-colors",
                option.value === mediaType
                  ? "bg-muted"
                  : "bg-muted/20 hover:bg-muted/50"
              )}
              onClick={() =>
                editor.setOption(
                  MediaUploadDialogPlugin,
                  "mediaType",
                  option.value
                )
              }
            >
              <span className="text-muted-foreground">{option.icon}</span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>

        <div
          className={cn(
            "flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl px-6 py-8 text-center transition-colors",
            dragging ? "bg-muted/60" : "bg-muted/20 hover:bg-muted/35"
          )}
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={(event) => {
            event.preventDefault()
            setDragging(false)
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            if (event.dataTransfer.files.length > 0) {
              insertFiles(event.dataTransfer.files)
            }
          }}
        >
          <div className="rounded-full bg-muted p-3 text-muted-foreground">
            <UploadIcon className="size-5" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">
              Drop {current.label.toLowerCase()} here
            </p>
            <p className="text-xs text-muted-foreground">
              {current.description}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              inputRef.current?.click()
            }}
          >
            Browse files
          </Button>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={current.accept}
            multiple
            onChange={(event) => {
              if (event.target.files?.length) {
                insertFiles(event.target.files)
                event.target.value = ""
              }
            }}
          />
        </div>

        <DialogFooter className="sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Uploads use local mock URLs in this playground.
          </p>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function matchesAccept(file: File, accept: string) {
  if (accept === "*/*" || accept === "*") return true
  return accept.split(",").some((token) => {
    const value = token.trim()
    if (!value) return false
    if (value.endsWith("/*")) {
      return file.type.startsWith(value.slice(0, -1))
    }
    if (value.startsWith(".")) {
      return file.name.toLowerCase().endsWith(value.toLowerCase())
    }
    return file.type === value
  })
}
