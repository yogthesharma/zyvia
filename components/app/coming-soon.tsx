import { Separator } from "@/components/ui/separator"

export function ComingSoonPage({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-8">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {description ?? "This section is stubbed to match Linear’s navigation."}
      </p>
      <Separator className="my-6" />
      <p className="text-sm text-muted-foreground">Coming soon.</p>
    </div>
  )
}
