import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client — bypasses RLS.
 * Use ONLY in server actions / server components. Never expose to the client.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
