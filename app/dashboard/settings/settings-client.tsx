'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert/Alert'
import { toast } from 'sonner'
import {
  Settings,
  Trash2,
  AlertTriangle,
  ArrowLeft,
  User as UserIcon
} from 'lucide-react'
import Link from 'next/link'

interface SettingsClientProps {
  user: User
  userData: any
}

export default function SettingsClient({ user, userData }: SettingsClientProps) {
  const router = useRouter()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE MY ACCOUNT') {
      toast.error('Please type "DELETE MY ACCOUNT" to confirm')
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmation: deleteConfirmation
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete account')
      }

      toast.success('Account successfully deleted. Redirecting...')

      // Wait a moment then redirect to home
      setTimeout(() => {
        router.push('/')
      }, 2000)

    } catch (error: any) {
      console.error('Error deleting account:', error)
      toast.error(error.message || 'Failed to delete account')
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Account Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Manage your account preferences and data
            </p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" className="text-black">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>
              Your account details and status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <p className="text-gray-900 dark:text-white mt-1">{user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">User ID</label>
                <p className="text-gray-900 dark:text-white mt-1 font-mono text-xs">{user.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Account Created</label>
                <p className="text-gray-900 dark:text-white mt-1">
                  {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Subscription Tier</label>
                <p className="text-gray-900 dark:text-white mt-1 capitalize">
                  {userData?.subscription_tier || 'Free Trial'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone - Account Deletion */}
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible actions that will permanently affect your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showDeleteConfirm ? (
              <>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warning:</strong> Deleting your account is permanent and cannot be undone.
                    All of your data, including transactions, bills, accounts, and income sources will be permanently deleted.
                  </AlertDescription>
                </Alert>

                <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                    What will be deleted:
                  </h4>
                  <ul className="text-sm text-red-800 dark:text-red-200 space-y-1 list-disc list-inside">
                    <li>All bank account connections and transaction history</li>
                    <li>All bills and payment records</li>
                    <li>All income sources and financial data</li>
                    <li>All savings goals and debt tracking</li>
                    <li>All budgets and spending limits</li>
                    <li>Your user account and profile</li>
                  </ul>
                </div>

                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="destructive"
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete My Account
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Final Confirmation Required</strong>
                    <br />
                    This action cannot be undone. All your data will be permanently deleted.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <label className="block">
                    <span className="text-sm font-medium text-gray-900 dark:text-white mb-2 block">
                      Type <strong className="text-red-600">"DELETE MY ACCOUNT"</strong> to confirm:
                    </span>
                    <input
                      type="text"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="DELETE MY ACCOUNT"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      disabled={isDeleting}
                    />
                  </label>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleDeleteAccount}
                      disabled={deleteConfirmation !== 'DELETE MY ACCOUNT' || isDeleting}
                      variant="destructive"
                      className="flex-1"
                    >
                      {isDeleting ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Deleting Account...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Permanently Delete Account
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowDeleteConfirm(false)
                        setDeleteConfirmation('')
                      }}
                      variant="outline"
                      className="flex-1 text-black"
                      disabled={isDeleting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
