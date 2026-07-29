"use client"

import * as React from "react"

import type { TFileElement } from "platejs"
import type { PlateElementProps } from "platejs/react"

import { FilePlugin, useMediaState } from "@platejs/media/react"
import { ResizableProvider } from "@platejs/resizable"
import {
  DownloadIcon,
  FileIcon,
  FileTextIcon,
} from "lucide-react"
import { PlateElement, useReadOnly, withHOC } from "platejs/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { Caption, CaptionTextarea } from "./caption"
import { MediaToolbar } from "./media-toolbar"

export const FileElement = withHOC(
  ResizableProvider,
  function FileElement(props: PlateElementProps<TFileElement>) {
    const readOnly = useReadOnly()
    const { align = "left", name, unsafeUrl } = useMediaState()
    const fileName = name || "Untitled file"
    const extension = getExtension(fileName)
    const isPdf = extension === "pdf"

    return (
      <MediaToolbar plugin={FilePlugin}>
        <PlateElement {...props} className="my-2">
          <figure
            className={cn(
              "group relative w-fit max-w-full",
              align === "center" && "mx-auto",
              align === "right" && "ml-auto"
            )}
            contentEditable={false}
          >
            <div className="flex w-fit max-w-sm items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-lg",
                  isPdf
                    ? "bg-red-500/15 text-red-600 dark:text-red-400"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {isPdf ? (
                  <FileTextIcon className="size-5" />
                ) : (
                  <FileIcon className="size-5" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{fileName}</div>
                <div className="text-xs text-muted-foreground uppercase">
                  {extension || "file"}
                </div>
              </div>

              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="shrink-0"
                asChild
              >
                <a
                  href={unsafeUrl}
                  download={fileName}
                  rel="noopener noreferrer"
                  target="_blank"
                  aria-label={`Download ${fileName}`}
                >
                  <DownloadIcon className="size-4" />
                </a>
              </Button>
            </div>

            <Caption align={align} className="max-w-sm">
              <CaptionTextarea
                className={cn(
                  align === "left" && "text-left",
                  align === "right" && "text-right"
                )}
                readOnly={readOnly}
                placeholder="Write a caption..."
              />
            </Caption>
          </figure>
          {props.children}
        </PlateElement>
      </MediaToolbar>
    )
  }
)

function getExtension(fileName: string) {
  const parts = fileName.split(".")
  if (parts.length < 2) return ""
  return parts.at(-1)?.toLowerCase() ?? ""
}
