import type { GraphQLSchema } from "graphql"

import { createBuilder } from "@/lib/graphql/builder"
import { registerUser } from "@/lib/graphql/schema/user"
import { registerWorkspace } from "@/lib/graphql/schema/workspace"

export function buildSchema(): GraphQLSchema {
  const builder = createBuilder()
  registerUser(builder)
  registerWorkspace(builder)
  return builder.toSchema()
}

/**
 * Fresh schema per module evaluation.
 * Do not cache on globalThis — Turbopack HMR can load duplicate `graphql`
 * module realms, and a cached schema from another realm fails instanceof checks.
 */
export const schema = buildSchema()
