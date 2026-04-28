import { MessageSquareText } from 'lucide-react'

import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

export function AiChatHeader() {
  return (
    <header className="sticky top-0 z-10 backdrop-blur">
      <div className="flex h-12 items-center gap-3 px-4">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-4 my-auto" />
        <div className="inline-flex items-center gap-2">
          <MessageSquareText className="text-muted-foreground size-4" />
          <span className="text-sm font-semibold tracking-tight">AI Chat</span>
        </div>
      </div>
    </header>
  )
}
