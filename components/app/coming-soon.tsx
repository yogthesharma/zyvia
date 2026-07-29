import {
  SettingsPage,
  SettingsSection,
} from "@/components/app/settings-page"

export function ComingSoonPage({
  title,
  description,
  width = "narrow",
}: {
  title: string
  description?: string
  width?: "narrow" | "full"
}) {
  return (
    <SettingsPage
      title={title}
      description={
        description ?? "This section is stubbed to match Linear’s navigation."
      }
      width={width}
    >
      <SettingsSection title="Status">
        <p className="px-4 py-3.5 text-sm text-muted-foreground">
          Coming soon.
        </p>
      </SettingsSection>
    </SettingsPage>
  )
}
