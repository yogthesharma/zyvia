import { createYoga } from "graphql-yoga"

import { createContext } from "@/lib/graphql/context"
import { buildSchema } from "@/lib/graphql/schema"

const yoga = createYoga({
  schema: buildSchema(),
  graphqlEndpoint: "/api/graphql",
  graphiql: process.env.NODE_ENV !== "production",
  context: createContext,
  fetchAPI: { Response },
})

export { yoga }
