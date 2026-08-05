'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { Plus, X, Loader2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency, getShortName } from '@/lib/utils'
import { getEditionInfo } from '@/lib/types'
import type { Product, Sale } from '@/lib/types'
import toast from 'react-hot-toast'

// ── Edition sales chart (stepping blocks) ─────────────────
interface RankedEdition {
  product: Product
  sold: number
  info: ReturnType<typeof getEditionInfo>
}

function EditionChart({ ranked, onAddStock }: { ranked: RankedEdition[]; onAddStock: (p: Product) => void }) {
  const maxSold  = Math.max(...ranked.map(r => r.sold), 1)
  const hasSales = ranked.some(r => r.sold > 0)
  const MEDALS   = ['🥇', '🥈', '🥉']

  return (
    <div className="card p-5">
      <p className="text-xs font-semibold text-surface-500 uppercase tracking-widest mb-5">
        Editions moving most
      </p>

      {hasSales ? (
        <>
          {/* Stepping blocks chart */}
          <div className="flex items-end gap-2 h-36 mb-4">
            {ranked.map((r, i) => {
              const pct    = maxSold > 0 ? (r.sold / maxSold) * 100 : 0
              const height = r.sold === 0 ? 8 : Math.max(14, pct)
              return (
                <button
                  key={r.product.id}
                  onClick={() => {}} // could open sheet in future
                  className="flex-1 flex flex-col items-center gap-1.5 group"
                  style={{ height: '100%', justifyContent: 'flex-end' }}
                >
                  {r.sold > 0 && (
                    <span className="text-xs font-bold text-white tabular-nums">{r.sold}</span>
                  )}
                  <div
                    className="w-full rounded-t-xl transition-all duration-500"
                    style={{
                      height: `${height}%`,
                      backgroundColor: r.sold === 0 ? 'rgba(255,255,255,0.06)' : r.info.color,
                      opacity: r.sold === 0 ? 1 : 0.9,
                    }}
                  />
                </button>
              )
            })}
          </div>

          {/* Labels */}
          <div className="flex gap-2">
            {ranked.map((r, i) => (
              <div key={r.product.id} className="flex-1 flex flex-col items-center gap-0.5">
                <div className="w-2 h-2 rounded-full mx-auto" style={{ backgroundColor: r.info.color }} />
                <span className="text-[9px] text-surface-500 text-center leading-tight">{r.info.name}</span>
              </div>
            ))}
          </div>

          {/* Ranked list — every edition, with stock + add action */}
          <div className="mt-5 divide-y divide-surface-700 border-t border-surface-700">
            {ranked.map((r, i) => (
              <div key={r.product.id} className="flex items-center gap-3 py-2.5">
                <span className="text-base w-6 flex-shrink-0 text-center">
                  {r.sold > 0 ? (MEDALS[i] ?? `${i + 1}`) : '–'}
                </span>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.info.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{r.info.name} Edition</p>
                  <p className="text-xs text-surface-500">
                    {r.sold} sold · {Math.max(0, r.product.stock)} in stock
                  </p>
                </div>
                <button
                  onClick={() => onAddStock(r.product)}
                  className="text-xs text-gold font-semibold hover:underline flex-shrink-0 px-2 py-1"
                >
                  + Stock
                </button>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Empty state — no sales recorded yet */
        <>
          <div className="flex flex-col items-center py-4 gap-3">
            <div className="flex items-end gap-2 h-24 w-full opacity-20">
              {ranked.map((r, i) => (
                <div
                  key={r.product.id}
                  className="flex-1 rounded-t-xl"
                  style={{
                    height: `${[60, 80, 45, 30, 55][i] ?? 50}%`,
                    backgroundColor: r.info.color,
                  }}
                />
              ))}
            </div>
            <p className="text-sm text-surface-500">Record your first sale to see which edition leads.</p>
            <Link href="/sales/new" className="text-xs text-gold font-medium">Record a sale →</Link>
          </div>

          {/* Still allow stock management */}
          <div className="mt-3 divide-y divide-surface-700 border-t border-surface-700">
            {ranked.map(r => (
              <div key={r.product.id} className="flex items-center gap-3 py-2.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.info.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{r.info.name} Edition</p>
                  <p className="text-xs text-surface-500">{Math.max(0, r.product.stock)} in stock</p>
                </div>
                <button
                  onClick={() => onAddStock(r.product)}
                  className="text-xs text-gold font-semibold hover:underline flex-shrink-0 px-2 py-1"
                >
                  + Stock
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────
export default function DashboardPage() {
  const supabase = getSupabaseClient()

  const [products, setProducts]         = useState<Product[]>([])
  const [sales, setSales]               = useState<Sale[]>([])
  const [loading, setLoading]           = useState(true)
  const [sheetProduct, setSheetProduct] = useState<Product | null>(null)
  const [addQty, setAddQty]             = useState('')
  const [addBatch, setAddBatch]         = useState('')
  const [addingSt, setAddingSt]         = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: prods }, { data: saleRows }] = await Promise.all([
        supabase.from('products').select('*').order('sku'),
        supabase.from('sales').select('*').order('sale_date', { ascending: false }).limit(500),
      ])
      if (prods)    setProducts(prods)
      if (saleRows) setSales(saleRows)
      setLoading(false)
    }
    load()
  }, [])

  // ── KPI calculations ──────────────────────────────────
  const thisMonth = new Date().getMonth()
  const thisYear  = new Date().getFullYear()

  const salesMonth = sales.filter(s => {
    const d = new Date(s.sale_date)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })

  const revenueAllTime = sales.reduce((sum, s) => sum + s.unit_price * s.quantity, 0)
  const revenueMonth   = salesMonth.reduce((sum, s) => sum + s.unit_price * s.quantity, 0)

  // Earliest recorded sale — tells the owner when tracking began
  const firstSaleDate = sales.length > 0
    ? new Date(Math.min(...sales.map(s => new Date(s.sale_date).getTime())))
    : null

  // units sold per product — sorted descending
  const unitsSoldMap: Record<string, number> = {}
  for (const s of sales) {
    unitsSoldMap[s.product_id] = (unitsSoldMap[s.product_id] ?? 0) + s.quantity
  }

  const ranked: RankedEdition[] = [...products]
    .map(p => ({ product: p, sold: unitsSoldMap[p.id] ?? 0, info: getEditionInfo(p.name) }))
    .sort((a, b) => b.sold - a.sold)

  // low / out stock
  const lowStock = products.filter(p => p.stock > 0 && p.stock <= p.reorder_level)
  const outStock = products.filter(p => p.stock <= 0)

  // ── Add stock ─────────────────────────────────────────
  function openSheet(p: Product) { setSheetProduct(p); setAddQty(''); setAddBatch('') }
  function closeSheet()          { setSheetProduct(null) }

  async function handleAddStock(e: React.FormEvent) {
    e.preventDefault()
    const qty = parseInt(addQty, 10)
    if (!qty || qty <= 0) { toast.error('Enter a valid quantity'); return }
    if (!sheetProduct) return
    setAddingSt(true)
    const { error } = await supabase.from('stock_additions').insert({
      product_id:   sheetProduct.id,
      product_name: sheetProduct.name,
      batch_number: addBatch.trim() || null,
      quantity:     qty,
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Added ${qty} units to ${getShortName(sheetProduct.name)}`)
      const { data } = await supabase.from('products').select('*').order('sku')
      if (data) setProducts(data)
      closeSheet()
    }
    setAddingSt(false)
  }

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-gold" />
        </div>
      </AppLayout>
    )
  }

  const today_label = new Date().toLocaleDateString('en-GH', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <AppLayout title="Dashboard" subtitle={today_label}>
      <div className="space-y-4 max-w-2xl mx-auto lg:max-w-none">

        {/* ── KPI — two numbers ───────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-5">
            <p className="text-xs text-surface-500 mb-2">All-time revenue</p>
            <p className="text-2xl font-bold text-gold tabular-nums leading-none">{formatCurrency(revenueAllTime)}</p>
            <p className="text-xs text-surface-500 mt-2">
              {firstSaleDate
                ? `Since ${firstSaleDate.toLocaleDateString('en-GH', { day: 'numeric', month: 'long', year: 'numeric' })}`
                : 'No sales recorded yet'}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-xs text-surface-500 mb-2">This month</p>
            <p className="text-2xl font-bold text-white tabular-nums leading-none">{formatCurrency(revenueMonth)}</p>
            <p className="text-xs text-surface-500 mt-2">{salesMonth.length} sale{salesMonth.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* ── Low stock alert ─────────────────────────── */}
        {(lowStock.length > 0 || outStock.length > 0) ? (
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3">Low stock alert</p>
            <div className="space-y-2.5">
              {[...outStock, ...lowStock].map(p => {
                const info = getEditionInfo(p.name)
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: info.color }} />
                      <span className="text-sm text-surface-300 truncate">{info.name} Edition</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-sm font-semibold ${p.stock <= 0 ? 'text-red-400' : 'text-amber-400'}`}>
                        {p.stock <= 0 ? 'Out of stock' : `${p.stock} left`}
                      </span>
                      <button
                        onClick={() => openSheet(p)}
                        className="text-xs text-gold font-semibold hover:underline"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="bg-surface-800/50 border border-surface-700 rounded-2xl px-4 py-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#00bf63' }} />
            <p className="text-sm text-surface-400">All editions sufficiently stocked</p>
          </div>
        )}

        {/* ── Edition ranking chart ───────────────────── */}
        <EditionChart ranked={ranked} onAddStock={openSheet} />

      </div>

      {/* FAB */}
      <Link href="/sales/new" className="fab">
        <Plus size={18} strokeWidth={2.5} /> New sale
      </Link>

      {/* ── Add stock bottom sheet ───────────────────── */}
      {sheetProduct && (() => {
        const info      = getEditionInfo(sheetProduct.name)
        const remaining = Math.max(0, sheetProduct.stock)
        const newTotal  = remaining + (parseInt(addQty, 10) || 0)
        return (
          <div className="sheet-overlay" onClick={closeSheet}>
            <div className="sheet-panel" onClick={e => e.stopPropagation()}>
              <div className="sheet-handle" />
              <div className="flex items-center gap-3 px-5 pt-4 pb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: info.color }} />
                <div className="flex-1">
                  <p className="text-base font-bold text-white">Add stock — {info.name} Edition</p>
                  <p className="text-xs text-surface-500">{remaining} units currently in stock</p>
                </div>
                <button onClick={closeSheet} className="btn-ghost p-1.5"><X size={18} /></button>
              </div>
              <form onSubmit={handleAddStock} className="px-5 pt-4 pb-8 space-y-4">
                <div>
                  <label className="input-label">Quantity to add *</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="e.g. 50"
                    min={1}
                    value={addQty}
                    onChange={e => setAddQty(e.target.value)}
                    autoFocus
                    required
                  />
                  {addQty && parseInt(addQty) > 0 && (
                    <p className="text-xs text-surface-500 mt-1.5">
                      New total: <span className="text-white font-semibold">{newTotal} units</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="input-label">Batch number <span className="text-surface-600 normal-case font-normal">(optional)</span></label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. B2026-01"
                    value={addBatch}
                    onChange={e => setAddBatch(e.target.value)}
                  />
                </div>
                <button type="submit" disabled={addingSt} className="btn-primary w-full justify-center py-3.5">
                  {addingSt ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {addingSt ? 'Adding…' : 'Confirm'}
                </button>
              </form>
            </div>
          </div>
        )
      })()}
    </AppLayout>
  )
}
