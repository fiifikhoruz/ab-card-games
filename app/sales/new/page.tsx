'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Check, Loader2, Plus, Trash2, X } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase'
import { formatCurrency, getShortName } from '@/lib/utils'
import { PAYMENT_METHODS, PRODUCT_COLORS, getEditionColor } from '@/lib/types'
import type { PaymentMethod, Product } from '@/lib/types'
import toast from 'react-hot-toast'

// ── Types ─────────────────────────────────────────────────
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

type Step = 'editions' | 'customer' | 'payment' | 'confirm'

const STEPS: Step[] = ['editions', 'customer', 'payment', 'confirm']

const STEP_LABEL: Record<Step, string> = {
  editions: 'Editions',
  customer: 'Customer',
  payment:  'Payment',
  confirm:  'Confirm',
}

// ── Edition name helper ───────────────────────────────────
const EDITION_SHORT: Record<string, string> = {
  'SSG-001': 'Ghana',
  'SSG-002': 'Global',
  'SSG-003': 'Spicy',
  'SSG-004': 'Complete',
  'SSG-005': 'Christian',
}

// ── Main page ─────────────────────────────────────────────
export default function NewSalePage() {
  const router   = useRouter()
  const supabase = getSupabaseClient()

  const [products, setProducts]           = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [step, setStep]                   = useState<Step>('editions')

  // Line items
  const [lines, setLines] = useState<LineItem[]>([])

  // Customer
  const [customerName, setCustomerName]   = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [saleDate, setSaleDate]           = useState(() => new Date().toISOString().slice(0, 10))

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money')
  const [amountPaid, setAmountPaid]       = useState('')

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.from('products').select('*').order('sku').then(({ data }) => {
      if (data && data.length > 0) {
        setProducts(data)
        setLines([emptyLine(data)])
      }
      setLoadingProducts(false)
    })
  }, [])

  // ── Line helpers ─────────────────────────────────────────
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

  function addLine() { setLines(prev => [...prev, emptyLine(products)]) }
  function removeLine(i: number) { setLines(prev => prev.filter((_, j) => j !== i)) }

  const lineTotal  = (l: LineItem) => (parseInt(l.quantity, 10) || 0) * (parseFloat(l.unitPrice) || 0)
  const grandTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0)
  const paid       = parseFloat(amountPaid) || 0

  // ── Step navigation ──────────────────────────────────────
  function currentStepIndex() { return STEPS.indexOf(step) }

  function canGoNext(): boolean {
    if (step === 'editions') {
      // Only require valid product, qty > 0, price > 0 — stock warning is informational only
      return lines.every(l => l.productId && parseInt(l.quantity, 10) > 0 && parseFloat(l.unitPrice) > 0)
    }
    if (step === 'payment') {
      return true // amount paid optional (defaults to full)
    }
    return true
  }

  function goNext() {
    const idx = currentStepIndex()
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
  }

  function goBack() {
    const idx = currentStepIndex()
    if (idx > 0) setStep(STEPS[idx - 1])
    else router.back()
  }

  // ── Submit ────────────────────────────────────────────────
  async function handleSubmit() {
    setSaving(true)
    try {
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
      router.push('/sales')
    } catch (err: any) {
      toast.error(err?.message ?? 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────
  if (loadingProducts) {
    return (
      <div className="min-h-dvh bg-surface-900 flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-gold" />
      </div>
    )
  }

  const stepIdx  = currentStepIndex()
  const progress = ((stepIdx + 1) / STEPS.length) * 100

  return (
    <div className="min-h-dvh bg-surface-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface-900/95 backdrop-blur-md border-b border-surface-700 flex items-center px-4 h-14">
        <button onClick={goBack} className="btn-ghost p-1.5 -ml-1.5 mr-2">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] font-bold text-white">New sale</h1>
        </div>
        {/* Step indicator */}
        <span className="text-xs text-surface-500">{stepIdx + 1} of {STEPS.length}</span>
      </header>

      {/* Progress bar */}
      <div className="h-0.5 bg-surface-700">
        <div
          className="h-full bg-gold transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Step tabs */}
      <div className="flex border-b border-surface-700 px-4">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => i < stepIdx && setStep(s)}
            className={`flex-1 py-3 text-xs font-medium transition-colors ${
              s === step
                ? 'text-gold border-b-2 border-gold -mb-px'
                : i < stepIdx
                  ? 'text-surface-400 cursor-pointer hover:text-white'
                  : 'text-surface-600 cursor-default'
            }`}
          >
            {STEP_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-5 pb-32">
        <div className="max-w-lg mx-auto space-y-4">

          {/* ── Step: Editions ─────────────────────────── */}
          {step === 'editions' && (
            <>
              {lines.map((line, i) => {
                const product = products.find(p => p.id === line.productId)
                const color   = product ? (PRODUCT_COLORS[product.sku] ?? '#a0a0a0') : '#a0a0a0'
                const tot     = lineTotal(line)
                return (
                  <div key={i} className="card p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs font-semibold text-surface-400">
                          {i === 0 ? 'Edition' : `Edition ${i + 1}`}
                        </span>
                      </div>
                      {lines.length > 1 && (
                        <button onClick={() => removeLine(i)} className="text-surface-500 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Edition picker */}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {products.map(p => {
                        const c      = PRODUCT_COLORS[p.sku] ?? '#a0a0a0'
                        const isSelv = line.productId === p.id
                        const name   = EDITION_SHORT[p.sku] ?? getShortName(p.name)
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => updateLine(i, 'productId', p.id)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                              isSelv
                                ? 'border-transparent'
                                : 'border-surface-700 hover:border-surface-600'
                            }`}
                            style={isSelv ? { borderColor: c, background: `${c}15` } : {}}
                          >
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c }} />
                            <span className={`text-xs font-medium ${isSelv ? 'text-white' : 'text-surface-400'}`}>{name}</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* Qty + Price */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="input-label">Qty</label>
                        <input
                          type="number"
                          className="input"
                          min={1}
                          value={line.quantity}
                          onChange={e => updateLine(i, 'quantity', e.target.value)}
                        />
                        {(() => {
                          const p = products.find(pr => pr.id === line.productId)
                          const qty = parseInt(line.quantity, 10)
                          const avail = p ? Math.max(0, p.stock) : 0
                          if (p && qty > avail) return (
                            <p className="text-xs text-red-400 mt-1">{avail} in stock</p>
                          )
                          if (p) return (
                            <p className="text-xs text-surface-500 mt-1">{avail} available</p>
                          )
                          return null
                        })()}
                      </div>
                      <div>
                        <label className="input-label">Price (GH₵)</label>
                        <input
                          type="number"
                          className="input"
                          min={0}
                          step="0.01"
                          value={line.unitPrice}
                          onChange={e => updateLine(i, 'unitPrice', e.target.value)}
                        />
                      </div>
                    </div>

                    {tot > 0 && (
                      <div className="flex justify-end">
                        <span className="text-xs text-surface-500">
                          Subtotal: <span className="text-gold font-semibold">{formatCurrency(tot)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Add edition */}
              <button
                type="button"
                onClick={addLine}
                className="w-full py-3 rounded-2xl border border-dashed border-surface-600 text-sm text-surface-400 hover:text-white hover:border-surface-500 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Add another edition
              </button>

              {/* Sale date */}
              <div className="card p-4">
                <label className="input-label">Sale date</label>
                <input
                  type="date"
                  className="input"
                  value={saleDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={e => setSaleDate(e.target.value)}
                />
              </div>
            </>
          )}

          {/* ── Step: Customer ─────────────────────────── */}
          {step === 'customer' && (
            <div className="card p-4 space-y-4">
              <p className="text-sm font-semibold text-white">Customer details</p>
              <p className="text-xs text-surface-500 -mt-2">Both fields are optional. Leave blank for a walk-in.</p>
              <div>
                <label className="input-label">Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Walk-in"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="input-label">Phone</label>
                <input
                  type="tel"
                  className="input"
                  placeholder="024 000 0000"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* ── Step: Payment ─────────────────────────── */}
          {step === 'payment' && (
            <div className="space-y-4">
              <div className="card p-4 space-y-3">
                <p className="text-sm font-semibold text-white">Payment method</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setPaymentMethod(m.value)}
                      className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all text-left flex items-center gap-2 ${
                        paymentMethod === m.value
                          ? 'border-gold/40 bg-gold/10 text-gold'
                          : 'border-surface-700 text-surface-400 hover:text-white hover:border-surface-600'
                      }`}
                    >
                      <span>{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-white">Amount paid (GH₵)</p>
                  {grandTotal > 0 && (
                    <button
                      type="button"
                      className="text-xs text-gold font-medium"
                      onClick={() => setAmountPaid(String(grandTotal))}
                    >
                      Full amount
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  className="input"
                  min={0}
                  step="0.01"
                  placeholder={grandTotal > 0 ? formatCurrency(grandTotal) : '0.00'}
                  value={amountPaid}
                  onChange={e => setAmountPaid(e.target.value)}
                />
                {paid > 0 && paid < grandTotal && (
                  <p className="text-xs text-amber-400">
                    Balance outstanding: {formatCurrency(grandTotal - paid)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Step: Confirm ──────────────────────────── */}
          {step === 'confirm' && (
            <div className="space-y-3">
              {/* Items */}
              <div className="card divide-y divide-surface-700 overflow-hidden">
                {lines.map((line, i) => {
                  const p = products.find(pr => pr.id === line.productId)
                  const color = p ? (PRODUCT_COLORS[p.sku] ?? '#a0a0a0') : '#a0a0a0'
                  const name  = p ? (EDITION_SHORT[p.sku] ?? getShortName(p.name)) : 'Unknown'
                  const tot   = lineTotal(line)
                  return (
                    <div key={i} className="list-row">
                      <div className="edition-dot" style={{ backgroundColor: color }} />
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">{name} Edition</p>
                        <p className="text-xs text-surface-500">×{line.quantity} @ {formatCurrency(parseFloat(line.unitPrice))}</p>
                      </div>
                      <p className="text-sm font-bold text-gold">{formatCurrency(tot)}</p>
                    </div>
                  )
                })}
              </div>

              {/* Summary */}
              <div className="card p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-surface-400">Total</span>
                  <span className="font-bold text-gold">{formatCurrency(grandTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Payment</span>
                  <span className="text-white">
                    {PAYMENT_METHODS.find(m => m.value === paymentMethod)?.icon} {PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label}
                  </span>
                </div>
                {amountPaid && (
                  <div className="flex justify-between">
                    <span className="text-surface-400">Paid</span>
                    <span className={`font-semibold ${paid < grandTotal ? 'text-amber-400' : 'text-white'}`}>
                      {formatCurrency(paid)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-surface-700 pt-2 mt-2">
                  <span className="text-surface-400">Customer</span>
                  <span className="text-white">{customerName.trim() || 'Walk-in'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Date</span>
                  <span className="text-white">{saleDate}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Bottom action bar */}
      <div
        className="fixed bottom-0 inset-x-0 bg-surface-900/95 backdrop-blur-md border-t border-surface-700 px-4 py-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-lg mx-auto">
          {step !== 'confirm' ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext()}
              className="btn-primary w-full justify-between py-3.5"
            >
              <span>{STEP_LABEL[STEPS[stepIdx + 1]] ?? 'Next'}</span>
              {grandTotal > 0 && step === 'editions' && (
                <span className="font-bold">{formatCurrency(grandTotal)}</span>
              )}
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="btn-primary w-full justify-center py-3.5"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
              {saving ? 'Saving…' : `Record sale${lines.length > 1 ? ` (${lines.length} items)` : ''}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
