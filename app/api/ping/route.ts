import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// A fresh database request is required: cached successes can hide downtime.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const headers = { 'Cache-Control': 'no-store' }
  if (!url || !key) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500, headers })
  }
  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, { ...init, cache: 'no-store' }),
    },
  })
  const { error } = await supabase.from('products').select('id').limit(1)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 503, headers })
  }
  return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() }, { headers })
}
