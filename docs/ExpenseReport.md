# ExpenseReport Component Documentation

## Overview
The `ExpenseReport` component is a comprehensive financial analysis tool that provides visual insights into bills, spending patterns, and financial forecasts. It integrates with the Supabase backend to fetch real-time data and presents it through interactive charts and tables.

## Location
`app/components/ExpenseReport.tsx`

## Features

### 1. **Data Fetching and Processing**
- Fetches data from the `bills` and `income_sources` tables in Supabase
- Processes bills by category, handling multiple categories per bill
- Calculates monthly amounts for different billing cycles (weekly, biweekly, monthly, quarterly, annual)
- Provides real-time data synchronization with the database

### 2. **Time Period Selection**
- **Last 30 Days**: Shows data from the past 30 days
- **This Month**: Current calendar month data
- **Last 6 Months**: Historical data for trend analysis

### 3. **Visualizations**

#### Category Breakdown Chart (Bar Chart)
- Displays total spending per category
- Color-coded bars for easy differentiation
- Responsive design with custom tooltips
- Shows actual dollar amounts on hover

#### Budget Burndown Chart (Line Chart)
- Compares ideal spending rate vs actual spending
- Shows remaining budget over time
- Helps identify spending patterns and potential overspending
- Dual-line visualization with:
  - Ideal spending line (dashed green)
  - Actual remaining budget (solid blue)

#### Income Percentage Chart (Pie Chart)
- Visual breakdown of how income is allocated across categories
- Shows percentage of total income per category
- Interactive tooltips with exact percentages
- Color-coded legend for easy reference

#### Spending Forecast Table
- Projects future spending for 30, 60, and 90 days
- Based on historical averages with 2% monthly growth assumption
- Category-wise breakdown with totals
- Helps with budget planning and financial decision-making

### 4. **Summary Statistics**
- **Total Monthly Bills**: Sum of all active bill amounts
- **Monthly Income**: Total income from all sources
- **Net Monthly**: Surplus or deficit calculation

## Dependencies
```json
{
  "recharts": "^2.12.7",
  "date-fns": "^3.6.0",
  "@supabase/supabase-js": "^2.45.0",
  "lucide-react": "^0.453.0"
}
```

## Database Schema Requirements

### Bills Table
```sql
- id: uuid
- user_id: uuid (foreign key to users)
- name: text
- amount: numeric
- due_date: timestamp
- categories: jsonb (array of strings)
- billing_cycle: enum ('monthly', 'quarterly', 'annual', 'weekly', 'biweekly', 'one-time')
- is_active: boolean
```

### Income Sources Table
```sql
- id: uuid
- user_id: uuid (foreign key to users)
- name: text
- amount: numeric
- frequency: enum ('monthly', 'biweekly', 'weekly', 'quarterly', 'annual', 'one-time')
- is_active: boolean
- start_date: date (optional)
- end_date: date (optional)
```

## Usage

### Basic Implementation
```tsx
import ExpenseReport from '@/app/components/ExpenseReport'

export default function DashboardPage() {
  return (
    <div className="container mx-auto p-6">
      <ExpenseReport />
    </div>
  )
}
```

### Integration with Existing Dashboard
```tsx
// In your dashboard layout
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  <BillsList bills={bills} />
  <ExpenseReport />
</div>
```

## Component Architecture

### State Management
- `bills`: Array of active bills from database
- `incomes`: Array of active income sources
- `timePeriod`: Selected time range for analysis
- `loading`: Loading state indicator
- `error`: Error handling state

### Key Functions

#### `getMonthlyAmount(amount, cycle)`
Converts different billing cycles to monthly equivalent:
- Weekly: amount × 4.33
- Biweekly: amount × 2.17
- Quarterly: amount ÷ 3
- Annual: amount ÷ 12

#### `getDateRange()`
Returns start and end dates based on selected time period

#### `categoryData`
Processes bills to calculate total spending per category

#### `burndownData`
Generates daily burndown chart data points

#### `forecastData`
Projects future spending using growth rate calculations

## Styling
- Uses Tailwind CSS for responsive design
- Color palette: Blue, Green, Purple, Orange gradients
- Consistent spacing and typography
- Mobile-responsive with proper breakpoints
- Custom chart colors using COLORS array

## Performance Optimizations
- Uses `useMemo` for expensive calculations
- Caches derived data to prevent unnecessary recalculations
- Efficient data processing with single-pass algorithms
- Responsive container for optimal chart rendering

## Error Handling
- Graceful error display with user-friendly messages
- Loading states with spinner animation
- Authentication check before data fetching
- Null/undefined data handling

## Future Enhancements
1. **Export Functionality**: Add ability to export reports as PDF/CSV
2. **Custom Date Ranges**: Allow users to select specific date ranges
3. **Savings Goals Integration**: Compare spending against savings targets
4. **Trend Analysis**: Add year-over-year comparison
5. **Budget Alerts**: Notify when spending exceeds thresholds
6. **Category Customization**: Allow users to create custom categories
7. **AI Insights**: Integrate with AI analysis for spending recommendations

## Testing Considerations
- Mock Supabase client for unit tests
- Test different billing cycle calculations
- Verify chart rendering with various data sets
- Test responsive design on multiple devices
- Validate forecast calculations accuracy

## Accessibility
- Proper semantic HTML structure
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader friendly tooltips
- High contrast color choices

## Security Considerations
- User authentication required
- Row-level security in Supabase
- No sensitive data in client-side state
- Secure API calls with proper error handling

---

*Last Updated: Current Version*
*Component Version: 1.0.0*
