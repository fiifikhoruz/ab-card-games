import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {},
      global: {
        fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
          const request = new Request(input, init)
          const url = new URL(request.url)
          const databaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin
          if (typeof window !== 'undefined' && url.origin === databaseOrigin && url.pathname.startsWith('/rest/v1/')) {
            const target = new URL(`/api/database${url.pathname}${url.search}`, window.location.origin)
            return fetch(new Request(target, {
              method: request.method, headers: request.headers, signal: request.signal,
              body: request.method === 'POST' ? await request.text() : undefined,
            }))
          }
          return fetch(request)
        },
      },
    }
  )
}

// Singleton for client-side use
let client: ReturnType<typeof createClient> | null = null

export function getSupabaseClient() {
  if (!client) {
    client = createClient()
  }
  return client
}
