/**
 * Resolve a human-readable data region from the database host.
 * Prefers explicit AWS-style region codes in pooler / db hostnames, e.g.
 *   aws-1-ap-south-1.pooler.supabase.com
 */
const REGION_CODE_LABELS: { pattern: RegExp; label: string }[] = [
  { pattern: /\beu-[a-z]+-\d+\b/i, label: "European Union" },
  { pattern: /\bus-[a-z]+-\d+\b/i, label: "United States" },
  { pattern: /\bca-[a-z]+-\d+\b/i, label: "Canada" },
  { pattern: /\bsa-[a-z]+-\d+\b/i, label: "South America" },
  { pattern: /\baf-[a-z]+-\d+\b/i, label: "Africa" },
  { pattern: /\bme-[a-z]+-\d+\b/i, label: "Middle East" },
  { pattern: /\bap-[a-z]+-\d+\b/i, label: "Asia Pacific" },
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
  for (const entry of REGION_CODE_LABELS) {
    if (entry.pattern.test(haystack)) return entry.label
  }
  return "Asia Pacific"
}
