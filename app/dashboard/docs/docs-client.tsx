'use client'

import React, { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { ArrowLeft, FileText, Download, ExternalLink, BookOpen, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DocsClientProps {
  user: User
}

interface DocumentItem {
  id: string
  title: string
  description: string
  category: string
  content?: string
  downloadUrl?: string
}

export function DocsClient({ user }: DocsClientProps) {
  const router = useRouter()
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Sample documentation items - you can expand this or fetch from an API
  const documents: DocumentItem[] = [
    {
      id: 'getting-started',
      title: 'Getting Started Guide',
      description: 'Learn how to set up your budget planner and connect your accounts',
      category: 'Setup',
      content: `# Getting Started with PocketWiseAI

Welcome to PocketWiseAI! This guide will help you get started with your AI-powered budget planner.

## Step 1: Connect Your Accounts
Use the Plaid integration to securely connect your bank accounts for automatic transaction importing.

## Step 2: Set Up Your Income Sources
Add your regular income sources including salary, freelance work, and other recurring income.

## Step 3: Add Your Bills
Upload your bills via CSV/Excel or add them manually to track your expenses.

## Step 4: Review Your Financial Overview
Check your dashboard for insights into your spending patterns and financial health.

## Step 5: Set Up Budget Limits
Configure spending limits for different categories to stay on track.

## Tips for Success
- Review your transactions regularly
- Update your income sources when they change
- Use the AI insights to optimize your budget
- Set realistic savings goals`
    },
    {
      id: 'connecting-accounts',
      title: 'Connecting Bank Accounts',
      description: 'Step-by-step guide for connecting your bank accounts securely',
      category: 'Setup',
      content: `# Connecting Bank Accounts

Learn how to securely connect your bank accounts using Plaid integration.

## What is Plaid?
Plaid is a secure financial technology company that connects your bank accounts to PocketWiseAI safely.

## How to Connect
1. Click "Add Account" in your dashboard
2. Search for your bank
3. Enter your online banking credentials
4. Select accounts to connect
5. Confirm the connection

## Security
- Your credentials are encrypted and never stored
- Plaid uses bank-level security
- You can disconnect accounts anytime

## Supported Banks
Most major banks and credit unions are supported including:
- Chase, Bank of America, Wells Fargo
- Credit unions and regional banks
- Online banks like Ally and Capital One`
    },
    {
      id: 'ai-features',
      title: 'AI Features Guide',
      description: 'Understanding and using the AI-powered features',
      category: 'Features',
      content: `# AI Features in PocketWiseAI

Discover how artificial intelligence helps optimize your finances.

## Bill Detection
AI automatically detects recurring bills in your transactions and suggests creating bill entries.

## Income Analysis
Smart analysis of your income patterns to help with budgeting and forecasting.

## Spending Insights
Get personalized insights about your spending habits and suggestions for improvement.

## Budget Forecasting
AI-powered predictions of your future financial situation based on current trends.

## Smart Categorization
Automatic categorization of transactions using machine learning.

## Debt Strategies
AI-recommended strategies for paying off debt efficiently.`
    },
    {
      id: 'privacy-security',
      title: 'Privacy & Security',
      description: 'How we protect your financial data',
      category: 'Security',
      content: `# Privacy & Security

Your financial data security is our top priority.

## Data Encryption
- All data is encrypted in transit and at rest
- Bank-grade 256-bit encryption
- Secure API connections

## Data Access
- We never see your banking credentials
- Read-only access to your accounts
- You control what data is shared

## Privacy Policy
- We don't sell your data
- No third-party advertising
- Transparent data usage

## Account Security
- Two-factor authentication available
- Regular security audits
- Immediate breach notifications

## Your Rights
- Export your data anytime
- Delete your account and data
- Control data sharing preferences`
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting Guide',
      description: 'Common issues and solutions',
      category: 'Support',
      content: `# Troubleshooting Guide

Solutions to common issues you might encounter.

## Account Connection Issues
**Problem:** Can't connect bank account
**Solution:**
- Ensure your bank is supported
- Check your internet connection
- Try updating your banking credentials
- Contact support if issue persists

## Missing Transactions
**Problem:** Transactions not showing up
**Solution:**
- Wait 24-48 hours for sync
- Check if account is still connected
- Verify transaction date range
- Refresh your data

## Incorrect Categorization
**Problem:** Transactions in wrong category
**Solution:**
- Manually update transaction category
- AI will learn from your corrections
- Set up custom category rules

## Performance Issues
**Problem:** App running slowly
**Solution:**
- Clear browser cache
- Disable browser extensions
- Check internet connection
- Try different browser

## Need More Help?
Contact our support team at help-desk@codesages.net`
    }
  ]

  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const categories = Array.from(new Set(documents.map(doc => doc.category)))

  const handleDownloadPDF = (doc: DocumentItem) => {
    // Create a simple text file download for demonstration
    // In a real app, you might generate PDFs server-side
    const element = document.createElement('a')
    const file = new Blob([doc.content || doc.description], { type: 'text/plain' })
    element.href = URL.createObjectURL(file)
    element.download = `${doc.title.replace(/\s+/g, '_')}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  if (selectedDoc) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedDoc(null)}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Documentation
              </button>
              <button
                onClick={() => handleDownloadPDF(selectedDoc)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>

          {/* Document Content */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900">{selectedDoc.title}</h1>
              <p className="text-gray-600 mt-2">{selectedDoc.description}</p>
              <span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mt-3">
                {selectedDoc.category}
              </span>
            </div>
            <div className="p-6">
              <div className="prose max-w-none">
                {selectedDoc.content?.split('\n').map((line, index) => {
                  if (line.startsWith('# ')) {
                    return <h1 key={index} className="text-2xl font-bold text-gray-900 mt-6 mb-4">{line.replace('# ', '')}</h1>
                  } else if (line.startsWith('## ')) {
                    return <h2 key={index} className="text-xl font-semibold text-gray-800 mt-5 mb-3">{line.replace('## ', '')}</h2>
                  } else if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={index} className="font-semibold text-gray-900 mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>
                  } else if (line.startsWith('- ')) {
                    return <li key={index} className="text-gray-700 ml-4">{line.replace('- ', '')}</li>
                  } else if (line.trim() === '') {
                    return <br key={index} />
                  } else {
                    return <p key={index} className="text-gray-700 mb-3">{line}</p>
                  }
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-blue-600" />
                Documentation
              </h1>
              <p className="text-gray-600 mt-2">
                Learn how to make the most of your PocketWiseAI budget planner
              </p>
            </div>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-6">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search documentation..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {categories.map((category) => {
            const categoryDocs = filteredDocs.filter(doc => doc.category === category)
            if (categoryDocs.length === 0) return null

            return (
              <div key={category} className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">{category}</h2>
                  <div className="space-y-3">
                    {categoryDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors group"
                        onClick={() => setSelectedDoc(doc)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors flex items-center gap-2">
                              <FileText className="w-4 h-4" />
                              {doc.title}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors ml-2 flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Links */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Need More Help?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h3 className="font-medium text-gray-900 mb-2">Video Tutorials</h3>
              <p className="text-sm text-gray-600 mb-3">Watch step-by-step video guides</p>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Coming Soon →
              </button>
            </div>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h3 className="font-medium text-gray-900 mb-2">Contact Support</h3>
              <p className="text-sm text-gray-600 mb-3">Get help from our support team</p>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                help-desk@codesages.net →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}