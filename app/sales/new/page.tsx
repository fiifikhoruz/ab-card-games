'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import { ChevronLeft, Check, Loader2, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency, getShortName } from '@/lib/utils'
import { PAYMENT_METHODS } from '@/lib/types'
import type { PaymentMethod, Product } from '@/lib/types'
import toast from 'react-hot-toast'

interface LineItem {
  productId: string
  quantity: string
  unitPrice: string
}

function emptyLine(products: Product[]): LineItem {
  return {
    productId: products[0]?.id ?? '',
    quantity:  '1',
    unitPrice: String(products[0]?.unit_price ?? ''),
  }
}

export default function NewSalePage() {
  const router   = useRouter()
  const supabase = getSupabaseClient()

  const [products, setProducts]               = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [customerName, setCustomerName]       = useState('')
  const [customerPhone, setCustomerPhone]     = useState('')
  const [saleDate, setSaleDate]               = useState(() => new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod]     = useState<PaymentMethod>('mobile_money')
  const [amountPaid, setAmountPaid]           = useState('')
  const [lines, setLines]                     = useState<LineItem[]>([])
  const [saving, setSaving]                   = useState(false)

  useEffect(() => {
    supabase.from('products').select('*').order('sku').then(({ data }) => {
      if (data && data.length > 0) {
        setProducts(data)
        setLines([emptyLine(data)])
      }
      setLoadingProducts(false)
    })
  }, [])

  // ── Line item helpers ──────────────────────────
  function updateLine(index: number, field: keyof LineItem, value: string) {
    setLines(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      if (field === 'productId') {
        const p = products.find(pr => pr.id === value)
        if (p) next[index].unitPrice = String(p.unit_price)
      }
      return next
    })
  }

  function addLine() {
    setLines(prev => [...prev, emptyLine(products)])
  }

  function removeLine(index: number) {
    setLines(prev => prev.filter((_, i) => i !== index))
  }

  // ── Totals ─────────────────────────────────────
  const lineTotal = (line: LineItem) =>
    (parseInt(line.quantity, 10) || 0) * (parseFloat(line.unitPrice) || 0)

  const grandTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0)
  const paid       = parseFloat(amountPaid) || 0

  // ── Submit ─────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.productId)                    { toast.error(`Item ${i + 1}: select an edition`); return }
      if (!(parseInt(line.quantity, 10) > 0)) { toast.error(`Item ${i + 1}: enter a valid quantity`); return }
      if (!(parseFloat(line.unitPrice) > 0))  { toast.error(`Item ${i + 1}: enter a valid price`); return }
    }

    setSaving(true)
    try {
      // Upsert customer
      let customerId: string | null = null
      if (customerName.trim()) {
        const phone = customerPhone.trim() || null
        let existingId: string | null = null

        if (phone) {
          const { data } = await supabase.from('customers').select('id').eq('phone', phone).maybeSingle()
          existingId = data?.id ?? null
        }
        if (!existingId) {
          const { data } = await supabase.from('customers').select('id').ilike('name', customerName.trim()).maybeSingle()
          existingId = data?.id ?? null
        }

        if (existingId) {
          customerId = existingId
        } else {
          const { data, error } = await supabase
            .from('customers')
            .insert({ name: customerName.trim(), phone: customerPhone.trim() || null })
            .select('id').single()
          if (error) throw error
          customerId = data.id
        }
      }

      // One transaction_id shared across all line items
      const txnId      = crypto.randomUUID()
      const saleDateISO = new Date(saleDate + 'T12:00:00').toISOString()
      const rows = lines.map(line => {
        const product  = products.find(p => p.id === line.productId)!
        const qty      = parseInt(line.quantity, 10)
        const price    = parseFloat(line.unitPrice)
        const lineTot  = qty * price
        const thisPaid = grandTotal > 0 ? (paid || grandTotal) * (lineTot / grandTotal) : lineTot

        return {
          transaction_id: txnId,
          customer_id:    customerId,
          customer_name:  customerName.trim() || 'Walk-in',
          customer_phone: customerPhone.trim() || null,
          product_id:     line.productId,
          product_name:   product.name,
          quantity:       qty,
          unit_price:     price,
          amount_paid:    Math.round(thisPaid * 100) / 100,
          payment_method: paymentMethod,
          sale_date:      saleDateISO,
        }
      })

      const { error } = await supabase.from('sales').insert(rows)
      if (error) throw error

      toast.success(`${rows.length > 1 ? `${rows.length} items` : 'Sale'} recorded!`)
      router.push('/')
    } catch (err: any) {
      toast.error(err?.message ?? 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout title="New Sale">
      <div className="max-w-lg mx-auto">

        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-surface-400 hover:text-white mb-5">
          <ChevronLeft size={16} /> Dashboard
        </Link>

        {loadingProducts ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={24} className="animate-spin text-gold" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Customer */}
            <div className="card p-4 space-y-3">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Customer</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Name <span className="text-surface-500">(optional)</span></label>
                  <input type="text" className="input" placeholder="Walk-in"
                    value={customerName} onChange={e => setCustomerName(e.target.value)} />
                </div>
                <div>
                  <label className="input-label">Phone <span className="text-surface-500">(optional)</span></label>
                  <input type="tel" className="input" placeholder="024 000 0000"
                    value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="input-label">Sale Date</label>
                <input
                  type="date"
                  className="input"
                  value={saleDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={e => setSaleDate(e.target.value)}
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="card p-4 space-y-3">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Editions</p>

              {lines.map((line, i) => {
                const tot = lineTotal(line)
                return (
                  <div key={i} className="space-y-2">
                    {i > 0 && <div className="border-t border-surface-700 pt-3" />}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-surface-500">Item {i + 1}</span>
                      {lines.length > 1 && (
                        <button type="button" onClick={() => removeLine(i)}
                          className="text-surface-500 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <select
                      className="input"
                      value={line.productId}
                      onChange={e => updateLine(i, 'productId', e.target.value)}
                      required
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {getShortName(p.name)} — {formatCurrency(p.unit_price)} ({p.stock} in stock)
                        </option>
                      ))}
                    </select>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="input-label">Quantity</label>
                        <input type="number" className="input" min={1}
                          value={line.quantity}
                          onChange={e => updateLine(i, 'quantity', e.target.value)}
                          required />
                      </div>
                      <div>
                        <label className="input-label">Unit Price (GH₵)</label>
                        <input type="number" className="input" min={0} step="0.01"
                          value={line.unitPrice}
                          onChange={e => updateLine(i, 'unitPrice', e.target.value)}
                          required />
                      </div>
                    </div>

                    {tot > 0 && (
                      <div className="flex justify-end">
                        <span className="text-xs text-surface-400">Subtotal: <span className="text-gold font-semibold">{formatCurrency(tot)}</span></span>
                      </div>
                    )}
                  </div>
                )
              })}

              <button
                type="button"
                onClick={addLine}
                className="w-full py-2.5 rounded-xl border border-dashed border-surface-600 text-sm text-surface-400 hover:text-white hover:border-surface-500 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={15} /> Add another edition
              </button>
            </div>

            {/* Grand Total */}
            {grandTotal > 0 && (
              <div className="bg-surface-800 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-surface-400">Total{lines.length > 1 ? ` (${lines.length} items)` : ''}</span>
                <span className="text-lg font-bold text-gold">{formatCurrency(grandTotal)}</span>
              </div>
            )}

            {/* Payment */}
            <div className="card p-4 space-y-3">
              <p className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Payment</p>

              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map(m => (
                  <button key={m.value} type="button" onClick={() => setPaymentMethod(m.value)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all text-left ${
                      paymentMethod === m.value
                        ? 'bg-gold/15 border-gold/40 text-gold'
                        : 'bg-surface-800 border-surface-700 text-surface-400 hover:text-white'
                    }`}>
                    {m.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="input-label">
                  Amount Paid (GH₵)
                  {grandTotal > 0 && (
                    <button type="button" className="ml-2 text-xs text-gold underline"
                      onClick={() => setAmountPaid(String(grandTotal))}>
                      Full amount
                    </button>
                  )}
                </label>
                <input type="number" className="input" min={0} step="0.01"
                  placeholder={grandTotal > 0 ? String(grandTotal) : '0.00'}
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)} />
                {paid > 0 && paid < grandTotal && (
                  <p className="text-xs text-amber-400 mt-1.5">
                    Balance outstanding: {formatCurrency(grandTotal - paid)}
                  </p>
                )}
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={saving}
              className="btn-primary w-full justify-center py-3.5 text-base">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {saving ? 'Saving…' : `Record Sale${lines.length > 1 ? ` (${lines.length} items)` : ''}`}
            </button>

          </form>
        )}
      </div>
    </AppLayout>
  )
}
