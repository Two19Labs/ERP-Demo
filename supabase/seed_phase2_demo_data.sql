-- Seed Stock Items
insert into public.stock_items (name, category, default_unit, low_stock_threshold, is_active, notes)
values
  ('Tomatoes', 'Vegetables', 'kg', 10.000, true, 'Fresh red tomatoes'),
  ('Onions', 'Vegetables', 'kg', 10.000, true, 'Red onions'),
  ('Paneer', 'Dairy', 'kg', 5.000, true, 'Fresh cottage cheese'),
  ('Cooking Oil', 'Dry Goods', 'litre', 5.000, true, 'Refined sunflower oil'),
  ('Rice', 'Dry Goods', 'kg', 20.000, true, 'Basmati rice'),
  ('Flour', 'Dry Goods', 'kg', 15.000, true, 'Whole wheat flour'),
  ('Chicken', 'Meat / Protein', 'kg', 8.000, true, 'Boneless chicken breast'),
  ('Paper Containers', 'Packaging', 'piece', 100.000, true, 'Takeaway containers'),
  ('Cleaning Liquid', 'Cleaning Supplies', 'litre', 2.000, true, 'All-purpose cleaner')
on conflict (name) do update
set
  category = excluded.category,
  default_unit = excluded.default_unit,
  low_stock_threshold = excluded.low_stock_threshold,
  is_active = excluded.is_active,
  notes = excluded.notes;

-- Seed Vendors
insert into public.vendors (name, contact_name, phone, category_supplied, notes, is_active)
values
  ('Fresh Market Supplier', 'Ramesh Kumar', '+91 9876543210', 'Vegetables', 'Delivers daily morning at 7 AM', true),
  ('Daily Dairy Partner', 'Suresh Singh', '+91 9865432109', 'Dairy', 'Delivers fresh paneer and milk daily', true),
  ('City Dry Goods', 'Amit Patel', '+91 9854321098', 'Dry Goods', 'Bulk grocery supplier', true),
  ('Packaging Depot', 'Rahul Sharma', '+91 9843210987', 'Packaging', 'For boxes and bags', true),
  ('Kitchen Cleaning Supply Co.', 'Vikram Gupta', '+91 9832109876', 'Cleaning Supplies', 'Delivers monthly', true)
on conflict (name) do update
set
  contact_name = excluded.contact_name,
  phone = excluded.phone,
  category_supplied = excluded.category_supplied,
  notes = excluded.notes,
  is_active = excluded.is_active;
