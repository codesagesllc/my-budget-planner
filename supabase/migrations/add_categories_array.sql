-- Add categories array field to bills table
-- This allows multiple categories per bill

-- Add a new column for multiple categories (JSONB array)
ALTER TABLE public.bills 
ADD COLUMN categories JSONB DEFAULT '[]'::jsonb;

-- Migrate existing single category to categories array
UPDATE public.bills 
SET categories = 
  CASE 
    WHEN category IS NOT NULL AND category != '' 
    THEN jsonb_build_array(category)
    ELSE '[]'::jsonb
  END
WHERE categories IS NULL OR categories = '[]'::jsonb;

-- Create an index for better query performance on categories
CREATE INDEX idx_bills_categories ON public.bills USING GIN (categories);

-- Add the same for transactions table if needed
ALTER TABLE public.transactions 
ADD COLUMN categories JSONB DEFAULT '[]'::jsonb;

-- Migrate existing single category to categories array for transactions
UPDATE public.transactions 
SET categories = 
  CASE 
    WHEN category IS NOT NULL AND category != '' 
    THEN jsonb_build_array(category)
    ELSE '[]'::jsonb
  END
WHERE categories IS NULL OR categories = '[]'::jsonb;

-- Create an index for transactions categories
CREATE INDEX idx_transactions_categories ON public.transactions USING GIN (categories);

-- Optional: Keep the old category column for backward compatibility
-- Or you can drop it later after ensuring everything works
-- ALTER TABLE public.bills DROP COLUMN category;
-- ALTER TABLE public.transactions DROP COLUMN category;