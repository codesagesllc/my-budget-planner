import ExpenseReport from '@/app/components/ExpenseReport'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Header with back button */}
        <div className="mb-6">
          <Link 
            href="/dashboard"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
        
        {/* Expense Report Component */}
        <ExpenseReport />
      </div>
    </div>
  )
}
