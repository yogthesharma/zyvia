"use client"

import * as React from "react"

import type { TAudioElement } from "platejs"
import type { PlateElementProps } from "platejs/react"

import { AudioPlugin, useMediaState } from "@platejs/media/react"
import { ResizableProvider } from "@platejs/resizable"
import {
  PauseIcon,
  PlayIcon,
  Volume2Icon,
  VolumeXIcon,
} from "lucide-react"
import { PlateElement, withHOC } from "platejs/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { Caption, CaptionTextarea } from "./caption"
import { MediaToolbar } from "./media-toolbar"

export const AudioElement = withHOC(
  ResizableProvider,
  function AudioElement(props: PlateElementProps<TAudioElement>) {
    const { align = "center", name, readOnly, unsafeUrl } = useMediaState()
    const audioRef = React.useRef<HTMLAudioElement>(null)
    const [playing, setPlaying] = React.useState(false)
    const [muted, setMuted] = React.useState(false)
    const [duration, setDuration] = React.useState(0)
    const [currentTime, setCurrentTime] = React.useState(0)

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0
    const fileName = name && name.length > 0 ? name : "Audio"

    const togglePlay = () => {
      const node = audioRef.current
      if (!node) return
      if (node.paused) {
        void node.play()
      } else {
        node.pause()
      }
    }

    const seek = (event: React.MouseEvent<HTMLDivElement>) => {
      const node = audioRef.current
      if (!node || !duration) return
      const rect = event.currentTarget.getBoundingClientRect()
      const ratio = Math.min(
        1,
        Math.max(0, (event.clientX - rect.left) / rect.width)
      )
      node.currentTime = ratio * duration
      setCurrentTime(node.currentTime)
    }

    return (
      <MediaToolbar plugin={AudioPlugin}>
        <PlateElement {...props} className="my-2">
          <figure
            className={cn(
              "group relative max-w-md cursor-default",
              align === "center" && "mx-auto",
              align === "left" && "mr-auto",
              align === "right" && "ml-auto"
            )}
            contentEditable={false}
          >
            <audio
              ref={audioRef}
              className="hidden"
              src={unsafeUrl}
              preload="metadata"
              onLoadedMetadata={(event) => {
                setDuration(event.currentTarget.duration || 0)
              }}
              onTimeUpdate={(event) => {
                setCurrentTime(event.currentTarget.currentTime)
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => {
                setPlaying(false)
                setCurrentTime(0)
              }}
            />

            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5 shadow-sm">
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                className="size-9 shrink-0 rounded-full"
                aria-label={playing ? "Pause" : "Play"}
                onClick={togglePlay}
              >
                {playing ? (
                  <PauseIcon className="size-4" />
                ) : (
                  <PlayIcon className="size-4" />
                )}
              </Button>

              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="truncate text-sm font-medium">{fileName}</div>
                <div
                  className="group/progress relative h-1.5 cursor-pointer rounded-full bg-border"
                  onClick={seek}
                >
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-foreground/80 transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                  <div
                    className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground opacity-0 transition-opacity group-hover/progress:opacity-100"
                    style={{ left: `${progress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground tabular-nums">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="shrink-0"
                aria-label={muted ? "Unmute" : "Mute"}
                onClick={() => {
                  const node = audioRef.current
                  if (!node) return
                  node.muted = !node.muted
                  setMuted(node.muted)
                }}
              >
                {muted ? (
                  <VolumeXIcon className="size-4" />
                ) : (
                  <Volume2Icon className="size-4" />
                )}
              </Button>
            </div>

            <Caption style={{ width: "100%" }} align={align}>
              <CaptionTextarea
                className="h-auto"
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

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}
