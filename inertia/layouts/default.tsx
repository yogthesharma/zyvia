import { Data } from '@generated/data'
import { toast, Toaster } from 'sonner'
import { usePage } from '@inertiajs/react'
import { ReactElement, useEffect } from 'react'
import { AppSidebar } from '~/components/app-sidebar'
import { AiChatHeader } from '~/components/ai-chat-header'
import { SettingsSidebar } from '~/components/settings-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'

export default function Layout({ children }: { children: ReactElement<Data.SharedProps> }) {
  const pageProps = children.props as Data.SharedProps & {
    workspaceSlug?: string
    workspaceRole?: 'owner' | 'admin' | 'member' | null
    sidebarModel?: {
      sections: Array<{
        key: string
        label?: string
        items: Array<{ key: string; title: string; url: string; iconKey: string }>
      }>
      apps: Array<{
        name: string
        url: string
        iconKey: string
        items: Array<{ title: string; url: string }>
      }>
    }
    workspaces?: { name: string; slug: string }[]
  }
  const workspaceSlug = pageProps.workspaceSlug
  const currentUrl = usePage().url
  const isSettingsRoute = currentUrl.startsWith(`/${workspaceSlug ?? ''}/settings`) || currentUrl === '/settings'
  useEffect(() => {
    toast.dismiss()
  }, [currentUrl])

  useEffect(() => {
    if (children.props.flash.error) {
      toast.error(children.props.flash.error)
    }
    if (children.props.flash.success) {
      toast.success(children.props.flash.success)
    }
  })

  return (
    <>
      <TooltipProvider delayDuration={150}>
        <SidebarProvider>
          {isSettingsRoute ? (
            <SettingsSidebar workspaceSlug={workspaceSlug} currentUrl={currentUrl} />
          ) : (
            <AppSidebar
              user={children.props.user ?? undefined}
              workspaceSlug={workspaceSlug}
              sidebarModel={pageProps.sidebarModel}
              workspaces={pageProps.workspaces}
            />
          )}
          <SidebarInset className="overflow-hidden">
            <AiChatHeader />
            <main className="flex-1 p-4 md:p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
      <Toaster position="top-center" richColors />
    </>
  )
}
