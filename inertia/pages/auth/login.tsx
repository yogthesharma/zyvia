import { Form } from '@adonisjs/inertia/react'
import { Link } from '@inertiajs/react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Login() {
  return (
    <section className="mx-auto flex min-h-[75vh] w-full max-w-md items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Login</CardTitle>
          <CardDescription>Enter your details to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form route="session.store" className="space-y-4">
            {({ errors, processing }) => (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    type="email"
                    name="email"
                    id="email"
                    autoComplete="username"
                    aria-invalid={Boolean(errors.email)}
                  />
                  {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    type="password"
                    name="password"
                    id="password"
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.password)}
                  />
                  {errors.password ? <p className="text-sm text-destructive">{errors.password}</p> : null}
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
                  Login
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  New here?{' '}
                  <Link href="/signup" className="text-primary hover:underline">
                    Create an account
                  </Link>
                </p>
              </>
            )}
          </Form>
        </CardContent>
      </Card>
    </section>
  )
}
