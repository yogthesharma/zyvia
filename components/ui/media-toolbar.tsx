"use client"

import * as React from "react"

import type { WithRequiredKey } from "platejs"

import {
  FloatingMedia as FloatingMediaPrimitive,
  FloatingMediaStore,
  useFloatingMediaValue,
  useImagePreviewValue,
} from "@platejs/media/react"
import { cva } from "class-variance-authority"
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  Link,
  Trash2Icon,
} from "lucide-react"
import {
  useEditorRef,
  useEditorSelector,
  useElement,
  useFocusedLast,
  useReadOnly,
  useRemoveNodeButton,
  useSelected,
} from "platejs/react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

import { CaptionButton } from "./caption"

const inputVariants = cva(
  "flex h-[28px] w-full rounded-md border-none bg-transparent px-1.5 py-1 text-base placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-transparent md:text-sm"
)

type MediaAlign = "center" | "left" | "right"

export function MediaToolbar({
  children,
  plugin,
  showAlign = true,
}: {
  children: React.ReactNode
  plugin: WithRequiredKey
  showAlign?: boolean
}) {
  const editor = useEditorRef()
  const readOnly = useReadOnly()
  const selected = useSelected()
  const isFocusedLast = useFocusedLast()
  const selectionCollapsed = useEditorSelector(
    (editor) => !editor.api.isExpanded(),
    []
  )
  const isImagePreviewOpen = useImagePreviewValue("isOpen", editor.id)
  const open =
    isFocusedLast &&
    !readOnly &&
    selected &&
    selectionCollapsed &&
    !isImagePreviewOpen
  const isEditing = useFloatingMediaValue("isEditing")

  React.useEffect(() => {
    if (!open && isEditing) {
      FloatingMediaStore.set("isEditing", false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const element = useElement()
  const { props: buttonProps } = useRemoveNodeButton({ element })
  const align = (element.align as MediaAlign | undefined) ?? "center"

  const setAlign = (next: MediaAlign) => {
    const path = editor.api.findPath(element)
    if (!path) return
    editor.tf.setNodes({ align: next }, { at: path })
  }

  return (
    <Popover open={open} modal={false}>
      <PopoverAnchor>{children}</PopoverAnchor>

      <PopoverContent
        className="w-auto p-1"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {isEditing ? (
          <div className="flex w-[330px] flex-col">
            <div className="flex items-center">
              <div className="flex items-center pr-1 pl-2 text-muted-foreground">
                <Link className="size-4" />
              </div>

              <FloatingMediaPrimitive.UrlInput
                className={inputVariants()}
                placeholder="Paste the embed link..."
                options={{ plugin }}
              />
            </div>
          </div>
        ) : (
          <div className="box-content flex items-center gap-0.5">
            {showAlign ? (
              <>
                <AlignButton
                  active={align === "left"}
                  label="Align left"
                  onClick={() => setAlign("left")}
                >
                  <AlignLeftIcon />
                </AlignButton>
                <AlignButton
                  active={align === "center"}
                  label="Align center"
                  onClick={() => setAlign("center")}
                >
                  <AlignCenterIcon />
                </AlignButton>
                <AlignButton
                  active={align === "right"}
                  label="Align right"
                  onClick={() => setAlign("right")}
                >
                  <AlignRightIcon />
                </AlignButton>
                <Separator orientation="vertical" className="mx-1 h-6" />
              </>
            ) : null}

            <FloatingMediaPrimitive.EditButton
              className={buttonVariants({ size: "sm", variant: "ghost" })}
            >
              Edit link
            </FloatingMediaPrimitive.EditButton>

            <CaptionButton size="sm" variant="ghost">
              Caption
            </CaptionButton>

            <Separator orientation="vertical" className="mx-1 h-6" />

            <Button size="sm" variant="ghost" {...buttonProps}>
              <Trash2Icon />
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function AlignButton({
  active,
  children,
  label,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      aria-label={label}
      title={label}
      className={cn(active && "bg-accent text-accent-foreground")}
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
    >
      {children}
    </Button>
  )
}
