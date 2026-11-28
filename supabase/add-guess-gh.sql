-- Add Guess GH only. Existing products, stock and sales remain unchanged.
INSERT INTO public.products (name, sku, stock, reorder_level, unit_price)
VALUES ('Guess GH', 'GGH-001', 105, 10, 250.00)
ON CONFLICT (sku) DO NOTHING;
