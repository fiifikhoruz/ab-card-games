-- =====================================================
-- AB CARD GAMES — Pricing fix + disable stock deduction
-- Run this in Supabase → SQL Editor
-- =====================================================

-- 1. STOP SALES FROM DEDUCTING STOCK
--    Stock numbers stay exactly as entered until you re-enable this.
--    (To re-enable later, see the bottom of this file.)
DROP TRIGGER IF EXISTS trg_reduce_stock ON sales;

-- 2. CORRECT PRICING
UPDATE products SET unit_price = 250 WHERE name ILIKE '%ghana%';
UPDATE products SET unit_price = 200 WHERE name ILIKE '%christian%';
UPDATE products SET unit_price = 150 WHERE name ILIKE '%spicy%';
UPDATE products SET unit_price = 150 WHERE name ILIKE '%global%';
UPDATE products SET unit_price = 450 WHERE name ILIKE '%complete%';

-- 3. RESET ANY NEGATIVE STOCK TO ZERO
UPDATE products SET stock = 0 WHERE stock < 0;

-- 4. VERIFY
SELECT sku, name, unit_price, stock, reorder_level
FROM products
ORDER BY sku;

-- =====================================================
-- TO RE-ENABLE AUTOMATIC STOCK DEDUCTION LATER,
-- run this block:
-- =====================================================
-- CREATE TRIGGER trg_reduce_stock
--   AFTER INSERT ON sales
--   FOR EACH ROW EXECUTE FUNCTION reduce_stock_on_sale();
