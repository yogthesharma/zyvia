import { builder } from "@/lib/graphql/builder"

import "@/lib/graphql/schema/user"
import "@/lib/graphql/schema/workspace"
import "@/lib/graphql/schema/mutations"

export const schema = builder.toSchema()
