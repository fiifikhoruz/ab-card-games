'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { Plus, X, Loader2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency, getShortName } from '@/lib/utils'
import { PRODUCT_COLORS, getEditionInfo } from '@/lib/types'
import type { Product, Sale } from '@/lib/types'
import toast from 'react-hot-toast'

// ── Stock card ────────────────────────────────────────────
interface StockCardProps {
  product: Product
  unitsSold: number
  onClick: () => void
}

function StockCard({ product, unitsSold, onClick }: StockCardProps) {
  const info      = getEditionInfo(product.name)
  const remaining = Math.max(0, product.stock)
  const isOut     = product.stock <= 0
  const isLow     = !isOut && product.stock <= product.reorder_level

  return (
    <button
      onClick={onClick}
      className="card p-4 text-left w-full active:scale-[0.98] transition-transform group"
    >
      {/* Top accent bar */}
      <div className="h-1 -mx-4 -mt-4 mb-4 rounded-t-2xl" style={{ backgroundColor: info.color }} />

      {/* Edition name */}
      <p className="text-xs font-semibold text-surface-400 mb-2">{info.name} Edition</p>

      {/* Units remaining — the hero number */}
      {isOut ? (
        <p className="text-lg font-bold text-red-400 mb-0.5">Out of stock</p>
      ) : (
        <p className="text-3xl font-bold text-white tabular-nums leading-none mb-0.5">
          {remaining.toLocaleString()}
        </p>
      )}
      {!isOut && (
        <p className={`text-xs mb-3 ${isLow ? 'text-amber-400 font-medium' : 'text-surface-500'}`}>
          {isLow ? 'Running low' : 'remaining'}
        </p>
      )}
      {isOut && <p className="text-xs text-surface-500 mb-3">0 remaining</p>}

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-surface-700">
        <span className="text-xs text-surface-500">{unitsSold.toLocaleString()} sold</span>
        <span className="text-xs font-medium text-surface-400 group-hover:text-gold transition-colors">
          + Add stock
        </span>
      </div>
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────
export default function DashboardPage() {
  const supabase = getSupabaseClient()

  const [products, setProducts]           = useState<Product[]>([])
  const [sales, setSales]                 = useState<Sale[]>([])
  const [loading, setLoading]             = useState(true)
  const [sheetProduct, setSheetProduct]   = useState<Product | null>(null)
  const [addQty, setAddQty]               = useState('')
  const [addBatch, setAddBatch]           = useState('')
  const [addingSt, setAddingSt]           = useState(false)

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
  const today     = new Date().toDateString()
  const thisMonth = new Date().getMonth()
  const thisYear  = new Date().getFullYear()

  const salesToday = sales.filter(s => new Date(s.sale_date).toDateString() === today)
  const salesMonth = sales.filter(s => {
    const d = new Date(s.sale_date)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })

  const revenueToday  = salesToday.reduce((sum, s) => sum + s.unit_price * s.quantity, 0)
  const revenueMonth  = salesMonth.reduce((sum, s) => sum + s.unit_price * s.quantity, 0)
  const unitsThisMonth = salesMonth.reduce((sum, s) => sum + s.quantity, 0)
  const totalStock    = products.reduce((sum, p) => sum + Math.max(0, p.stock), 0)

  // units sold per product
  const unitsSoldMap: Record<string, number> = {}
  for (const s of sales) {
    unitsSoldMap[s.product_id] = (unitsSoldMap[s.product_id] ?? 0) + s.quantity
  }

  // low stock
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
      <div className="space-y-6 max-w-2xl mx-auto lg:max-w-none">

        {/* ── KPI grid ────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <p className="text-xs text-surface-500 mb-1">Revenue today</p>
            <p className="text-2xl font-bold text-gold tabular-nums">{formatCurrency(revenueToday)}</p>
            <p className="text-xs text-surface-500 mt-1">{salesToday.length} sale{salesToday.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-surface-500 mb-1">Revenue this month</p>
            <p className="text-2xl font-bold text-white tabular-nums">{formatCurrency(revenueMonth)}</p>
            <p className="text-xs text-surface-500 mt-1">{salesMonth.length} sale{salesMonth.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-surface-500 mb-1">Units sold this month</p>
            <p className="text-2xl font-bold text-white tabular-nums">{unitsThisMonth}</p>
            <p className="text-xs text-surface-500 mt-1">across all editions</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-surface-500 mb-1">Total stock remaining</p>
            <p className="text-2xl font-bold text-white tabular-nums">{totalStock.toLocaleString()}</p>
            <p className="text-xs text-surface-500 mt-1">units in hand</p>
          </div>
        </div>

        {/* ── Low stock alert ──────────────────────────── */}
        {(lowStock.length > 0 || outStock.length > 0) ? (
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-4">
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest mb-3">Low stock alert</p>
            <div className="space-y-2">
              {[...outStock, ...lowStock].map(p => {
                const info = getEditionInfo(p.name)
                return (
                  <div key={p.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: info.color }} />
                      <span className="text-sm text-surface-300">{info.name} Edition</span>
                    </div>
                    <span className={`text-sm font-semibold ${p.stock <= 0 ? 'text-red-400' : 'text-amber-400'}`}>
                      {p.stock <= 0 ? 'Out of stock' : `${p.stock} left`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="bg-surface-800/50 border border-surface-700 rounded-2xl px-4 py-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-edition-global" />
            <p className="text-sm text-surface-400">All editions sufficiently stocked</p>
          </div>
        )}

        {/* ── Stock cards (hero) ───────────────────────── */}
        <div>
          <p className="section-label mb-3">Stock levels — tap a card to add stock</p>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
            {products.map(p => (
              <StockCard
                key={p.id}
                product={p}
                unitsSold={unitsSoldMap[p.id] ?? 0}
                onClick={() => openSheet(p)}
              />
            ))}
          </div>
        </div>

      </div>

      {/* FAB */}
      <Link href="/sales/new" className="fab">
        <Plus size={18} strokeWidth={2.5} /> New sale
      </Link>

      {/* ── Add Stock bottom sheet ─────────────────────── */}
      {sheetProduct && (() => {
        const info      = getEditionInfo(sheetProduct.name)
        const remaining = Math.max(0, sheetProduct.stock)
        const newTotal  = remaining + (parseInt(addQty, 10) || 0)
        return (
          <div className="sheet-overlay" onClick={closeSheet}>
            <div className="sheet-panel" onClick={e => e.stopPropagation()}>
              <div className="sheet-handle" />

              {/* Header */}
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
