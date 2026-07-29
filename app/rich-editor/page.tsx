import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { RichEditorPlayground } from "@/components/rich-editor/playground"

export const metadata: Metadata = {
  title: "Rich editor playground",
  robots: { index: false, follow: false },
}

/** Isolated Plate playground — see components/rich-editor/REMOVE.md */
export default function RichEditorPage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  return <RichEditorPlayground />
}
