import SchemaBuilder from "@pothos/core"
import type { SupabaseClient, User } from "@supabase/supabase-js"

export type GraphQLContext = {
  supabase: SupabaseClient
  user: User | null
}

export const builder = new SchemaBuilder<{
  Context: GraphQLContext
  Scalars: {
    DateTime: { Input: Date | string; Output: Date | string }
  }
}>({})

builder.queryType({})
builder.mutationType({})

builder.scalarType("DateTime", {
  serialize: (value) =>
    value instanceof Date ? value.toISOString() : String(value),
  parseValue: (value) => {
    if (typeof value === "string" || value instanceof Date) return value
    throw new Error("Invalid DateTime")
  },
})
