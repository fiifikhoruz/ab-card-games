import { clsx, type ClassValue } from 'clsx'
import type { PaymentMethod } from './types'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number): string {
  return `GH₵${amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GH', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export function formatTimeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  return formatDate(dateString)
}

export function getPaymentLabel(method: PaymentMethod): string {
  const map: Record<PaymentMethod, string> = {
    mobile_money:  'Mobile Money',
    cash:          'Cash',
    bank_transfer: 'Bank Transfer',
    card_pos:      'Card / POS',
  }
  return map[method]
}

export function getShortName(name: string): string {
  return name.replace('Say Something ', '').replace(' Edition', '')
}
