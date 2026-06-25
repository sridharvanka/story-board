import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

// Lazily initialised — never called during SSR, only when a store method is invoked
// client-side after hydration. Throws a clear error if .env.local is missing.
export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) {
      throw new Error(
        'Missing Supabase env vars. Create storyboard-nextjs/.env.local with:\n' +
        'NEXT_PUBLIC_SUPABASE_URL=...\nNEXT_PUBLIC_SUPABASE_ANON_KEY=...'
      )
    }
    _client = createClient(url, key)
  }
  return _client
}
