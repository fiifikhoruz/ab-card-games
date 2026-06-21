import type { Product, Customer, Sale } from './types'

export const PRODUCTS: Product[] = [
  { id: 'p1', name: 'Say Something Ghana Edition',     sku: 'SSG-001', stock: 0, reorder_level: 30, unit_price: 250 },
  { id: 'p2', name: 'Say Something Global Edition',    sku: 'SSG-002', stock: 0, reorder_level: 25, unit_price: 150 },
  { id: 'p3', name: 'Say Something Spicy Edition',     sku: 'SSG-003', stock: 0, reorder_level: 20, unit_price: 150 },
  { id: 'p4', name: 'Say Something Christian Edition', sku: 'SSG-004', stock: 0, reorder_level: 25, unit_price: 200 },
  { id: 'p5', name: 'Say Something Complete Edition',  sku: 'SSG-005', stock: 0, reorder_level: 15, unit_price: 450 },
]

export const CUSTOMERS: Customer[] = []

export const SALES: Sale[] = []
