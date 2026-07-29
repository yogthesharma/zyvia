import { execute, parse, type ExecutionResult, type GraphQLSchema } from "graphql"
import { redirect } from "next/navigation"

import { createContext } from "@/lib/graphql/context"
import { buildSchema } from "@/lib/graphql/schema"

/** Built once in this module so schema + execute share one graphql realm. */
const schema: GraphQLSchema = buildSchema()

export async function executeGraphQL<TData = Record<string, unknown>>(
  source: string,
  variableValues?: Record<string, unknown>
): Promise<TData> {
  const contextValue = await createContext()
  const result = (await execute({
    schema,
    document: parse(source),
    variableValues,
    contextValue,
  })) as ExecutionResult<TData>

  if (result.errors?.length) {
    const first = result.errors[0]
    const code = first.extensions?.code
    if (code === "UNAUTHORIZED" || /unauthorized/i.test(first.message)) {
      redirect("/login")
    }
    throw first
  }

  if (!result.data) {
    throw new Error("GraphQL returned no data")
  }

  return result.data
}
