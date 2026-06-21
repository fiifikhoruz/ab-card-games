'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { Plus, Package, AlertTriangle, ShoppingCart, Loader2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency, getShortName } from '@/lib/utils'
import { PRODUCT_COLORS } from '@/lib/types'
import type { Product, Sale } from '@/lib/types'

function stockStatus(p: Product): 'ok' | 'low' | 'out' {
  if (p.stock === 0) return 'out'
  if (p.stock <= p.reorder_level) return 'low'
  return 'ok'
}

const STATUS_STYLES = {
  ok:  { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'In Stock'     },
  low: { dot: 'bg-amber-400',   text: 'text-amber-400',   label: 'Low Stock'    },
  out: { dot: 'bg-red-400',     text: 'text-red-400',     label: 'Out of Stock' },
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

  const today      = new Date().toDateString()
  const thisMonth  = new Date().getMonth()
  const thisYear   = new Date().getFullYear()

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

  return (
    <AppLayout
      title="Dashboard"
      subtitle={new Date().toLocaleDateString('en-GH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
    >
      <div className="space-y-5">

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Link href="/sales/new" className="btn-primary py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold">
            <Plus size={18} /> New Sale
          </Link>
          <Link href="/sales?tab=stock" className="btn-secondary py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold">
            <Package size={18} /> Add Stock
          </Link>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card p-4">
            <p className="text-xs text-surface-400 mb-1">Today's Revenue</p>
            <p className="text-xl font-bold text-gold">{formatCurrency(revenueToday)}</p>
            <p className="text-xs text-surface-500 mt-0.5">{salesToday.length} sale{salesToday.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-surface-400 mb-1">This Month</p>
            <p className="text-xl font-bold text-white">{formatCurrency(revenueMonth)}</p>
            <p className="text-xs text-surface-500 mt-0.5">{salesMonth.length} sale{salesMonth.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Product Inventory Cards */}
        <div>
          <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Stock Levels</h2>
          <div className="space-y-2">
            {products.map(p => {
              const status = stockStatus(p)
              const style  = STATUS_STYLES[status]
              const sold   = unitsSoldMap[p.id] ?? 0
              const color  = PRODUCT_COLORS[p.sku] ?? '#D4AF37'
              return (
                <div key={p.id} className="card p-4 flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{getShortName(p.name)}</p>
                    <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${style.text}`}>
                      <span className={`inline-block w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      {style.label}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-white">{p.stock.toLocaleString()} units</p>
                    <p className="text-xs text-surface-400 mt-0.5">{sold} sold</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStock.length > 0 && (
          <div className="card border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={15} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-amber-300">
                {lowStock.length} product{lowStock.length > 1 ? 's' : ''} need restocking
              </h2>
            </div>
            <div className="space-y-1.5">
              {lowStock.map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="text-xs text-surface-300">{getShortName(p.name)}</span>
                  <span className={`text-xs font-semibold ${p.stock === 0 ? 'text-red-400' : 'text-amber-400'}`}>
                    {p.stock === 0 ? 'OUT' : `${p.stock} left`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Sales */}
        {sales.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Recent Sales</h2>
              <Link href="/sales" className="text-xs text-gold">View all →</Link>
            </div>
            <div className="space-y-2">
              {sales.slice(0, 5).map(sale => (
                <div key={sale.id} className="card p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-xs font-bold text-surface-300 flex-shrink-0">
                    {sale.customer_name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{sale.customer_name}</p>
                    <p className="text-xs text-surface-400">{sale.product_name} · ×{sale.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-gold flex-shrink-0">
                    {formatCurrency(sale.unit_price * sale.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="card p-8 text-center">
            <ShoppingCart size={28} className="text-surface-600 mx-auto mb-3" />
            <p className="text-surface-400 text-sm">No sales yet.</p>
            <Link href="/sales/new" className="btn-primary mt-4 inline-flex items-center gap-2 py-2.5 px-5 text-sm">
              <Plus size={16} /> Record First Sale
            </Link>
          </div>
        )}

      </div>
    </AppLayout>
  )
}
