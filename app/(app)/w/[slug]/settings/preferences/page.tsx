import type { Metadata } from "next"

import { SettingsPage } from "@/components/app/settings-page"
import { PreferencesForm } from "@/components/settings/preferences-form"

export const metadata: Metadata = { title: "Preferences" }

export default function PreferencesPage() {
  return (
    <SettingsPage
      title="Preferences"
      description="Personal interface settings for your Zyvia account."
      width="narrow"
    >
      <PreferencesForm />
    </SettingsPage>
  )
}
