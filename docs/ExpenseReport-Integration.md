# ExpenseReport Component Integration Guide

## Quick Start

### 1. Import the Component
```tsx
import ExpenseReport from '@/app/components/ExpenseReport'
```

### 2. Add to Your Dashboard

#### Option A: Standalone Page
Create a new page at `app/dashboard/reports/page.tsx`:

```tsx
import ExpenseReport from '@/app/components/ExpenseReport'

export default function ReportsPage() {
  return (
    <div className="container mx-auto p-6">
      <ExpenseReport />
    </div>
  )
}
```

#### Option B: Add to Existing Dashboard
Update your main dashboard at `app/dashboard/page.tsx`:

```tsx
import ExpenseReport from '@/app/components/ExpenseReport'
// ... other imports

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Existing components */}
      <BillsList bills={bills} />
      
      {/* Add the ExpenseReport component */}
      <ExpenseReport />
      
      {/* Other dashboard components */}
    </div>
  )
}
```

#### Option C: Tabbed Interface
Create a tabbed view for different reports:

```tsx
'use client'
import { useState } from 'react'
import ExpenseReport from '@/app/components/ExpenseReport'
import BillsList from '@/components/BillsList'
import FinancialInsights from '@/components/FinancialInsights'

export default function FinancialDashboard() {
  const [activeTab, setActiveTab] = useState('expenses')
  
  return (
    <div className="container mx-auto p-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('expenses')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'expenses'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Expense Report
          </button>
          <button
            onClick={() => setActiveTab('bills')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'bills'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Bills Management
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'insights'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            AI Insights
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      <div>
        {activeTab === 'expenses' && <ExpenseReport />}
        {activeTab === 'bills' && <BillsList bills={[]} />}
        {activeTab === 'insights' && <FinancialInsights transactions={[]} bills={[]} userId="" />}
      </div>
    </div>
  )
}
```

## Required Setup

### 1. Environment Variables
Ensure your `.env.local` file has the Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Setup
The component requires the following tables to exist:
- `bills` table with categories column (jsonb array)
- `income_sources` table for income data
- Proper RLS policies for user data access

### 3. Authentication
The component requires an authenticated user. Ensure your page is protected:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ProtectedReportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/signin')
  }
  
  return <ExpenseReport />
}
```

## Customization Examples

### 1. Custom Color Scheme
Modify the COLORS array in the component:
```tsx
const COLORS = [
  '#4F46E5', // Indigo
  '#06B6D4', // Cyan
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F97316'  // Orange
]
```

### 2. Add Export Functionality
```tsx
const handleExportPDF = () => {
  // Implement PDF export logic
  window.print() // Simple solution
}

// Add button to component
<button
  onClick={handleExportPDF}
  className="bg-green-600 text-white px-4 py-2 rounded-lg"
>
  Export PDF
</button>
```

### 3. Add Filtering by Category
```tsx
const [selectedCategory, setSelectedCategory] = useState<string>('all')

const filteredBills = selectedCategory === 'all' 
  ? bills 
  : bills.filter(bill => bill.categories?.includes(selectedCategory))
```

## Troubleshooting

### Issue: "Please sign in to view expense reports"
**Solution**: Ensure user is authenticated before rendering the component.

### Issue: Charts not rendering
**Solution**: Check that recharts is properly installed:
```bash
npm install recharts
```

### Issue: No data showing
**Solution**: Verify that:
1. Bills have the `is_active` field set to `true`
2. Bills have proper `categories` array in the database
3. User has bills associated with their `user_id`

### Issue: Incorrect monthly calculations
**Solution**: Ensure billing_cycle field uses correct enum values:
- 'monthly', 'quarterly', 'annual', 'weekly', 'biweekly', 'one-time'

## Performance Tips

1. **Limit Data Fetching**: Consider pagination for users with many bills
2. **Cache Results**: Use React Query or SWR for data caching
3. **Lazy Load**: Import the component dynamically for better initial load:

```tsx
import dynamic from 'next/dynamic'

const ExpenseReport = dynamic(
  () => import('@/app/components/ExpenseReport'),
  { 
    loading: () => <p>Loading report...</p>,
    ssr: false 
  }
)
```

## Next Steps

1. **Add to Navigation**: Update your navigation menu to include a link to the reports page
2. **Set Up Notifications**: Alert users when spending exceeds budget
3. **Create Scheduled Reports**: Set up automated weekly/monthly report emails
4. **Add Data Export**: Implement CSV/Excel export functionality
5. **Mobile App Integration**: Ensure responsive design works on all devices

---

For more detailed documentation, see the main [ExpenseReport.md](./ExpenseReport.md) file.
