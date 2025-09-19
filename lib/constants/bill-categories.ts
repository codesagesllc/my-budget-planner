export const PLAID_BILL_CATEGORIES = [
  // Subscription Services
  { value: 'subscription', label: 'Subscription', plaidCategory: 'Payment, Subscription' },
  { value: 'streaming', label: 'Streaming Services', plaidCategory: 'Payment, Subscription' },
  { value: 'software', label: 'Software & Apps', plaidCategory: 'Payment, Subscription' },

  // Utilities
  { value: 'electric', label: 'Electric', plaidCategory: 'Payment, Utilities, Electric' },
  { value: 'gas', label: 'Gas & Heating', plaidCategory: 'Payment, Utilities, Gas' },
  { value: 'water', label: 'Water & Sewer', plaidCategory: 'Payment, Utilities, Water' },
  { value: 'internet', label: 'Internet', plaidCategory: 'Payment, Utilities, Internet' },
  { value: 'phone', label: 'Phone', plaidCategory: 'Payment, Utilities, Phone' },
  { value: 'cable', label: 'Cable & TV', plaidCategory: 'Payment, Utilities, Cable' },
  { value: 'trash', label: 'Trash & Recycling', plaidCategory: 'Payment, Utilities, Sanitary' },

  // Housing
  { value: 'rent', label: 'Rent', plaidCategory: 'Payment, Rent' },
  { value: 'mortgage', label: 'Mortgage', plaidCategory: 'Payment, Mortgage' },
  { value: 'hoa', label: 'HOA Fees', plaidCategory: 'Payment, Utilities' },
  { value: 'property_tax', label: 'Property Tax', plaidCategory: 'Transfer, Tax' },
  { value: 'home_insurance', label: 'Home Insurance', plaidCategory: 'Payment, Insurance' },

  // Transportation
  { value: 'auto_loan', label: 'Auto Loan', plaidCategory: 'Payment, Loan' },
  { value: 'auto_insurance', label: 'Auto Insurance', plaidCategory: 'Payment, Insurance' },
  { value: 'parking', label: 'Parking', plaidCategory: 'Transportation, Parking' },
  { value: 'public_transport', label: 'Public Transportation', plaidCategory: 'Transportation, Public' },

  // Insurance
  { value: 'health_insurance', label: 'Health Insurance', plaidCategory: 'Payment, Insurance' },
  { value: 'life_insurance', label: 'Life Insurance', plaidCategory: 'Payment, Insurance' },
  { value: 'dental_insurance', label: 'Dental Insurance', plaidCategory: 'Payment, Insurance' },
  { value: 'vision_insurance', label: 'Vision Insurance', plaidCategory: 'Payment, Insurance' },

  // Financial
  { value: 'credit_card', label: 'Credit Card', plaidCategory: 'Payment, Credit Card' },
  { value: 'personal_loan', label: 'Personal Loan', plaidCategory: 'Payment, Loan' },
  { value: 'student_loan', label: 'Student Loan', plaidCategory: 'Payment, Loan' },
  { value: 'bank_fees', label: 'Bank Fees', plaidCategory: 'Bank Fees' },

  // Healthcare
  { value: 'medical', label: 'Medical Bills', plaidCategory: 'Healthcare, Medical' },
  { value: 'dental', label: 'Dental', plaidCategory: 'Healthcare, Dental' },
  { value: 'vision', label: 'Vision', plaidCategory: 'Healthcare, Vision' },
  { value: 'pharmacy', label: 'Pharmacy', plaidCategory: 'Healthcare, Pharmacy' },

  // Education
  { value: 'tuition', label: 'Tuition', plaidCategory: 'Education' },
  { value: 'daycare', label: 'Daycare', plaidCategory: 'Education, Childcare' },

  // Personal Care
  { value: 'gym', label: 'Gym Membership', plaidCategory: 'Recreation, Fitness' },
  { value: 'salon', label: 'Salon & Spa', plaidCategory: 'Personal Care' },

  // Charity & Donations
  { value: 'charity', label: 'Charity & Donations', plaidCategory: 'Transfer, Charitable' },

  // Government
  { value: 'tax', label: 'Taxes', plaidCategory: 'Transfer, Tax' },
  { value: 'dmv', label: 'DMV Fees', plaidCategory: 'Government' },

  // Other
  { value: 'storage', label: 'Storage Unit', plaidCategory: 'Service' },
  { value: 'membership', label: 'Memberships', plaidCategory: 'Service' },
  { value: 'other', label: 'Other', plaidCategory: 'Other' }
] as const

export type BillCategory = typeof PLAID_BILL_CATEGORIES[number]['value']

export const getBillCategoryLabel = (category: string): string => {
  const found = PLAID_BILL_CATEGORIES.find(cat => cat.value === category)
  return found?.label || category
}

export const getPlaidCategoryForBill = (category: string): string => {
  const found = PLAID_BILL_CATEGORIES.find(cat => cat.value === category)
  return found?.plaidCategory || 'Other'
}

export const findBillCategoryByPlaidCategory = (plaidCategory: string): string => {
  const found = PLAID_BILL_CATEGORIES.find(cat =>
    cat.plaidCategory.toLowerCase().includes(plaidCategory.toLowerCase()) ||
    plaidCategory.toLowerCase().includes(cat.plaidCategory.toLowerCase())
  )
  return found?.value || 'other'
}

export const BILL_CATEGORY_GROUPS = {
  'Housing': ['rent', 'mortgage', 'hoa', 'property_tax', 'home_insurance'],
  'Utilities': ['electric', 'gas', 'water', 'internet', 'phone', 'cable', 'trash'],
  'Transportation': ['auto_loan', 'auto_insurance', 'parking', 'public_transport'],
  'Insurance': ['health_insurance', 'life_insurance', 'dental_insurance', 'vision_insurance'],
  'Financial': ['credit_card', 'personal_loan', 'student_loan', 'bank_fees'],
  'Healthcare': ['medical', 'dental', 'vision', 'pharmacy'],
  'Subscriptions': ['subscription', 'streaming', 'software'],
  'Education': ['tuition', 'daycare'],
  'Personal': ['gym', 'salon'],
  'Other': ['charity', 'tax', 'dmv', 'storage', 'membership', 'other']
} as const