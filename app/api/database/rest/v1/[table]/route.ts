// Use the same public key and caller token as the browser. RLS stays in force.
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const TABLES = new Set(['products', 'sales', 'customers', 'stock_additions'])

async function proxy(request: Request, { params }: { params: { table: string } }) {
  if (!TABLES.has(params.table)) return Response.json({ message: 'Unknown resource' }, { status: 404 })
  const databaseURL = process.env.NEXT_PUBLIC_SUPABASE_URL
  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!databaseURL || !publicKey) return Response.json({ message: 'Database configuration is missing' }, { status: 503 })

  const url = new URL(request.url)
  const origin = request.headers.get('origin')
  if (request.method === 'POST' && origin && origin !== url.origin) {
    return Response.json({ message: 'Request origin is not allowed' }, { status: 403 })
  }
  const target = new URL(`/rest/v1/${params.table}`, databaseURL)
  target.search = url.search
  const headers = new Headers({
    apikey: publicKey,
    authorization: request.headers.get('authorization') || `Bearer ${publicKey}`,
  })
  for (const name of ['content-type', 'accept', 'prefer', 'range', 'range-unit', 'accept-profile', 'content-profile']) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const upstream = await fetch(target, {
      method: request.method, headers, cache: 'no-store', redirect: 'error',
      body: request.method === 'POST' ? await request.text() : undefined,
      signal: controller.signal,
    })
    const responseHeaders = new Headers({ 'Cache-Control': 'no-store' })
    for (const name of ['content-type', 'content-range', 'range-unit', 'preference-applied']) {
      const value = upstream.headers.get(name)
      if (value) responseHeaders.set(name, value)
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders })
  } catch (error) {
    console.error('Database request failed:', error instanceof Error ? error.message : 'Unknown connection error')
    return Response.json({ message: 'The database connection is unavailable. Please try again.' }, { status: 503 })
  } finally {
    clearTimeout(timeout)
  }
}

export const GET = proxy
export const POST = proxy
