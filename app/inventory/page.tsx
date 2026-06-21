'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Plus, X, Package, Loader2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency, getShortName } from '@/lib/utils'
import { PRODUCT_COLORS } from '@/lib/types'
import type { Product } from '@/lib/types'
import toast from 'react-hot-toast'

const EDITION_SHORT: Record<string, string> = {
  'SSG-001': 'Ghana',
  'SSG-002': 'Global',
  'SSG-003': 'Spicy',
  'SSG-004': 'Complete',
  'SSG-005': 'Christian',
}

function stockStatus(p: Product): 'ok' | 'low' | 'out' {
  if (p.stock === 0) return 'out'
  if (p.stock <= p.reorder_level) return 'low'
  return 'ok'
}

export default function InventoryPage() {
  const supabase = getSupabaseClient()

  const [products, setProducts]         = useState<Product[]>([])
  const [loading, setLoading]           = useState(true)
  const [sheetProduct, setSheetProduct] = useState<Product | null>(null)
  const [qty, setQty]                   = useState('')
  const [batch, setBatch]               = useState('')
  const [saving, setSaving]             = useState(false)

  useEffect(() => {
    supabase.from('products').select('*').order('sku').then(({ data }) => {
      if (data) setProducts(data)
      setLoading(false)
    })
  }, [])

  function openSheet(p: Product) { setSheetProduct(p); setQty(''); setBatch('') }
  function closeSheet()          { setSheetProduct(null) }

  async function handleAddStock(e: React.FormEvent) {
    e.preventDefault()
    const quantity = parseInt(qty, 10)
    if (!quantity || quantity <= 0) { toast.error('Enter a valid quantity'); return }
    if (!sheetProduct) return
    setSaving(true)
    const { error } = await supabase.from('stock_additions').insert({
      product_id:   sheetProduct.id,
      product_name: sheetProduct.name,
      batch_number: batch.trim() || null,
      quantity,
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success(`Added ${quantity} units to ${getShortName(sheetProduct.name)}`)
      const { data } = await supabase.from('products').select('*').order('sku')
      if (data) setProducts(data)
      closeSheet()
    }
    setSaving(false)
  }

  const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
  const alertCount = products.filter(p => stockStatus(p) !== 'ok').length

  if (loading) {
    return (
      <AppLayout title="Inventory">
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-gold" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Inventory" subtitle={`${totalStock} units · ${products.length} editions`}>
      <div className="space-y-4 max-w-xl mx-auto lg:max-w-none">

        {/* Summary strip */}
        <div className="metric-strip">
          <div className="metric-cell" style={{ gridColumn: 'span 2' }}>
            <span className="metric-value">{totalStock}</span>
            <span className="metric-label">Total units</span>
          </div>
          <div className="metric-cell" style={{ gridColumn: 'span 2' }}>
            {alertCount > 0 ? (
              <>
                <span className="metric-value text-amber-400">{alertCount}</span>
                <span className="metric-label">Need restocking</span>
              </>
            ) : (
              <>
                <span className="metric-value" style={{ color: '#00bf63' }}>All good</span>
                <span className="metric-label">Stock health</span>
              </>
            )}
          </div>
        </div>

        {/* Edition rows */}
        <div className="card divide-y divide-surface-700 overflow-hidden">
          {products.map(p => {
            const status = stockStatus(p)
            const color  = PRODUCT_COLORS[p.sku] ?? '#a0a0a0'
            const name   = EDITION_SHORT[p.sku] ?? getShortName(p.name)

            return (
              <div key={p.id} className="list-row">
                {/* Color bar */}
                <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-white">{name} Edition</p>
                    {status === 'out' && (
                      <span className="badge text-red-400" style={{ background: 'rgba(239,68,68,0.12)' }}>Out</span>
                    )}
                    {status === 'low' && (
                      <span className="badge text-amber-400" style={{ background: 'rgba(245,158,11,0.12)' }}>Low</span>
                    )}
                  </div>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {formatCurrency(p.unit_price)} · reorder at {p.reorder_level}
                  </p>
                </div>

                {/* Count */}
                <div className="text-right mr-3">
                  <p className={`text-lg font-bold tabular-nums leading-none ${
                    status === 'out' ? 'text-red-400' :
                    status === 'low' ? 'text-amber-400' :
                    'text-white'
                  }`}>
                    {p.stock}
                  </p>
                  <p className="text-[10px] text-surface-500">units</p>
                </div>

                {/* Add stock */}
                <button
                  onClick={() => openSheet(p)}
                  className="w-9 h-9 flex-shrink-0 rounded-xl bg-surface-700 hover:bg-surface-600 flex items-center justify-center transition-colors"
                  aria-label={`Add stock for ${name}`}
                >
                  <Plus size={16} className="text-surface-300" />
                </button>
              </div>
            )
          })}
        </div>

        {products.length === 0 && (
          <div className="empty-state">
            <Package size={28} className="text-surface-500 mb-3" />
            <p className="text-surface-400 text-sm">No products found.</p>
          </div>
        )}
      </div>

      {/* Add stock bottom sheet */}
      {sheetProduct && (
        <div className="sheet-overlay" onClick={closeSheet}>
          <div className="sheet-panel" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PRODUCT_COLORS[sheetProduct.sku] ?? '#a0a0a0' }} />
                <div>
                  <p className="text-base font-bold text-white">
                    Add stock — {EDITION_SHORT[sheetProduct.sku] ?? getShortName(sheetProduct.name)}
                  </p>
                  <p className="text-xs text-surface-500">{sheetProduct.stock} in stock now</p>
                </div>
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
                  value={qty}
                  onChange={e => setQty(e.target.value)}
                  autoFocus
                  required
                />
                {qty && parseInt(qty) > 0 && (
                  <p className="text-xs text-surface-500 mt-1.5">
                    New total: <span className="text-white font-semibold">{sheetProduct.stock + parseInt(qty)} units</span>
                  </p>
                )}
              </div>
              <div>
                <label className="input-label">Batch number <span className="text-surface-600 normal-case font-normal">(optional)</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. B2026-01"
                  value={batch}
                  onChange={e => setBatch(e.target.value)}
                />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-3.5">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {saving ? 'Adding…' : 'Confirm'}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
