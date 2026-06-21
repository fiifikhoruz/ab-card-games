'use client'

import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { Search, Users, X, Loader2 } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency, formatDate, getShortName } from '@/lib/utils'
import { getEditionColor } from '@/lib/types'
import type { Customer, Sale } from '@/lib/types'

const PAYMENT_ICONS: Record<string, string> = {
  mobile_money:  '📱',
  cash:          '💵',
  bank_transfer: '🏦',
  card_pos:      '💳',
}

export default function CustomersPage() {
  const supabase = getSupabaseClient()

  const [customers, setCustomers]           = useState<Customer[]>([])
  const [loading, setLoading]               = useState(true)
  const [search, setSearch]                 = useState('')
  const [selected, setSelected]             = useState<Customer | null>(null)
  const [history, setHistory]               = useState<Sale[]>([])
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
    <AppLayout title="Customers" subtitle={`${customers.length} customer${customers.length !== 1 ? 's' : ''}`}>
      <div className="space-y-4 max-w-xl mx-auto lg:max-w-none">

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-surface-500 pointer-events-none" />
          <input
            type="search"
            className="input pl-10"
            placeholder="Search by name or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Customer list */}
        {filtered.length > 0 ? (
          <div className="card divide-y divide-surface-700 overflow-hidden">
            {filtered.map(c => {
              const initials = c.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
              return (
                <button
                  key={c.id}
                  onClick={() => openCustomer(c)}
                  className="w-full list-row text-left"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-surface-600 flex items-center justify-center text-xs font-bold text-surface-300 flex-shrink-0">
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {c.phone ?? 'No phone'} · {c.total_orders} order{c.total_orders !== 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Spend */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gold">{formatCurrency(c.total_spend)}</p>
                    {c.last_purchase_date && (
                      <p className="text-[10px] text-surface-500 mt-0.5">{formatDate(c.last_purchase_date)}</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="empty-state">
            <div className="w-14 h-14 rounded-2xl bg-surface-800 flex items-center justify-center mb-4">
              <Users size={24} className="text-surface-500" />
            </div>
            <p className="text-white font-semibold mb-1">
              {search ? 'No results' : 'No customers yet'}
            </p>
            <p className="text-sm text-surface-500">
              {search
                ? 'Try a different name or phone number.'
                : 'Customers appear here when you record a sale with a name.'}
            </p>
          </div>
        )}
      </div>

      {/* Customer detail sheet */}
      {selected && (
        <div className="sheet-overlay" onClick={() => setSelected(null)}>
          <div className="sheet-panel" onClick={e => e.stopPropagation()}>
            <div className="sheet-handle" />

            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-4 pb-4">
              <div className="w-11 h-11 rounded-full bg-surface-600 flex items-center justify-center text-sm font-bold text-surface-300 flex-shrink-0">
                {selected.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white">{selected.name}</p>
                <p className="text-xs text-surface-500">
                  {selected.phone
                    ? <a href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`} className="text-wa">
                        {selected.phone}
                      </a>
                    : 'No phone'}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost p-1.5">
                <X size={18} />
              </button>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-px bg-surface-700 border-y border-surface-700">
              <div className="bg-surface-800 px-4 py-3 text-center">
                <p className="text-base font-bold text-gold">{formatCurrency(selected.total_spend)}</p>
                <p className="text-[10px] text-surface-500 mt-0.5">Total spend</p>
              </div>
              <div className="bg-surface-800 px-4 py-3 text-center">
                <p className="text-base font-bold text-white">{selected.total_orders}</p>
                <p className="text-[10px] text-surface-500 mt-0.5">Orders</p>
              </div>
              <div className="bg-surface-800 px-4 py-3 text-center">
                <p className="text-base font-bold text-white">
                  {selected.last_purchase_date ? formatDate(selected.last_purchase_date) : '—'}
                </p>
                <p className="text-[10px] text-surface-500 mt-0.5">Last order</p>
              </div>
            </div>

            {/* Purchase history */}
            <div className="max-h-72 overflow-y-auto">
              {loadingHistory ? (
                <div className="flex justify-center py-10">
                  <Loader2 size={20} className="animate-spin text-gold" />
                </div>
              ) : history.length > 0 ? (
                <div className="divide-y divide-surface-700">
                  {history.map(s => {
                    const editionColor = getEditionColor(s.product_name)
                    const payIcon = PAYMENT_ICONS[s.payment_method] ?? '💳'
                    return (
                      <div key={s.id} className="list-row">
                        <div className="edition-dot" style={{ backgroundColor: editionColor }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">{getShortName(s.product_name)}</p>
                          <p className="text-xs text-surface-500">
                            ×{s.quantity} · {payIcon} · {formatDate(s.sale_date)}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-gold">{formatCurrency(s.unit_price * s.quantity)}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-10 text-center">
                  <p className="text-sm text-surface-500">No purchases recorded</p>
                </div>
              )}
            </div>

            <div className="h-6" />
          </div>
        </div>
      )}
    </AppLayout>
  )
}
