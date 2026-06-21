-- =====================================================
-- AB CARD GAMES — CLEAN SEED (production start)
-- Run this AFTER schema.sql
-- Sets up the 5 products at zero stock — ready to go live.
-- =====================================================

INSERT INTO products (name, sku, description, stock, opening_stock, units_sold, reorder_level, unit_price) VALUES
  ('Say Something Ghana Edition',     'SSG-001', 'The original Ghana-focused edition with local culture, food, music and lifestyle prompts.',  0, 0, 0, 30, 250.00),
  ('Say Something Global Edition',    'SSG-002', 'Globally-inspired edition with universal themes for diverse audiences.',                       0, 0, 0, 25, 150.00),
  ('Say Something Spicy Edition',     'SSG-003', 'Adults-only edition with bold, daring conversation starters.',                                0, 0, 0, 20, 150.00),
  ('Say Something Christian Edition', 'SSG-004', 'Faith-based edition with prompts rooted in Christian values and community.',                  0, 0, 0, 25, 200.00),
  ('Say Something Complete Edition',  'SSG-005', 'Bundle containing all editions — the ultimate Say Something experience.',                     0, 0, 0, 15, 450.00);

-- Once products are created, use the Inventory page to add your opening stock.
-- All orders, customers, and deliveries start at zero — ready for live use.
