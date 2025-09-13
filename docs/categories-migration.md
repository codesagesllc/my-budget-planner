# Bill Categories Migration Guide

## Overview
This guide documents the migration from a single `category` column to a `categories` array column in the bills table. This change allows bills to have multiple categories for better expense tracking and analysis.

## Why This Change?
1. **Better Categorization**: Bills often fit into multiple categories (e.g., "Netflix" is both "Entertainment" and "Subscription")
2. **Improved Analytics**: The expense breakdown pie chart can now show more accurate category distributions
3. **Flexibility**: Users can assign multiple relevant categories to each bill

## Database Changes

### Previous Structure
```sql
bills table:
- category: text (single category)
```

### New Structure
```sql
bills table:
- categories: jsonb (array of categories)
- category: text (deprecated - to be removed)
```

## Migration Steps

### 1. Run Database Migration
Execute the migration script in your Supabase SQL editor:
```sql
-- Location: scripts/migrate-categories.sql
-- This script will:
-- 1. Create categories column if it doesn't exist
-- 2. Migrate existing category data to categories array
-- 3. Set default 'Other' for bills with no category
```

### 2. Verify Migration
Run this query to check the migration status:
```sql
SELECT 
  id,
  name,
  category as old_category,
  categories as new_categories
FROM public.bills
LIMIT 20;
```

### 3. Drop Old Column (Optional)
After verifying all data is migrated:
```sql
ALTER TABLE public.bills DROP COLUMN category;
```

## Code Changes Made

### Components Updated
1. **ManualBillEntry.tsx**
   - Removed `category` field from API calls
   - Only sends `categories` array

2. **BillsList.tsx**
   - Removed fallback to single `category` display
   - Only displays `categories` array

3. **FinancialForecasting.tsx**
   - Updated expense breakdown calculation
   - Distributes amounts across multiple categories
   - Removed `category` field fallback

4. **AITransactionAnalyzer.tsx**
   - Creates bills with `categories` array only

### API Endpoints Updated
1. **`/api/bills/manual`**
   - Only uses `categories` array
   - Sets default `['Other']` if no categories

2. **`/api/bills/[id]`** (PUT)
   - Updates only `categories` array
   - Removed `category` field

3. **`/api/bills/upload`**
   - Converts single category to array
   - Only saves `categories` field

4. **`/api/bills/create-from-ai`**
   - Creates bills with `categories` array only

## Benefits After Migration

### 1. Accurate Expense Tracking
Bills with multiple categories are now properly represented:
- Netflix: `['Entertainment', 'Streaming', 'Subscription']`
- Electric Bill: `['Utilities', 'Housing']`
- Internet: `['Utilities', 'Technology']`

### 2. Better Pie Chart Distribution
The expense breakdown pie chart now:
- Shows all relevant categories
- Distributes bill amounts proportionally
- Provides more granular insights

### 3. Improved Filtering
Future features can filter by any category:
- Show all "Subscription" services
- View all "Technology" expenses
- Track "Housing" related costs

## User Impact
- **No Breaking Changes**: Existing bills continue to work
- **Automatic Migration**: Old single categories are converted to arrays
- **Enhanced Features**: Better categorization and analytics

## Testing Checklist
- [ ] Verify all existing bills display categories correctly
- [ ] Test creating new bills with multiple categories
- [ ] Confirm expense pie chart shows all categories
- [ ] Check bill editing preserves categories
- [ ] Verify AI detection creates proper categories
- [ ] Test bill upload with CSV files

## Rollback Plan
If issues arise, you can restore the category column:
```sql
-- Restore category column from categories array
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS category text;
UPDATE public.bills 
SET category = categories->0 
WHERE categories IS NOT NULL AND jsonb_array_length(categories) > 0;
```

## Future Enhancements
1. **Category Management**: UI for managing custom categories
2. **Smart Suggestions**: AI-powered category recommendations
3. **Category Analytics**: Detailed spending reports by category
4. **Budget by Category**: Set budgets for specific categories

---

*Migration Date: December 2024*
*Version: 2.0*
