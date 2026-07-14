import 'server-only'
import { createClient } from '@supabase/supabase-js'

// The admin client should ONLY be used in server environments (Server Actions, Route Handlers).
// It bypasses Row Level Security (RLS) entirely.
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    }
  )
}
