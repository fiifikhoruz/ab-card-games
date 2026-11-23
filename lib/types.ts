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

// NOTE: Edition colours and names are resolved from the product NAME via
// getEditionInfo() below — never from the SKU. SKU→name assumptions drift
// from the database and caused mislabelled editions previously.

// Helper: get edition color by product name substring
export function getEditionColor(productName: string): string {
  return getEditionInfo(productName).color
}

// Full edition info for badges and cards
export interface EditionInfo {
  name:      string
  color:     string  // background / accent
  textColor: string  // label text on that background
  sku:       string
}

export function getEditionInfo(productName: string): EditionInfo {
  const n = productName.toLowerCase()
  if (/guess[\s_-]*gh\b/i.test(productName)) return { name: 'Guess GH', color: '#ffd700', textColor: '#000000', sku: 'GGH-001' }
  if (n.includes('ghana'))     return { name: 'Ghana',     color: '#ffd700', textColor: '#000000', sku: 'SSG-001' }
  if (n.includes('global'))    return { name: 'Global',    color: '#00bf63', textColor: '#ffffff', sku: 'SSG-002' }
  if (n.includes('spicy'))     return { name: 'Spicy',     color: '#ff3131', textColor: '#ffffff', sku: 'SSG-003' }
  if (n.includes('complete'))  return { name: 'Complete',  color: '#e8e8e8', textColor: '#000000', sku: 'SSG-004' }
  if (n.includes('christian')) return { name: 'Christian', color: '#8c52ff', textColor: '#ffffff', sku: 'SSG-005' }
  return { name: productName,  color: '#a0a0a0', textColor: '#ffffff', sku: '' }
}

export function isGuessGH(product: Pick<Product, 'name' | 'sku'>): boolean {
  return product.sku === 'GGH-001' || /guess[\s_-]*gh\b/i.test(product.name)
}
