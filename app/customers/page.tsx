'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Search, Users, X, ShoppingBag, Loader2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency, formatDate, getPaymentLabel } from '@/lib/utils'
import type { Customer, Sale } from '@/lib/types'

export default function CustomersPage() {
  const supabase = getSupabaseClient()

  const [customers, setCustomers]     = useState<Customer[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [selected, setSelected]       = useState<Customer | null>(null)
  const [history, setHistory]         = useState<Sale[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  useEffect(() => {
    supabase
      .from('customers')
      .select('*')
      .order('last_purchase_date', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        if (data) setCustomers(data)
        setLoading(false)
      })
  }, [])

  async function openCustomer(c: Customer) {
    setSelected(c)
    setHistory([])
    setLoadingHistory(true)
    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('customer_id', c.id)
      .order('sale_date', { ascending: false })
    if (data) setHistory(data)
    setLoadingHistory(false)
  }

  const filtered = customers.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone && c.phone.includes(search))
  )

  if (loading) {
    return (
      <AppLayout title="Customers">
        <div className="flex items-center justify-center py-24">
          <Loader2 size={24} className="animate-spin text-gold" />
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Customers" subtitle={`${customers.length} customers`}>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400" />
        <input
          type="search"
          className="input pl-9"
          placeholder="Search by name or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => openCustomer(c)}
              className="card p-4 w-full text-left flex items-center gap-4 hover:border-surface-600 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center text-sm font-bold text-surface-300 flex-shrink-0">
                {c.name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                <p className="text-xs text-surface-400 mt-0.5">{c.phone ?? 'No phone'}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gold">{formatCurrency(c.total_spend)}</p>
                <p className="text-xs text-surface-400 mt-0.5">{c.total_orders} order{c.total_orders !== 1 ? 's' : ''}</p>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <Users size={28} className="text-surface-600 mx-auto mb-3" />
          <p className="text-surface-400 text-sm">
            {search ? 'No customers found' : 'Customers appear here when you record a sale with a name.'}
          </p>
        </div>
      )}

      {/* Purchase History Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative z-10 w-full max-w-md bg-surface-900 border border-surface-700 rounded-2xl overflow-hidden">

            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700">
              <div>
                <h2 className="font-semibold text-white">{selected.name}</h2>
                <p className="text-xs text-surface-400 mt-0.5">{selected.phone ?? 'No phone'}</p>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost p-1.5">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-px bg-surface-700 border-b border-surface-700">
              {[
                { label: 'Total Spend', value: formatCurrency(selected.total_spend), accent: true },
                { label: 'Orders',      value: String(selected.total_orders) },
                { label: 'Last Order',  value: selected.last_purchase_date ? formatDate(selected.last_purchase_date) : 'Never' },
              ].map(({ label, value, accent }) => (
                <div key={label} className="bg-surface-800 px-4 py-3 text-center">
                  <p className={`text-sm font-bold ${accent ? 'text-gold' : 'text-white'}`}>{value}</p>
                  <p className="text-[10px] text-surface-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            <div className="max-h-72 overflow-y-auto p-4 space-y-2">
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={20} className="animate-spin text-gold" />
                </div>
              ) : history.length > 0 ? (
                history.map(s => (
                  <div key={s.id} className="flex items-center gap-3 py-2 border-b border-surface-800 last:border-0">
                    <ShoppingBag size={14} className="text-surface-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white">{s.product_name}</p>
                      <p className="text-xs text-surface-400">
                        ×{s.quantity} · {getPaymentLabel(s.payment_method)} · {formatDate(s.sale_date)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gold flex-shrink-0">
                      {formatCurrency(s.unit_price * s.quantity)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-center text-surface-500 text-sm py-6">No purchases recorded</p>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
