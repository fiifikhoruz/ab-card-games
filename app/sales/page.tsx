'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Link from 'next/link'
import { Plus, Search, ShoppingCart, Package, Loader2, ChevronDown } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency, formatDate, getPaymentLabel, getShortName } from '@/lib/utils'
import type { Sale, Product } from '@/lib/types'
import toast from 'react-hot-toast'

// Group individual sale rows into transactions
interface Transaction {
  id: string          // transaction_id or sale.id for single items
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
      txn.total      += s.unit_price * s.quantity
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

function SalesContent() {
  const searchParams = useSearchParams()
  const defaultTab   = searchParams.get('tab') === 'stock' ? 'stock' : 'sales'
  const supabase     = getSupabaseClient()

  const [tab, setTab]           = useState<'sales' | 'stock'>(defaultTab as 'sales' | 'stock')
  const [sales, setSales]       = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  // Add Stock form
  const [stockProductId, setStockProductId] = useState('')
  const [stockQty, setStockQty]             = useState('')
  const [stockBatch, setStockBatch]         = useState('')
  const [addingStock, setAddingStock]       = useState(false)

  useEffect(() => {
    async function load() {
      const [{ data: salesData }, { data: prodsData }] = await Promise.all([
        supabase.from('sales').select('*').order('sale_date', { ascending: false }),
        supabase.from('products').select('*').order('sku'),
      ])
      if (salesData) setSales(salesData)
      if (prodsData) {
        setProducts(prodsData)
        if (prodsData.length > 0) setStockProductId(prodsData[0].id)
      }
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

  const totalRevenue = filtered.reduce((sum, t) => sum + t.total, 0)

  async function handleAddStock(e: React.FormEvent) {
    e.preventDefault()
    const qty = parseInt(stockQty, 10)
    if (!qty || qty <= 0) { toast.error('Enter a valid quantity'); return }
    if (!stockProductId)  { toast.error('Select a product'); return }

    const product = products.find(p => p.id === stockProductId)
    if (!product) return

    setAddingStock(true)
    const { error } = await supabase.from('stock_additions').insert({
      product_id:   stockProductId,
      product_name: product.name,
      batch_number: stockBatch.trim() || null,
      quantity:     qty,
    })

    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Added ${qty} units to ${getShortName(product.name)}`)
      const { data: updated } = await supabase.from('products').select('*').order('sku')
      if (updated) setProducts(updated)
      setStockQty('')
      setStockBatch('')
    }
    setAddingStock(false)
  }

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
    <AppLayout title="Sales" subtitle={`${transactions.length} transaction${transactions.length !== 1 ? 's' : ''}`}>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface-800 p-1 rounded-xl">
        {(['sales', 'stock'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t ? 'bg-surface-700 text-white' : 'text-surface-400 hover:text-white'
            }`}>
            {t === 'sales' ? 'Sales History' : 'Add Stock'}
          </button>
        ))}
      </div>

      {tab === 'sales' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
              <input type="search" placeholder="Search by customer or edition..." className="input pl-9"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Link href="/sales/new" className="btn-primary py-2.5 px-4 text-sm whitespace-nowrap flex items-center gap-2">
              <Plus size={16} /> New Sale
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="card p-3">
              <p className="text-lg font-bold text-white">{filtered.length}</p>
              <p className="text-xs text-surface-400">Transactions</p>
            </div>
            <div className="card p-3">
              <p className="text-lg font-bold text-gold">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-surface-400">Revenue</p>
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="space-y-2">
              {filtered.map(txn => {
                const isExpanded  = expanded === txn.id
                const multiItem   = txn.items.length > 1
                const hasBalance  = txn.amount_paid < txn.total

                return (
                  <div key={txn.id} className="card overflow-hidden">
                    {/* Header row */}
                    <button
                      className="w-full p-4 flex items-center gap-3 text-left"
                      onClick={() => multiItem && setExpanded(isExpanded ? null : txn.id)}
                    >
                      <div className="w-9 h-9 rounded-full bg-surface-700 flex items-center justify-center text-sm font-bold text-surface-300 flex-shrink-0">
                        {txn.customer_name[0].toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{txn.customer_name}</p>
                        <p className="text-xs text-surface-400 mt-0.5">
                          {multiItem
                            ? `${txn.items.length} editions · ${getPaymentLabel(txn.payment_method)}`
                            : `${txn.items[0].product_name} · ×${txn.items[0].quantity} · ${getPaymentLabel(txn.payment_method)}`
                          }
                        </p>
                        <p className="text-xs text-surface-500 mt-0.5">{formatDate(txn.sale_date)}</p>
                      </div>

                      <div className="text-right flex-shrink-0 flex items-center gap-2">
                        <div>
                          <p className="text-sm font-bold text-gold">{formatCurrency(txn.total)}</p>
                          {hasBalance && (
                            <p className="text-xs text-amber-400 mt-0.5">Paid {formatCurrency(txn.amount_paid)}</p>
                          )}
                        </div>
                        {multiItem && (
                          <ChevronDown size={15} className={`text-surface-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        )}
                      </div>
                    </button>

                    {/* Expanded line items */}
                    {multiItem && isExpanded && (
                      <div className="border-t border-surface-700 px-4 py-3 space-y-2 bg-surface-800/50">
                        {txn.items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-surface-300">{getShortName(item.product_name)} × {item.quantity}</span>
                            <span className="text-white font-medium">{formatCurrency(item.unit_price * item.quantity)}</span>
                          </div>
                        ))}
                        <div className="border-t border-surface-700 pt-2 flex items-center justify-between text-sm font-semibold">
                          <span className="text-surface-300">Total</span>
                          <span className="text-gold">{formatCurrency(txn.total)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <ShoppingCart size={28} className="text-surface-600 mx-auto mb-3" />
              <p className="text-surface-400 text-sm">No sales yet</p>
              <Link href="/sales/new" className="btn-primary mt-4 inline-flex items-center gap-2 py-2.5 px-5 text-sm">
                <Plus size={16} /> Record First Sale
              </Link>
            </div>
          )}
        </div>
      )}

      {tab === 'stock' && (
        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-white mb-4">Add Stock</h2>
            <form onSubmit={handleAddStock} className="space-y-4">
              <div>
                <label className="input-label">Edition</label>
                <select className="input" value={stockProductId}
                  onChange={e => setStockProductId(e.target.value)} required>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{getShortName(p.name)} — {p.stock} in stock</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Quantity *</label>
                  <input type="number" className="input" placeholder="0" min={1}
                    value={stockQty} onChange={e => setStockQty(e.target.value)} required />
                </div>
                <div>
                  <label className="input-label">Batch # (optional)</label>
                  <input type="text" className="input" placeholder="e.g. B2025-01"
                    value={stockBatch} onChange={e => setStockBatch(e.target.value)} />
                </div>
              </div>
              <button type="submit" disabled={addingStock} className="btn-primary w-full justify-center py-3">
                {addingStock ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                {addingStock ? 'Adding…' : 'Add to Inventory'}
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3">Current Stock</h2>
            <div className="space-y-2">
              {products.map(p => {
                const isLow = p.stock <= p.reorder_level
                return (
                  <div key={p.id} className="card p-3 flex items-center justify-between">
                    <span className="text-sm text-white">{getShortName(p.name)}</span>
                    <span className={`text-sm font-bold ${p.stock === 0 ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {p.stock} units
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}

export default function SalesPage() {
  return <Suspense><SalesContent /></Suspense>
}
