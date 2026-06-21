// =====================================================
// AB CARD GAMES — Types (MVP)
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

// ── UI helpers ──
export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'mobile_money',  label: 'Mobile Money' },
  { value: 'cash',          label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'card_pos',      label: 'Card / POS' },
]

export const PRODUCT_COLORS: Record<string, string> = {
  'SSG-001': '#D4AF37',
  'SSG-002': '#3B82F6',
  'SSG-003': '#EF4444',
  'SSG-004': '#22C55E',
  'SSG-005': '#A855F7',
}
