import type { RichDoc } from "@/lib/rich-editor/types"

type AnyNode = {
  text?: string
  type?: string
  children?: AnyNode[]
  value?: string
}

function nodeToText(node: AnyNode): string {
  if (typeof node.text === "string") return node.text
  if (node.type === "mention" && typeof node.value === "string") {
    return `@${node.value}`
  }
  if (!Array.isArray(node.children)) return ""
  return node.children.map(nodeToText).join("")
}

/** Flatten a Plate doc to plain text for search / `issues.description`. */
export function richDocToPlainText(doc: RichDoc): string {
  const lines: string[] = []
  for (const block of doc as AnyNode[]) {
    const line = nodeToText(block).replace(/\s+/g, " ").trim()
    if (line) lines.push(line)
  }
  return lines.join("\n\n")
}
