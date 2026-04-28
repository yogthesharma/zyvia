import { Form } from '@adonisjs/inertia/react'
import { Link } from '@inertiajs/react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function Signup() {
  return (
    <section className="mx-auto flex min-h-[75vh] w-full max-w-md items-center">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>Use email and password for development authentication.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form route="new_account.store" className="space-y-4">
            {({ errors, processing }) => (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input type="text" name="fullName" id="fullName" aria-invalid={Boolean(errors.fullName)} />
                  {errors.fullName ? <p className="text-sm text-destructive">{errors.fullName}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    type="email"
                    name="email"
                    id="email"
                    autoComplete="email"
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
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors.password)}
                  />
                  {errors.password ? <p className="text-sm text-destructive">{errors.password}</p> : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordConfirmation">Confirm password</Label>
                  <Input
                    type="password"
                    name="passwordConfirmation"
                    id="passwordConfirmation"
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors.passwordConfirmation)}
                  />
                  {errors.passwordConfirmation ? (
                    <p className="text-sm text-destructive">{errors.passwordConfirmation}</p>
                  ) : null}
                </div>

                <Button type="submit" className="w-full" disabled={processing}>
                  Sign up
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <Link href="/login" className="text-primary hover:underline">
                    Login
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
