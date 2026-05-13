import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

// Service-role client for server-side admin operations.
// Bypasses RLS — only use after verifying the caller is an admin.
export function createAdminClient() {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
}
