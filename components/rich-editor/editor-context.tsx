"use client"

import * as React from "react"

import type { RichMentionable } from "@/lib/rich-editor/types"

const DEMO_MENTIONABLES: RichMentionable[] = [
  { key: "0", text: "Ada Lovelace" },
  { key: "1", text: "Alan Turing" },
  { key: "2", text: "Grace Hopper" },
  { key: "3", text: "Engineering" },
  { key: "4", text: "Design" },
  { key: "5", text: "Product" },
  { key: "6", text: "Support agent" },
  { key: "7", text: "Research agent" },
]

const MentionablesContext = React.createContext<RichMentionable[]>(DEMO_MENTIONABLES)

export function MentionablesProvider({
  mentionables,
  children,
}: {
  mentionables?: RichMentionable[]
  children: React.ReactNode
}) {
  return (
    <MentionablesContext.Provider value={mentionables ?? DEMO_MENTIONABLES}>
      {children}
    </MentionablesContext.Provider>
  )
}

export function useMentionables() {
  return React.useContext(MentionablesContext)
}

const WorkspaceIdContext = React.createContext<string | null>(null)

export function EditorWorkspaceProvider({
  workspaceId,
  children,
}: {
  workspaceId?: string | null
  children: React.ReactNode
}) {
  return (
    <WorkspaceIdContext.Provider value={workspaceId ?? null}>
      {children}
    </WorkspaceIdContext.Provider>
  )
}

export function useEditorWorkspaceId() {
  return React.useContext(WorkspaceIdContext)
}
