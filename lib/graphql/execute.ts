import { execute, parse, type ExecutionResult } from "graphql"

import { createContext } from "@/lib/graphql/context"
import { buildSchema } from "@/lib/graphql/schema"

export async function executeGraphQL<TData = Record<string, unknown>>(
  source: string,
  variableValues?: Record<string, unknown>
): Promise<TData> {
  // Build in this module graph so schema + execute share one `graphql` realm.
  const schema = buildSchema()
  const contextValue = await createContext()
  const result = (await execute({
    schema,
    document: parse(source),
    variableValues,
    contextValue,
  })) as ExecutionResult<TData>

  if (result.errors?.length) {
    throw result.errors[0]
  }

  if (!result.data) {
    throw new Error("GraphQL returned no data")
  }

  return result.data
}
