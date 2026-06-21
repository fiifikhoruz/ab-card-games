-- =====================================================
-- AB CARD GAMES — MVP Schema (clean reset)
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop old tables from previous schema (safe to run multiple times)
DROP TABLE IF EXISTS inventory_transactions CASCADE;
DROP TABLE IF EXISTS deliveries            CASCADE;
DROP TABLE IF EXISTS order_items           CASCADE;
DROP TABLE IF EXISTS orders                CASCADE;
DROP TABLE IF EXISTS stock_additions       CASCADE;
DROP TABLE IF EXISTS sales                 CASCADE;
DROP TABLE IF EXISTS customers             CASCADE;
DROP TABLE IF EXISTS products              CASCADE;

-- Drop old functions/triggers if they exist
DROP FUNCTION IF EXISTS reduce_stock_on_sale()        CASCADE;
DROP FUNCTION IF EXISTS increase_stock_on_addition()  CASCADE;
DROP FUNCTION IF EXISTS update_customer_on_sale()     CASCADE;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Products ──────────────────────────────────────
CREATE TABLE products (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  sku           TEXT UNIQUE NOT NULL,
  stock         INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 20,
  unit_price    NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Customers ─────────────────────────────────────
CREATE TABLE customers (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name               TEXT NOT NULL,
  phone              TEXT,
  total_orders       INTEGER NOT NULL DEFAULT 0,
  total_spend        NUMERIC(12,2) NOT NULL DEFAULT 0,
  last_purchase_date TIMESTAMPTZ,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Sales ─────────────────────────────────────────
CREATE TABLE sales (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name  TEXT NOT NULL DEFAULT 'Walk-in',
  customer_phone TEXT,
  product_id     UUID NOT NULL REFERENCES products(id),
  product_name   TEXT NOT NULL,
  quantity       INTEGER NOT NULL CHECK (quantity > 0),
  unit_price     NUMERIC(10,2) NOT NULL,
  amount_paid    NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('mobile_money','cash','bank_transfer','card_pos')),
  sale_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Stock Additions ───────────────────────────────
CREATE TABLE stock_additions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id   UUID NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  batch_number TEXT,
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  date_added   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────
CREATE INDEX idx_sales_product_id  ON sales(product_id);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_sale_date   ON sales(sale_date DESC);
CREATE INDEX idx_stock_product_id  ON stock_additions(product_id);

-- ── Triggers ──────────────────────────────────────

-- Auto-reduce stock on sale
CREATE OR REPLACE FUNCTION reduce_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET stock = stock - NEW.quantity WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reduce_stock
  AFTER INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION reduce_stock_on_sale();

-- Auto-increase stock on addition
CREATE OR REPLACE FUNCTION increase_stock_on_addition()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products SET stock = stock + NEW.quantity WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increase_stock
  AFTER INSERT ON stock_additions
  FOR EACH ROW EXECUTE FUNCTION increase_stock_on_addition();

-- Auto-update customer totals on sale
CREATE OR REPLACE FUNCTION update_customer_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE customers
    SET total_orders       = total_orders + 1,
        total_spend        = total_spend + (NEW.unit_price * NEW.quantity),
        last_purchase_date = NEW.sale_date
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_customer
  AFTER INSERT ON sales
  FOR EACH ROW EXECUTE FUNCTION update_customer_on_sale();

-- ── Row Level Security ────────────────────────────
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales           ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_additions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all" ON products        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON customers       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON sales           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all" ON stock_additions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ── Seed Products ─────────────────────────────────
INSERT INTO products (name, sku, stock, reorder_level, unit_price) VALUES
  ('Say Something Ghana Edition',     'SSG-001', 0, 30, 250.00),
  ('Say Something Global Edition',    'SSG-002', 0, 25, 150.00),
  ('Say Something Spicy Edition',     'SSG-003', 0, 20, 150.00),
  ('Say Something Christian Edition', 'SSG-004', 0, 25, 200.00),
  ('Say Something Complete Edition',  'SSG-005', 0, 15, 450.00);
