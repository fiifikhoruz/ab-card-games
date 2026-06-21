'use client'

import { useState, useEffect, Suspense } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { Plus, Search, ShoppingCart, Loader2, ChevronDown } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency, formatDate, getShortName } from '@/lib/utils'
import { getEditionColor, PAYMENT_METHODS } from '@/lib/types'
import type { Sale } from '@/lib/types'

// ── Payment icon helper ─────────────────────────────────
const PAYMENT_ICONS: Record<string, string> = {
  mobile_money:  '📱',
  cash:          '💵',
  bank_transfer: '🏦',
  card_pos:      '💳',
}

// ── Transaction grouping ────────────────────────────────
interface Transaction {
  id: string
  customer_name: string
  customer_phone?: string
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
        customer_phone: s.customer_phone,
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

// ── Main content ────────────────────────────────────────
function SalesContent() {
  const supabase = getSupabaseClient()

  const [sales, setSales]       = useState<Sale[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('sales')
      .select('*')
      .order('sale_date', { ascending: false })
      .then(({ data }) => {
        if (data) setSales(data)
        setLoading(false)
      })
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
  const avgOrder     = filtered.length > 0 ? totalRevenue / filtered.length : 0

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
      <div className="space-y-4 max-w-xl mx-auto lg:max-w-none">

        {/* Slim metric strip */}
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
            <span className="metric-label">Units</span>
          </div>
          <div className="metric-cell">
            <span className="metric-value">{formatCurrency(avgOrder)}</span>
            <span className="metric-label">Avg order</span>
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

        {/* Sale rows */}
        {filtered.length > 0 ? (
          <div className="card divide-y divide-surface-700 overflow-hidden">
            {filtered.map(txn => {
              const isExpanded = expanded === txn.id
              const multiItem  = txn.items.length > 1
              const hasBalance = txn.amount_paid < txn.total
              // Color dot: first item's edition color
              const dotColor = getEditionColor(txn.items[0].product_name)
              const payIcon  = PAYMENT_ICONS[txn.payment_method] ?? '💳'

              return (
                <div key={txn.id}>
                  <button
                    className="w-full list-row text-left"
                    onClick={() => multiItem && setExpanded(isExpanded ? null : txn.id)}
                  >
                    {/* Edition dot */}
                    <span className="edition-dot" style={{ backgroundColor: dotColor }} />

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{txn.customer_name}</p>
                      <p className="text-xs text-surface-500 mt-0.5">
                        {multiItem
                          ? `${txn.items.map(i => getShortName(i.product_name)).join(', ')}`
                          : `${getShortName(txn.items[0].product_name)} · ×${txn.items[0].quantity}`
                        }
                      </p>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-gold">{formatCurrency(txn.total)}</p>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="text-[11px]">{payIcon}</span>
                          <span className="text-[10px] text-surface-500">{formatDate(txn.sale_date)}</span>
                        </div>
                      </div>
                      {multiItem && (
                        <ChevronDown
                          size={14}
                          className={`text-surface-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      )}
                    </div>
                  </button>

                  {/* Expanded line items */}
                  {multiItem && isExpanded && (
                    <div className="bg-surface-700/30 px-4 py-3 space-y-2 border-t border-surface-700">
                      {txn.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span
                            className="edition-dot w-2 h-2"
                            style={{ backgroundColor: getEditionColor(item.product_name) }}
                          />
                          <span className="flex-1 text-surface-300 text-xs">{getShortName(item.product_name)} × {item.quantity}</span>
                          <span className="text-white text-xs font-medium">{formatCurrency(item.unit_price * item.quantity)}</span>
                        </div>
                      ))}
                      {hasBalance && (
                        <p className="text-xs text-amber-400 pt-1">
                          Paid {formatCurrency(txn.amount_paid)} · Balance {formatCurrency(txn.total - txn.amount_paid)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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

      {/* FAB */}
      <Link href="/sales/new" className="fab">
        <Plus size={18} strokeWidth={2.5} /> New sale
      </Link>
    </AppLayout>
  )
}

export default function SalesPage() {
  return <Suspense><SalesContent /></Suspense>
}
