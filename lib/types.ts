// =====================================================
// AB CARD GAMES — Types
// =====================================================

export type PaymentMethod = 'mobile_money' | 'cash' | 'bank_transfer' | 'card_pos'

export interface Product {
  id: string
  name: string
  sku: string
  stock: number
  reorder_level: number
  unit_price: number
}

export interface Customer {
  id: string
  name: string
  phone?: string
  total_orders: number
  total_spend: number
  last_purchase_date?: string
  created_at: string
}

export interface Sale {
  id: string
  transaction_id?: string
  customer_id?: string
  customer_name: string
  customer_phone?: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  amount_paid: number
  payment_method: PaymentMethod
  sale_date: string
  created_at: string
}

export interface StockAddition {
  id: string
  product_id: string
  product_name: string
  batch_number?: string
  quantity: number
  date_added: string
}

// ── Payment methods ──────────────────────────────────────
// Only Mobile Money and Cash per product spec
export const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'mobile_money', label: 'Mobile Money', icon: '📱' },
  { value: 'cash',         label: 'Cash',         icon: '💵' },
  { value: 'bank_transfer',label: 'Bank Transfer', icon: '🏦' },
  { value: 'card_pos',     label: 'Card / POS',    icon: '💳' },
]

// ── Edition colors (keyed by SKU) ────────────────────────
export const PRODUCT_COLORS: Record<string, string> = {
  'SSG-001': '#ffd700',   // Ghana Edition   — gold
  'SSG-002': '#00bf63',   // Global Edition  — green
  'SSG-003': '#ff3131',   // Spicy Edition   — red
  'SSG-004': '#e8e8e8',   // Complete Edition — white
  'SSG-005': '#8c52ff',   // Christian Edition — purple
}

// Helper: get edition color by product name substring
export function getEditionColor(productName: string): string {
  const n = productName.toLowerCase()
  if (n.includes('ghana'))     return '#ffd700'
  if (n.includes('global'))    return '#00bf63'
  if (n.includes('spicy'))     return '#ff3131'
  if (n.includes('complete'))  return '#e8e8e8'
  if (n.includes('christian')) return '#8c52ff'
  return '#a0a0a0'
}
