'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Gamepad2, Loader2, Plus, Search } from 'lucide-react'
import AppLayout from '@/components/layout/AppLayout'
import { getSupabaseClient } from '@/lib/supabase'
import { isGuessGH, PAYMENT_METHODS, type Product, type Sale } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function GuessGHPage() {
  const supabase = getSupabaseClient()
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [price, setPrice] = useState('200')
  const [stock, setStock] = useState('105')
  const [saving, setSaving] = useState(false)
  const [addingStock, setAddingStock] = useState(false)

  async function load() {
    setError('')
    try {
      const { data, error } = await supabase.from('products').select('*').order('sku')
      if (error) throw error
      const guessProducts = (data ?? []).filter(isGuessGH)
      setProducts(guessProducts)
      // Paginate so totals remain accurate after the database's default row limit.
      let rows: Sale[] = []
      if (guessProducts.length) {
        for (let offset = 0; ; offset += 1000) {
          const { data: page, error } = await supabase.from('sales').select('*')
            .in('product_id', guessProducts.map(p => p.id))
            .order('sale_date', { ascending: false }).order('id')
            .range(offset, offset + 999)
          if (error) throw error
          rows = rows.concat(page ?? [])
          if (!page || page.length < 1000) break
        }
      }
      setSales(rows)
    } catch {
      setError('Could not load Guess GH sales. Please try again.')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function setup(e: React.FormEvent) {
    e.preventDefault()
    if (saving || !Number.isFinite(Number(price)) || Number(price) <= 0 || !Number.isInteger(Number(stock)) || Number(stock) < 0) return
    setSaving(true)
    const { error } = await supabase.from('products').insert({
      name: 'Guess GH', sku: 'GGH-001', unit_price: Number(price), stock: Number(stock), reorder_level: 10,
    })
    if (error) toast.error(error.code === '23505' ? 'Guess GH is already set up. Refresh to continue.' : error.message)
    else { toast.success('Guess GH is ready'); await load(); setStock('') }
    setSaving(false)
  }

  async function addStock(e: React.FormEvent) {
    e.preventDefault()
    const quantity = Number(stock)
    if (saving || !Number.isInteger(quantity) || quantity <= 0 || !products[0]) return
    setSaving(true)
    const { error } = await supabase.from('stock_additions').insert({
      product_id: products[0].id, product_name: products[0].name, quantity,
    })
    if (error) toast.error(error.message)
    else { toast.success('Stock added'); setStock(''); setAddingStock(false); await load() }
    setSaving(false)
  }

  const filtered = sales.filter(s => `${s.customer_name} ${s.customer_phone ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  const revenue = filtered.reduce((sum, s) => sum + s.quantity * s.unit_price, 0)
  const received = filtered.reduce((sum, s) => sum + Number(s.amount_paid), 0)
  const units = filtered.reduce((sum, s) => sum + s.quantity, 0)
  const orders = new Set(filtered.map(s => s.transaction_id ?? s.id)).size

  return (
    <AppLayout title="Guess GH" subtitle="Sales and stock">
      <div className="max-w-3xl mx-auto space-y-5">
        {loading ? <div className="py-24 flex justify-center"><Loader2 className="animate-spin text-gold" /></div>
          : error ? <div className="card p-5 space-y-4"><p role="alert">{error}</p><button className="btn-primary" onClick={() => { setLoading(true); load() }}>Try again</button></div>
          : !products.length ? (
            <form className="card p-6 space-y-5" onSubmit={setup}>
              <Gamepad2 size={32} className="text-gold" />
              <h2 className="text-xl font-bold text-white">Start tracking Guess GH</h2>
              <p className="text-sm text-surface-400">Set the selling price and opening stock, then record your first sale.</p>
              <div><label htmlFor="price" className="input-label">Selling price (GH₵)</label><input id="price" className="input" type="number" min="0.01" step="0.01" required value={price} onChange={e => setPrice(e.target.value)} /></div>
              <div><label htmlFor="opening-stock" className="input-label">Opening stock (units)</label><input id="opening-stock" className="input" type="number" min="0" step="1" required value={stock} onChange={e => setStock(e.target.value)} /></div>
              <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Set up Guess GH'}</button>
            </form>
          ) : <>
            <Link href="/guess-gh/new" className="btn-primary w-full justify-center py-3.5"><Plus size={18} /> New Guess GH sale</Link>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Sales value', formatCurrency(revenue)], ['Payments received', formatCurrency(received)],
                ['Units sold', units], ['Transactions', orders],
              ].map(([label, value]) => <div className="card p-5" key={label}><p className="text-sm text-surface-400 mb-2">{label}</p><p className="text-xl font-bold text-white tabular-nums">{value}</p></div>)}
            </div>
            <div className="card p-5 flex items-center justify-between gap-4">
              <div><p className="text-sm text-surface-400">Current stock</p><p className="text-xl font-bold text-gold">{products.reduce((sum, p) => sum + p.stock, 0)} units</p></div>
              <button className="btn-secondary" onClick={() => { setAddingStock(!addingStock); setStock('') }}>Add stock</button>
            </div>
            {addingStock && <form className="card p-5 space-y-3" onSubmit={addStock}>
              <label htmlFor="stock" className="input-label">Quantity to add</label><input id="stock" className="input" type="number" min="1" step="1" required value={stock} onChange={e => setStock(e.target.value)} />
              <button className="btn-primary" disabled={saving}>{saving ? 'Adding…' : 'Confirm stock addition'}</button>
            </form>}
            <div className="relative"><Search size={18} className="absolute left-3 top-3 text-surface-500" /><input aria-label="Search Guess GH sales" className="input pl-10" type="search" placeholder="Search customer or phone…" value={search} onChange={e => setSearch(e.target.value)} /></div>
            <h2 className="text-lg font-bold text-white">Sales history</h2>
            {!filtered.length ? <div className="card p-8 text-center text-surface-400">{search ? 'No matching sales.' : 'No Guess GH sales yet. Record your first sale above.'}</div>
              : filtered.map(s => <div className="card p-5 space-y-2" key={s.id}>
                <div className="flex justify-between gap-3"><p className="font-bold text-white">{s.customer_name}</p><p className="font-bold text-gold">{formatCurrency(s.quantity * s.unit_price)}</p></div>
                <p className="text-sm text-surface-400">{s.quantity} unit{s.quantity === 1 ? '' : 's'} · {formatDate(s.sale_date)}</p>
                <p className="text-sm text-surface-400">{PAYMENT_METHODS.find(p => p.value === s.payment_method)?.label} · Paid {formatCurrency(Number(s.amount_paid))}</p>
                {s.quantity * s.unit_price > s.amount_paid && <p className="text-sm text-amber-400">Balance {formatCurrency(s.quantity * s.unit_price - s.amount_paid)}</p>}
              </div>)}
          </>}
      </div>
    </AppLayout>
  )
}
