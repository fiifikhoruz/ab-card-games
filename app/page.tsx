'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { Plus, AlertTriangle, ShoppingCart, Loader2, TrendingUp } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency, getShortName } from '@/lib/utils'
import { PRODUCT_COLORS, getEditionColor } from '@/lib/types'
import type { Product, Sale } from '@/lib/types'

function stockStatus(p: Product): 'ok' | 'low' | 'out' {
  if (p.stock === 0) return 'out'
  if (p.stock <= p.reorder_level) return 'low'
  return 'ok'
}

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [sales, setSales]       = useState<Sale[]>([])
  const [loading, setLoading]   = useState(true)
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function load() {
      const [{ data: prods }, { data: saleRows }] = await Promise.all([
        supabase.from('products').select('*').order('sku'),
        supabase.from('sales').select('*').order('sale_date', { ascending: false }).limit(100),
      ])
      if (prods)    setProducts(prods)
      if (saleRows) setSales(saleRows)
      setLoading(false)
    }
    load()
  }, [])

  const today     = new Date().toDateString()
  const thisMonth = new Date().getMonth()
  const thisYear  = new Date().getFullYear()

  const salesToday = sales.filter(s => new Date(s.sale_date).toDateString() === today)
  const salesMonth = sales.filter(s => {
    const d = new Date(s.sale_date)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })

  const revenueToday = salesToday.reduce((sum, s) => sum + s.unit_price * s.quantity, 0)
  const revenueMonth = salesMonth.reduce((sum, s) => sum + s.unit_price * s.quantity, 0)

  const unitsSoldMap: Record<string, number> = {}
  for (const s of sales) {
    unitsSoldMap[s.product_id] = (unitsSoldMap[s.product_id] ?? 0) + s.quantity
  }

  const lowStock = products.filter(p => stockStatus(p) !== 'ok')

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
      <div className="space-y-5 max-w-xl mx-auto lg:max-w-none">

        {/* Revenue strip */}
        <div className="metric-strip">
          <div className="metric-cell">
            <span className="metric-value text-gold">{formatCurrency(revenueToday)}</span>
            <span className="metric-label">Today</span>
          </div>
          <div className="metric-cell">
            <span className="metric-value">{formatCurrency(revenueMonth)}</span>
            <span className="metric-label">This month</span>
          </div>
          <div className="metric-cell">
            <span className="metric-value">{salesToday.length}</span>
            <span className="metric-label">Sales today</span>
          </div>
          <div className="metric-cell">
            <span className="metric-value">{salesMonth.length}</span>
            <span className="metric-label">This month</span>
          </div>
        </div>

        {/* Low stock alert */}
        {lowStock.length > 0 && (
          <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
              <span className="text-sm font-semibold text-amber-300">
                {lowStock.length} edition{lowStock.length > 1 ? 's' : ''} need restocking
              </span>
            </div>
            <div className="space-y-1.5">
              {lowStock.map(p => {
                const color = PRODUCT_COLORS[p.sku] ?? '#a0a0a0'
                return (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="edition-dot" style={{ backgroundColor: color }} />
                    <span className="text-xs text-surface-300 flex-1">{getShortName(p.name)}</span>
                    <span className={`text-xs font-bold ${p.stock === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                      {p.stock === 0 ? 'Out' : `${p.stock} left`}
                    </span>
                  </div>
                )
              })}
            </div>
            <Link href="/inventory" className="mt-3 text-xs text-gold font-medium flex items-center gap-1">
              Manage stock →
            </Link>
          </div>
        )}

        {/* Edition stock */}
        <div>
          <p className="section-label">Stock levels</p>
          <div className="card divide-y divide-surface-700 overflow-hidden">
            {products.map(p => {
              const status = stockStatus(p)
              const color  = PRODUCT_COLORS[p.sku] ?? '#a0a0a0'
              const sold   = unitsSoldMap[p.id] ?? 0
              return (
                <div key={p.id} className="list-row">
                  <span className="edition-dot" style={{ backgroundColor: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">{getShortName(p.name)}</p>
                    <p className="text-xs text-surface-500">{sold} sold · {formatCurrency(p.unit_price)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${
                      status === 'out' ? 'text-red-400' :
                      status === 'low' ? 'text-amber-400' :
                      'text-white'
                    }`}>
                      {p.stock}
                    </p>
                    <p className="text-[10px] text-surface-500">units</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Recent sales */}
        {sales.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="section-label mb-0">Recent sales</p>
              <Link href="/sales" className="text-xs text-gold">See all →</Link>
            </div>
            <div className="card divide-y divide-surface-700 overflow-hidden">
              {sales.slice(0, 6).map(sale => {
                const editionColor = getEditionColor(sale.product_name)
                return (
                  <div key={sale.id} className="list-row">
                    <span className="edition-dot" style={{ backgroundColor: editionColor }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{sale.customer_name}</p>
                      <p className="text-xs text-surface-500">{getShortName(sale.product_name)} · ×{sale.quantity}</p>
                    </div>
                    <p className="text-sm font-bold text-gold">{formatCurrency(sale.unit_price * sale.quantity)}</p>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <div className="w-14 h-14 rounded-2xl bg-surface-800 flex items-center justify-center mb-4">
              <ShoppingCart size={24} className="text-surface-500" />
            </div>
            <p className="text-white font-semibold mb-1">No sales yet</p>
            <p className="text-sm text-surface-500 mb-5">Record your first sale to see stats here.</p>
            <Link href="/sales/new" className="btn-primary text-sm px-6">
              <Plus size={16} /> New sale
            </Link>
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
