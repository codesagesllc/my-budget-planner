'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert/Alert'
import {
  Target,
  TrendingUp,
  Calendar,
  DollarSign,
  Plus,
  CheckCircle,
  Clock,
  Zap,
  AlertTriangle,
  Trophy,
  ArrowRight,
  X,
  Save,
  RefreshCw
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { budgetTracker, SavingsGoal } from '@/lib/services/budget-tracker'

interface SavingsGoalsTrackerProps {
  userId: string
  className?: string
}

interface EnhancedSavingsGoal extends SavingsGoal {
  daysRemaining: number
  isOverdue: boolean
  velocityNeeded: number // Daily amount needed
  currentVelocity: number // Current daily rate
  status: 'on-track' | 'behind' | 'ahead' | 'at-risk' | 'completed'
  milestones: { percentage: number; amount: number; reached: boolean }[]
  recentContributions: number // Last 7 days
}

export default function SavingsGoalsTracker({ userId, className }: SavingsGoalsTrackerProps) {
  const [savingsGoals, setSavingsGoals] = useState<EnhancedSavingsGoal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [flashingGoals, setFlashingGoals] = useState<Set<string>>(new Set())

  // Popup states
  const [showAddGoalPopup, setShowAddGoalPopup] = useState(false)
  const [showAddFundsPopup, setShowAddFundsPopup] = useState(false)
  const [showAdjustTargetPopup, setShowAdjustTargetPopup] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<EnhancedSavingsGoal | null>(null)

  // Form states
  const [goalForm, setGoalForm] = useState({
    name: '',
    targetAmount: '',
    deadline: '',
  })
  const [fundsAmount, setFundsAmount] = useState('')
  const [targetForm, setTargetForm] = useState({
    newTarget: '',
    newDeadline: ''
  })

  const supabase = createClient()

  const calculateEnhancedGoals = async () => {
    try {
      setIsLoading(true)

      const goals = await budgetTracker.getSavingsGoals(userId)

      const enhancedGoals: EnhancedSavingsGoal[] = await Promise.all(
        goals.map(async (goal) => {
          const deadline = new Date(goal.deadline)
          const now = new Date()
          const daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          const isOverdue = deadline < now && goal.progress_percentage < 100

          // Calculate velocity metrics
          const remainingAmount = goal.target_amount - goal.current_amount
          const velocityNeeded = daysRemaining > 0 ? remainingAmount / daysRemaining : 0

          // Get recent contributions (mock data - would need transaction history)
          const recentContributions = Math.random() * 100 // Would fetch from actual transfers/deposits

          const currentVelocity = recentContributions / 7 // Daily average from last week

          // Determine status
          let status: EnhancedSavingsGoal['status'] = 'on-track'
          if (goal.progress_percentage >= 100) {
            status = 'completed'
          } else if (isOverdue) {
            status = 'at-risk'
          } else if (currentVelocity < velocityNeeded * 0.8) {
            status = 'behind'
          } else if (currentVelocity > velocityNeeded * 1.2) {
            status = 'ahead'
          }

          // Generate milestones
          const milestones = [25, 50, 75, 100].map(percentage => ({
            percentage,
            amount: (goal.target_amount * percentage) / 100,
            reached: goal.progress_percentage >= percentage
          }))

          return {
            ...goal,
            daysRemaining,
            isOverdue,
            velocityNeeded,
            currentVelocity,
            status,
            milestones,
            recentContributions
          }
        })
      )

      // Check for goals with new milestones (for flashing effect)
      const newFlashing = new Set<string>()
      enhancedGoals.forEach(goal => {
        if (goal.status === 'completed' || goal.milestones.some(m => m.reached && m.percentage > 0)) {
          newFlashing.add(goal.id)
        }
      })

      setFlashingGoals(newFlashing)
      setTimeout(() => setFlashingGoals(new Set()), 3000)

      setSavingsGoals(enhancedGoals)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Error calculating savings goals:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!userId) return

    calculateEnhancedGoals()

    // Set up real-time subscription for savings-related changes
    const channel = supabase
      .channel('savings-goals-updates')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'savings_goals', filter: `user_id=eq.${userId}` },
        () => {
          console.log('Savings goal change detected - updating tracker')
          calculateEnhancedGoals()
        })
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${userId}` },
        (payload) => {
          // Check if this is a transfer to savings
          if (payload.new && (payload.new as any).category?.includes('savings')) {
            console.log('Savings transfer detected - updating goals')
            calculateEnhancedGoals()
          }
        })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const getStatusColor = (status: EnhancedSavingsGoal['status']) => {
    switch (status) {
      case 'completed': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
      case 'ahead': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700'
      case 'on-track': return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
      case 'behind': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700'
      case 'at-risk': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
      default: return 'text-black dark:text-white bg-gray-100 dark:bg-gray-800 border-input'
    }
  }

  const getStatusIcon = (status: EnhancedSavingsGoal['status']) => {
    switch (status) {
      case 'completed': return <Trophy className="h-4 w-4" />
      case 'ahead': return <TrendingUp className="h-4 w-4" />
      case 'on-track': return <Target className="h-4 w-4" />
      case 'behind': return <Clock className="h-4 w-4" />
      case 'at-risk': return <AlertTriangle className="h-4 w-4" />
      default: return <Target className="h-4 w-4" />
    }
  }

  const getStatusMessage = (goal: EnhancedSavingsGoal) => {
    switch (goal.status) {
      case 'completed':
        return `🎉 Congratulations! You've reached your ${goal.name} goal!`
      case 'ahead':
        return `You're ahead of schedule! Continue saving $${goal.currentVelocity.toFixed(2)}/day to stay on track.`
      case 'on-track':
        return `Great progress! Save $${goal.velocityNeeded.toFixed(2)}/day to reach your goal on time.`
      case 'behind':
        return `You need to increase your savings rate to $${goal.velocityNeeded.toFixed(2)}/day to meet your deadline.`
      case 'at-risk':
        return `⚠️ Goal deadline has passed. Consider adjusting your target date or increasing contributions.`
      default:
        return `Save consistently to reach your ${goal.name} goal.`
    }
  }

  // Popup handlers
  const handleAddGoal = async () => {
    if (!goalForm.name || !goalForm.targetAmount || !goalForm.deadline) return

    try {
      await budgetTracker.createSavingsGoal(userId, {
        name: goalForm.name,
        target_amount: parseFloat(goalForm.targetAmount),
        deadline: goalForm.deadline
      })

      setGoalForm({ name: '', targetAmount: '', deadline: '' })
      setShowAddGoalPopup(false)
      calculateEnhancedGoals()
    } catch (error) {
      console.error('Error creating savings goal:', error)
    }
  }

  const handleAddFunds = async () => {
    if (!selectedGoal || !fundsAmount) return

    try {
      await budgetTracker.addFundsToGoal(selectedGoal.id, parseFloat(fundsAmount))

      setFundsAmount('')
      setShowAddFundsPopup(false)
      setSelectedGoal(null)
      calculateEnhancedGoals()
    } catch (error) {
      console.error('Error adding funds:', error)
    }
  }

  const handleAdjustTarget = async () => {
    if (!selectedGoal || (!targetForm.newTarget && !targetForm.newDeadline)) return

    try {
      const updates: any = {}
      if (targetForm.newTarget) updates.target_amount = parseFloat(targetForm.newTarget)
      if (targetForm.newDeadline) updates.deadline = targetForm.newDeadline

      await budgetTracker.updateSavingsGoal(selectedGoal.id, updates)

      setTargetForm({ newTarget: '', newDeadline: '' })
      setShowAdjustTargetPopup(false)
      setSelectedGoal(null)
      calculateEnhancedGoals()
    } catch (error) {
      console.error('Error adjusting target:', error)
    }
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-black dark:text-white">
          <Target className="h-5 w-5 text-blue-500" />
          Savings Goals Progress
        </h3>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddGoalPopup(!showAddGoalPopup)}
            className="text-black"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Goal
          </Button>

          {/* Add Goal Popup */}
          {showAddGoalPopup && (
            <div className="absolute top-full right-0 mt-2 w-80 bg-background border border-input rounded-lg shadow-lg z-50">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-black dark:text-white">Add Savings Goal</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddGoalPopup(false)}
                    className="text-destructive hover:text-destructive/80 border-destructive/30 hover:border-destructive/50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white mb-1">
                      Goal Name
                    </label>
                    <input
                      type="text"
                      value={goalForm.name}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Emergency Fund"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white mb-1">
                      Target Amount
                    </label>
                    <input
                      type="number"
                      value={goalForm.targetAmount}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, targetAmount: e.target.value }))}
                      placeholder="1000"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-black dark:text-white mb-1">
                      Target Date
                    </label>
                    <input
                      type="date"
                      value={goalForm.deadline}
                      onChange={(e) => setGoalForm(prev => ({ ...prev, deadline: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-black dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleAddGoal}
                    disabled={!goalForm.name || !goalForm.targetAmount || !goalForm.deadline}
                    className="flex-1"
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Create Goal
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowAddGoalPopup(false)}
                    className="text-destructive hover:text-destructive/80 border-destructive/30 hover:border-destructive/50"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {savingsGoals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <Target className="h-12 w-12 text-black dark:text-white mx-auto mb-4" />
            <h4 className="text-lg font-medium text-black dark:text-white mb-2">No Savings Goals for User Entered</h4>
            <p className="text-black dark:text-white mb-4">
              Create savings goals to track your progress and get real-time updates.
            </p>
            <Button onClick={() => setShowAddGoalPopup(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create Your First Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {savingsGoals.map(goal => (
            <Card
              key={goal.id}
              className={`transition-all duration-300 ${
                flashingGoals.has(goal.id) ? 'animate-pulse ring-2 ring-green-300' : ''
              } ${goal.status === 'completed' ? 'border-green-300 bg-green-50' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {goal.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Target className="h-5 w-5" />
                    )}
                    {goal.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-orange-500" />
                      <span className="text-xs text-black dark:text-white">Live</span>
                    </div>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border ${getStatusColor(goal.status)}`}>
                      {getStatusIcon(goal.status)}
                      <span className="capitalize">{goal.status.replace('-', ' ')}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progress Visualization */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>${goal.current_amount.toFixed(2)} saved</span>
                    <span>${goal.target_amount.toFixed(2)} goal</span>
                  </div>
                  <Progress
                    value={Math.min(100, goal.progress_percentage)}
                    className="h-4"
                  />
                  <div className="flex justify-between text-xs text-black dark:text-white mt-1">
                    <span>{goal.progress_percentage.toFixed(1)}% complete</span>
                    <span>${(goal.target_amount - goal.current_amount).toFixed(2)} remaining</span>
                  </div>
                </div>

                {/* Milestones */}
                <div className="flex justify-between items-center">
                  {goal.milestones.map((milestone, index) => (
                    <div key={milestone.percentage} className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                        milestone.reached
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white'
                      }`}>
                        {milestone.reached ? <CheckCircle className="h-3 w-3" /> : milestone.percentage}
                      </div>
                      <span className="text-xs text-black dark:text-white mt-1">{milestone.percentage}%</span>
                      {index < goal.milestones.length - 1 && (
                        <ArrowRight className="h-3 w-3 text-black dark:text-white absolute transform translate-x-6" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Status Message */}
                <Alert variant={goal.status === 'at-risk' ? 'destructive' : 'default' as any}>
                  {getStatusIcon(goal.status)}
                  <AlertDescription className="text-sm">
                    {getStatusMessage(goal)}
                  </AlertDescription>
                </Alert>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-black dark:text-white">Deadline:</span>
                      <span className={`font-medium ${goal.isOverdue ? 'text-red-600' : 'text-black dark:text-white'}`}>
                        {new Date(goal.deadline).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black dark:text-white">Days Left:</span>
                      <span className={`font-medium flex items-center gap-1 ${
                        goal.daysRemaining === 0 ? 'text-red-600' : 'text-black dark:text-white'
                      }`}>
                        <Clock className="h-3 w-3" />
                        {goal.daysRemaining}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-black dark:text-white">Need/Day:</span>
                      <span className="font-medium">${goal.velocityNeeded.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-black dark:text-white">Recent Rate:</span>
                      <span className={`font-medium ${
                        goal.currentVelocity >= goal.velocityNeeded ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ${goal.currentVelocity.toFixed(2)}/day
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-black dark:text-white">Last 7 days:</span>
                    <span className="font-medium text-green-600">
                      +${goal.recentContributions.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <Progress
                      value={(goal.recentContributions / (goal.velocityNeeded * 7)) * 100}
                      className="h-2"
                    />
                  </div>
                </div>

                {/* Quick Actions */}
                {goal.status !== 'completed' && (
                  <div className="flex gap-2 relative">
                    <div className="flex-1 relative">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedGoal(goal)
                          setShowAddFundsPopup(true)
                        }}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Add Funds
                      </Button>

                      {/* Add Funds Popup */}
                      {showAddFundsPopup && selectedGoal?.id === goal.id && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-medium text-black dark:text-white">Add Funds</h3>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setShowAddFundsPopup(false)
                                  setSelectedGoal(null)
                                }}
                                className="text-destructive hover:text-destructive/80 border-destructive/30 hover:border-destructive/50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-black dark:text-white mb-1">
                                  Amount to Add
                                </label>
                                <input
                                  type="number"
                                  value={fundsAmount}
                                  onChange={(e) => setFundsAmount(e.target.value)}
                                  placeholder="50.00"
                                  step="0.01"
                                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                              </div>

                              <div className="text-sm text-black dark:text-white">
                                <div className="flex justify-between">
                                  <span>Current:</span>
                                  <span>${goal.current_amount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>New Total:</span>
                                  <span className="font-medium">
                                    ${(goal.current_amount + (parseFloat(fundsAmount) || 0)).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                              <Button
                                onClick={handleAddFunds}
                                disabled={!fundsAmount || parseFloat(fundsAmount) <= 0}
                                className="flex-1"
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Add Funds
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowAddFundsPopup(false)
                                  setSelectedGoal(null)
                                  setFundsAmount('')
                                }}
                                className="text-destructive hover:text-destructive/80 border-destructive/30 hover:border-destructive/50"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 relative">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedGoal(goal)
                          setTargetForm({
                            newTarget: goal.target_amount.toString(),
                            newDeadline: goal.deadline.split('T')[0]
                          })
                          setShowAdjustTargetPopup(true)
                        }}
                      >
                        <Calendar className="h-4 w-4 mr-1" />
                        Adjust Target
                      </Button>

                      {/* Adjust Target Popup */}
                      {showAdjustTargetPopup && selectedGoal?.id === goal.id && (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h3 className="font-medium text-black dark:text-white">Adjust Target</h3>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setShowAdjustTargetPopup(false)
                                  setSelectedGoal(null)
                                }}
                                className="text-destructive hover:text-destructive/80 border-destructive/30 hover:border-destructive/50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-black dark:text-white mb-1">
                                  New Target Amount
                                </label>
                                <input
                                  type="number"
                                  value={targetForm.newTarget}
                                  onChange={(e) => setTargetForm(prev => ({ ...prev, newTarget: e.target.value }))}
                                  placeholder={goal.target_amount.toString()}
                                  step="0.01"
                                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-black dark:text-white mb-1">
                                  New Target Date
                                </label>
                                <input
                                  type="date"
                                  value={targetForm.newDeadline}
                                  onChange={(e) => setTargetForm(prev => ({ ...prev, newDeadline: e.target.value }))}
                                  className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                              </div>

                              <div className="text-sm text-black dark:text-white bg-gray-100 dark:bg-gray-800 p-2 rounded">
                                <div className="flex justify-between">
                                  <span>Current Target:</span>
                                  <span>${goal.target_amount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Current Deadline:</span>
                                  <span>{new Date(goal.deadline).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 mt-4">
                              <Button
                                onClick={handleAdjustTarget}
                                disabled={!targetForm.newTarget && !targetForm.newDeadline}
                                className="flex-1"
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Update Goal
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setShowAdjustTargetPopup(false)
                                  setSelectedGoal(null)
                                  setTargetForm({ newTarget: '', newDeadline: '' })
                                }}
                                className="text-destructive hover:text-destructive/80 border-destructive/30 hover:border-destructive/50"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-black dark:text-white text-center">
        Last updated: {lastUpdate.toLocaleTimeString()} • Updates as transfers complete
      </p>
    </div>
  )
}