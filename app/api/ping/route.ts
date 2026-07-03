import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Vercel Cron Job — runs daily to keep Supabase free-tier project alive.
// Configured in vercel.json.
export const runtime = 'edge'

export async function GET() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json({ error: 'Missing Supabase env vars' }, { status: 500 })
  }

  const supabase = createClient(url, key)
  const { error } = await supabase.from('products').select('id').limit(1)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, pingedAt: new Date().toISOString() })
}
