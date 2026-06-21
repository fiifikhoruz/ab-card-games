'use client'

import { useState, useEffect, Suspense } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import EditionBadge from '@/components/EditionBadge'
import Link from 'next/link'
import { Plus, Search, ShoppingCart, Loader2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Sale, Product } from '@/lib/types'

// ── Transaction grouping ────────────────────────────────
interface Transaction {
  id: string
  customer_name: string
  payment_method: Sale['payment_method']
  sale_date: string
  items: { product_name: string; quantity: number; unit_price: number }[]
  total: number
  amount_paid: number
}

function groupIntoTransactions(sales: Sale[]): Transaction[] {
  const map = new Map<string, Transaction>()
  for (const s of sales) {
    const key = s.transaction_id ?? s.id
    if (map.has(key)) {
      const txn = map.get(key)!
      txn.items.push({ product_name: s.product_name, quantity: s.quantity, unit_price: s.unit_price })
      txn.total       += s.unit_price * s.quantity
      txn.amount_paid += s.amount_paid
    } else {
      map.set(key, {
        id:             key,
        customer_name:  s.customer_name,
        payment_method: s.payment_method,
        sale_date:      s.sale_date,
        items:          [{ product_name: s.product_name, quantity: s.quantity, unit_price: s.unit_price }],
        total:          s.unit_price * s.quantity,
        amount_paid:    s.amount_paid,
      })
    }
  }
  return Array.from(map.values())
}

const PAYMENT_ICON: Record<string, string> = {
  mobile_money: '📱', cash: '💵', bank_transfer: '🏦', card_pos: '💳',
}

// ── Sale card ─────────────────────────────────────────────
function SaleCard({ txn }: { txn: Transaction }) {
  const totalUnits = txn.items.reduce((s, i) => s + i.quantity, 0)
  const hasBalance = txn.amount_paid < txn.total
  const payIcon    = PAYMENT_ICON[txn.payment_method] ?? '💳'

  // Deduplicate editions (a multi-qty single edition shows badge once)
  const uniqueProducts = txn.items.filter(
    (item, idx, arr) => arr.findIndex(i => i.product_name === item.product_name) === idx
  )

  return (
    <div className="card p-4 space-y-3">
      {/* Row 1: name + amount */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] font-bold text-white leading-snug">{txn.customer_name}</p>
        <div className="text-right flex-shrink-0">
          <p className="text-[15px] font-bold text-gold">{formatCurrency(txn.total)}</p>
          {hasBalance && (
            <p className="text-[10px] text-amber-400 mt-0.5">Paid {formatCurrency(txn.amount_paid)}</p>
          )}
        </div>
      </div>

      {/* Row 2: edition badges */}
      <div className="flex flex-wrap gap-1.5">
        {uniqueProducts.map((item, i) => (
          <EditionBadge key={i} productName={item.product_name} />
        ))}
      </div>

      {/* Row 3: units · payment · date */}
      <div className="flex items-center justify-between pt-1 border-t border-surface-700">
        <span className="text-xs text-surface-500">
          {totalUnits} unit{totalUnits !== 1 ? 's' : ''}
          {txn.items.length > 1 ? ` · ${txn.items.length} editions` : ''}
        </span>
        <span className="text-xs text-surface-500">
          {payIcon} {formatDate(txn.sale_date)}
        </span>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────
function SalesContent() {
  const supabase = getSupabaseClient()

  const [sales, setSales]       = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    async function load() {
      const [{ data: saleRows }, { data: prods }] = await Promise.all([
        supabase.from('sales').select('*').order('sale_date', { ascending: false }),
        supabase.from('products').select('*').order('sku'),
      ])
      if (saleRows) setSales(saleRows)
      if (prods)    setProducts(prods)
      setLoading(false)
    }
    load()
  }, [])

  const transactions = groupIntoTransactions(sales)
  const filtered = transactions.filter(t =>
    !search ||
    t.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    t.items.some(i => i.product_name.toLowerCase().includes(search.toLowerCase()))
  )

  // Metrics
  const totalRevenue = filtered.reduce((sum, t) => sum + t.total, 0)
  const totalUnits   = filtered.reduce((sum, t) => t.items.reduce((s, i) => s + i.quantity, sum), 0)
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock <= p.reorder_level).length
  const outStockCount = products.filter(p => p.stock <= 0).length
  const alertCount    = lowStockCount + outStockCount

  if (loading) {
    return (
      <AppLayout title="Sales">
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-gold" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Sales">
      <div className="space-y-4 max-w-2xl mx-auto lg:max-w-none">

        {/* Primary action — top of page */}
        <Link href="/sales/new" className="btn-primary w-full justify-center py-3.5 text-base">
          <Plus size={18} strokeWidth={2.5} /> New sale
        </Link>

        {/* Metric strip */}
        <div className="metric-strip">
          <div className="metric-cell">
            <span className="metric-value text-gold">{formatCurrency(totalRevenue)}</span>
            <span className="metric-label">Revenue</span>
          </div>
          <div className="metric-cell">
            <span className="metric-value">{filtered.length}</span>
            <span className="metric-label">Transactions</span>
          </div>
          <div className="metric-cell">
            <span className="metric-value">{totalUnits}</span>
            <span className="metric-label">Units sold</span>
          </div>
          <div className="metric-cell">
            <span className={`metric-value ${alertCount > 0 ? 'text-amber-400' : 'text-white'}`}>
              {alertCount}
            </span>
            <span className="metric-label">Low stock</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500 pointer-events-none" />
          <input
            type="search"
            className="input pl-10"
            placeholder="Search customer or edition…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Transaction list */}
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map(txn => <SaleCard key={txn.id} txn={txn} />)}
          </div>
        ) : (
          <div className="empty-state">
            <div className="w-14 h-14 rounded-2xl bg-surface-800 flex items-center justify-center mb-4">
              <ShoppingCart size={24} className="text-surface-500" />
            </div>
            <p className="text-white font-semibold mb-1">
              {search ? 'No results' : 'No sales yet'}
            </p>
            <p className="text-sm text-surface-500 mb-5">
              {search ? 'Try a different search.' : 'Record your first sale to get started.'}
            </p>
            {!search && (
              <Link href="/sales/new" className="btn-primary text-sm px-6">
                <Plus size={16} /> New sale
              </Link>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

export default function SalesPage() {
  return <Suspense><SalesContent /></Suspense>
}
