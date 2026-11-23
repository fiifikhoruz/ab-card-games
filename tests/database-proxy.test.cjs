const { test } = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const source = fs.readFileSync('app/api/database/rest/v1/[table]/route.ts', 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const mod = { exports: {} }
new Function('module', 'exports', code)(mod, mod.exports)
const api = mod.exports
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://database.example.com'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-test-key'

test('forwards filters, pagination and caller identity without privileged credentials', async () => {
  global.fetch = async (url, init) => {
    assert.equal(String(url), 'https://database.example.com/rest/v1/sales?select=*&offset=1000&limit=1000')
    assert.equal(init.headers.get('apikey'), 'public-test-key')
    assert.equal(init.headers.get('authorization'), 'Bearer caller-token')
    assert.equal(init.headers.get('range'), '1000-1999')
    assert.equal(init.cache, 'no-store')
    return Response.json([{ id: 'sale' }], { status: 206, headers: { 'content-range': '1000-1999/2500' } })
  }
  const result = await api.GET(new Request('https://app.example/api/database/rest/v1/sales?select=*&offset=1000&limit=1000', { headers: { authorization: 'Bearer caller-token', range: '1000-1999' } }), { params: { table: 'sales' } })
  assert.equal(result.status, 206)
  assert.equal(result.headers.get('content-range'), '1000-1999/2500')
  assert.deepEqual(await result.json(), [{ id: 'sale' }])
})

test('preserves sale insert and database errors', async () => {
  const body = JSON.stringify({ quantity: 2, unit_price: 200, amount_paid: 0 })
  global.fetch = async (url, init) => {
    assert.equal(init.method, 'POST')
    assert.equal(init.body, body)
    assert.equal(init.headers.get('authorization'), 'Bearer public-test-key')
    assert.equal(init.headers.get('prefer'), 'return=representation')
    return Response.json({ message: 'permission denied' }, { status: 403 })
  }
  const result = await api.POST(new Request('https://app.example/api/database/rest/v1/sales', { method: 'POST', body, headers: { origin: 'https://app.example', prefer: 'return=representation' } }), { params: { table: 'sales' } })
  assert.equal(result.status, 403)
  assert.equal((await result.json()).message, 'permission denied')
})

test('rejects unrelated resources and cross-origin writes without forwarding', async () => {
  global.fetch = async () => { throw Error('must not be called') }
  assert.equal((await api.GET(new Request('https://app.example/api/database/rest/v1/private'), { params: { table: 'private' } })).status, 404)
  assert.equal((await api.POST(new Request('https://app.example/api/database/rest/v1/products', { method: 'POST', headers: { origin: 'https://other.example' } }), { params: { table: 'products' } })).status, 403)
})

test('returns an actionable failure rather than treating a failed connection as empty data', async () => {
  global.fetch = async () => { throw Error('connection failure') }
  const result = await api.GET(new Request('https://app.example/api/database/rest/v1/products'), { params: { table: 'products' } })
  assert.equal(result.status, 503)
  assert.match((await result.json()).message, /connection is unavailable/)
})

test('browser routes database requests through the app and keeps tokens, bodies and auth URLs intact', async () => {
  let options
  const clientSource = fs.readFileSync('lib/supabase.ts', 'utf8')
  const clientCode = ts.transpileModule(clientSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  const clientModule = { exports: {} }
  new Function('module', 'exports', 'require', clientCode)(clientModule, clientModule.exports, () => ({
    createBrowserClient: (url, key, config) => { options = config; return {} },
  }))
  clientModule.exports.createClient()
  assert.deepEqual(options.cookies, {})
  global.window = { location: { origin: 'https://app.example' } }
  try {
    global.fetch = async request => {
      assert.equal(request.url, 'https://app.example/api/database/rest/v1/sales?select=*')
      assert.equal(request.method, 'POST')
      assert.equal(request.headers.get('authorization'), 'Bearer user-token')
      assert.equal(await request.text(), '{"quantity":2}')
      return Response.json([])
    }
    await options.global.fetch('https://database.example.com/rest/v1/sales?select=*', {
      method: 'POST', body: '{"quantity":2}', headers: { authorization: 'Bearer user-token' },
    })
    global.fetch = async request => {
      assert.equal(request.url, 'https://database.example.com/auth/v1/token')
      return Response.json({})
    }
    await options.global.fetch('https://database.example.com/auth/v1/token')
  } finally { delete global.window }
})
