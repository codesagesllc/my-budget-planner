-- Migration Script: Migrate from category to categories column
-- This script migrates existing bill data from the single 'category' column to the 'categories' array column
-- Run this in your Supabase SQL editor

-- Step 1: Ensure categories column exists (if not already created)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'bills' 
    AND column_name = 'categories'
  ) THEN
    ALTER TABLE public.bills ADD COLUMN categories jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

-- Step 2: Migrate data from category to categories where categories is empty
UPDATE public.bills
SET categories = 
  CASE 
    WHEN category IS NOT NULL AND category != '' 
    THEN jsonb_build_array(category)
    ELSE '["Other"]'::jsonb
  END
WHERE categories IS NULL OR categories = '[]'::jsonb;

-- Step 3: Update any bills that have a category but empty categories array
UPDATE public.bills
SET categories = jsonb_build_array(category)
WHERE category IS NOT NULL 
  AND category != ''
  AND (categories IS NULL OR categories = '[]'::jsonb);

-- Step 4: Set default for bills with no category at all
UPDATE public.bills
SET categories = '["Other"]'::jsonb
WHERE (categories IS NULL OR categories = '[]'::jsonb)
  AND (category IS NULL OR category = '');

-- Step 5: Optional - Drop the category column after verification
-- IMPORTANT: Only run this after verifying all data has been migrated successfully!
-- Uncomment the line below when ready to drop the column:
-- ALTER TABLE public.bills DROP COLUMN category;

-- Verification Query - Run this to check the migration:
SELECT 
  id,
  name,
  category as old_category,
  categories as new_categories,
  CASE 
    WHEN categories IS NULL OR categories = '[]'::jsonb THEN 'NEEDS MIGRATION'
    ELSE 'OK'
  END as status
FROM public.bills
ORDER BY created_at DESC
LIMIT 20;
