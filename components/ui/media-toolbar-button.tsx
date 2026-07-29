"use client"

import * as React from "react"

import type { DropdownMenuProps } from "@radix-ui/react-dropdown-menu"

import {
  AudioLinesIcon,
  FileUpIcon,
  FilmIcon,
  ImageIcon,
  UploadIcon,
} from "lucide-react"
import { KEYS } from "platejs"
import { useEditorRef } from "platejs/react"

import {
  openMediaUploadDialog,
  type MediaUploadType,
} from "@/components/editor/media-upload-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  ToolbarSplitButton,
  ToolbarSplitButtonPrimary,
  ToolbarSplitButtonSecondary,
} from "./toolbar"

const MEDIA_CONFIG: Record<
  string,
  {
    icon: React.ReactNode
    type: MediaUploadType
  }
> = {
  [KEYS.audio]: {
    icon: <AudioLinesIcon className="size-4" />,
    type: KEYS.audio,
  },
  [KEYS.file]: {
    icon: <FileUpIcon className="size-4" />,
    type: KEYS.file,
  },
  [KEYS.img]: {
    icon: <ImageIcon className="size-4" />,
    type: KEYS.img,
  },
  [KEYS.video]: {
    icon: <FilmIcon className="size-4" />,
    type: KEYS.video,
  },
}

export function MediaToolbarButton({
  nodeType,
  ...props
}: DropdownMenuProps & { nodeType: string }) {
  const currentConfig = MEDIA_CONFIG[nodeType] ?? MEDIA_CONFIG[KEYS.img]
  const editor = useEditorRef()
  const [open, setOpen] = React.useState(false)

  const openDialog = (type: MediaUploadType = currentConfig.type) => {
    openMediaUploadDialog(editor, type)
  }

  return (
    <ToolbarSplitButton
      onClick={() => openDialog()}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault()
          setOpen(true)
        }
      }}
      pressed={open}
    >
      <ToolbarSplitButtonPrimary>
        {currentConfig.icon}
      </ToolbarSplitButtonPrimary>

      <DropdownMenu open={open} onOpenChange={setOpen} modal={false} {...props}>
        <DropdownMenuTrigger asChild>
          <ToolbarSplitButtonSecondary />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          onClick={(e) => e.stopPropagation()}
          align="start"
          alignOffset={-32}
        >
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => openDialog(KEYS.img)}>
              <ImageIcon />
              Image
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDialog(KEYS.video)}>
              <FilmIcon />
              Video
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDialog(KEYS.audio)}>
              <AudioLinesIcon />
              Audio
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDialog(KEYS.file)}>
              <FileUpIcon />
              File
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => openDialog(currentConfig.type)}>
              <UploadIcon />
              Upload…
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </ToolbarSplitButton>
  )
}
