import type { YogaInitialContext } from "graphql-yoga"

import { createClient } from "@/lib/supabase/server"
import type { GraphQLContext } from "@/lib/graphql/builder"

export async function createContext(
  _initial?: YogaInitialContext
): Promise<GraphQLContext> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { supabase, user }
}
