import { Form } from '@adonisjs/inertia/react'
import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function Onboarding() {
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceSlug, setWorkspaceSlug] = useState('')
  const [preferredTheme, setPreferredTheme] = useState<'light' | 'dark' | 'system'>('system')
  const suggestedSlug = useMemo(() => toSlug(workspaceName), [workspaceName])

  return (
    <section className="mx-auto flex min-h-[75vh] w-full max-w-xl items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Set up your workspace</CardTitle>
          <CardDescription>Complete onboarding once and start from your workspace URL.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form route="onboarding.store" className="space-y-5">
            {({ errors, processing }) => (
              <>
                <div className="space-y-2">
                  <Label htmlFor="workspaceName">Workspace name</Label>
                  <Input
                    id="workspaceName"
                    name="workspaceName"
                    value={workspaceName}
                    onChange={(e) => {
                      const value = e.target.value
                      setWorkspaceName(value)
                      if (!workspaceSlug) {
                        setWorkspaceSlug(toSlug(value))
                      }
                    }}
                    placeholder="Acme Workspace"
                    aria-invalid={Boolean(errors.workspaceName)}
                  />
                  {errors.workspaceName ? <p className="text-sm text-destructive">{errors.workspaceName}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workspaceSlug">Workspace slug</Label>
                  <Input
                    id="workspaceSlug"
                    name="workspaceSlug"
                    value={workspaceSlug}
                    onChange={(e) => setWorkspaceSlug(toSlug(e.target.value))}
                    placeholder={suggestedSlug || 'acme-workspace'}
                    aria-invalid={Boolean(errors.workspaceSlug)}
                  />
                  {errors.workspaceSlug ? <p className="text-sm text-destructive">{errors.workspaceSlug}</p> : null}
                </div>

                <input type="hidden" name="preferredTheme" value={preferredTheme} />
                <div className="space-y-2">
                  <Label>Preferred theme</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={preferredTheme === 'light' ? 'default' : 'outline'}
                      onClick={() => setPreferredTheme('light')}
                    >
                      Light
                    </Button>
                    <Button
                      type="button"
                      variant={preferredTheme === 'dark' ? 'default' : 'outline'}
                      onClick={() => setPreferredTheme('dark')}
                    >
                      Dark
                    </Button>
                    <Button
                      type="button"
                      variant={preferredTheme === 'system' ? 'default' : 'outline'}
                      onClick={() => setPreferredTheme('system')}
                    >
                      System
                    </Button>
                  </div>
                  {errors.preferredTheme ? <p className="text-sm text-destructive">{errors.preferredTheme}</p> : null}
                </div>

                <Button type="submit" disabled={processing} className="w-full">
                  Continue
                </Button>
              </>
            )}
          </Form>
        </CardContent>
      </Card>
    </section>
  )
}
