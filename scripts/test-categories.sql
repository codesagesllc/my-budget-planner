-- Test script to verify the categories feature is working
-- Run this in your Supabase SQL editor to test

-- 1. Check if categories column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bills' 
AND column_name IN ('category', 'categories');

-- 2. View some bills with their categories
SELECT 
  id,
  name,
  amount,
  category,
  categories,
  billing_cycle,
  created_at
FROM public.bills
ORDER BY created_at DESC
LIMIT 10;

-- 3. Test updating an existing bill with multiple categories
-- Replace 'your-bill-id' with an actual bill ID from your database
-- UPDATE public.bills 
-- SET categories = '["Subscription", "Technology", "AI Services"]'::jsonb
-- WHERE id = 'your-bill-id';

-- 4. Query bills by specific category in the array
SELECT name, amount, categories
FROM public.bills
WHERE categories @> '["Technology"]'::jsonb;

-- 5. Count bills by each category (if you want analytics)
SELECT 
  category_value,
  COUNT(*) as bill_count
FROM (
  SELECT 
    jsonb_array_elements_text(categories) as category_value
  FROM public.bills
  WHERE categories IS NOT NULL 
    AND jsonb_array_length(categories) > 0
) as categories_expanded
GROUP BY category_value
ORDER BY bill_count DESC;
