/**
 * Resolve a human-readable data region from the Supabase Postgres host.
 * Vercel Marketplace injects POSTGRES_URL like:
 *   ...@aws-1-ap-south-1.pooler.supabase.com:6543/...
 */
const REGION_LABELS: { pattern: RegExp; label: string }[] = [
  { pattern: /\beu[-_]/i, label: "European Union" },
  { pattern: /\bus[-_]/i, label: "United States" },
  { pattern: /\bca[-_]/i, label: "Canada" },
  { pattern: /\bsa[-_]/i, label: "South America" },
  { pattern: /\baf[-_]/i, label: "Africa" },
  { pattern: /\bme[-_]/i, label: "Middle East" },
  { pattern: /\bap[-_]south[-_]1\b/i, label: "Asia Pacific" },
  { pattern: /\bap[-_]/i, label: "Asia Pacific" },
]

function hostsToInspect() {
  const hosts: string[] = []
  for (const value of [
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRISMA_URL,
    process.env.POSTGRES_URL_NON_POOLING,
    process.env.POSTGRES_HOST,
    process.env.SUPABASE_REGION,
    process.env.NEXT_PUBLIC_SUPABASE_REGION,
  ]) {
    if (value) hosts.push(value)
  }
  return hosts.join(" ")
}

export function resolveWorkspaceRegionLabel(): string {
  const haystack = hostsToInspect()
  for (const entry of REGION_LABELS) {
    if (entry.pattern.test(haystack)) return entry.label
  }
  return "Asia Pacific"
}
