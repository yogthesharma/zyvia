import type { Metadata } from "next"

import { RichEditorPlayground } from "@/components/rich-editor/playground"

export const metadata: Metadata = {
  title: "Rich editor playground",
  robots: { index: false, follow: false },
}

/** Isolated Plate playground — see components/rich-editor/REMOVE.md */
export default function RichEditorPage() {
  return <RichEditorPlayground />
}
