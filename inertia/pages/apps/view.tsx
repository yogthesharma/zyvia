import { DummyPage } from '~/components/dummy-page'

type AppViewPageProps = {
  appName: string
  viewName: string
}

export default function AppViewPage({ appName, viewName }: AppViewPageProps) {
  return (
    <DummyPage
      title={`${appName} · ${viewName}`}
      description={`This is a placeholder for the ${viewName.toLowerCase()} view inside ${appName}.`}
      workspace="Zyvia Workspace"
      app={appName}
    />
  )
}
