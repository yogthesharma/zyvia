import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type DummyPageProps = {
  title: string
  description: string
  workspace?: string
  app?: string
}

export function DummyPage({ title, description, workspace = 'Personal Workspace', app }: DummyPageProps) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 py-2">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{workspace}</Badge>
        {app ? <Badge variant="outline">{app}</Badge> : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm">Create Task</Button>
          <Button size="sm" variant="outline">
            Open AI Copilot
          </Button>
        </CardContent>
      </Card>
    </section>
  )
}
