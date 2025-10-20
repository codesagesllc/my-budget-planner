import { useState } from 'react';
import { Settings, Brain, TrendingUp, DollarSign, Percent, Calendar } from 'lucide-react';

interface ForecastSettingsProps {
  userId: string;
  currentSettings: {
    targetSavingsRate: number;
    emergencyFund: number;
    growthMethod: 'manual' | 'ai' | 'historical';
    inflationMethod: 'manual' | 'ai' | 'historical';
    expensesMethod: 'manual' | 'ai' | 'seasonal';
    manualGrowthRate?: number;
    manualInflationRate?: number;
    manualSeasonalFactors?: number[];
  };
  onSave: (settings: any) => void;
  onCancel: () => void;
}

export default function ForecastSettings({ userId, currentSettings, onSave, onCancel }: ForecastSettingsProps) {
  const [settings, setSettings] = useState(currentSettings);
  const [activeTab, setActiveTab] = useState<'general' | 'growth' | 'inflation' | 'expenses'>('general');

  const handleSave = () => {
    onSave(settings);
  };

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Forecast Settings
        </h3>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'general' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-black dark:text-white hover:text-gray-900'
          }`}
        >
          General
        </button>
        <button
          onClick={() => setActiveTab('growth')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'growth' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-black dark:text-white hover:text-gray-900'
          }`}
        >
          Income Growth
        </button>
        <button
          onClick={() => setActiveTab('inflation')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'inflation' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-black dark:text-white hover:text-gray-900'
          }`}
        >
          Inflation
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'expenses' 
              ? 'text-blue-600 border-b-2 border-blue-600' 
              : 'text-black dark:text-white hover:text-gray-900'
          }`}
        >
          Seasonal Expenses
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'general' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Savings Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.targetSavingsRate}
                onChange={(e) => setSettings({ ...settings, targetSavingsRate: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 20"
              />
              <p className="text-xs text-black dark:text-white mt-1">Your savings goal as % of income</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Fund Balance ($)
              </label>
              <input
                type="number"
                min="0"
                value={settings.emergencyFund}
                onChange={(e) => setSettings({ ...settings, emergencyFund: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 5000"
              />
              <p className="text-xs text-black dark:text-white mt-1">Current emergency fund saved</p>
            </div>
          </>
        )}

        {activeTab === 'growth' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Income Growth Method
              </label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="growthMethod"
                    value="ai"
                    checked={settings.growthMethod === 'ai'}
                    onChange={(e) => setSettings({ ...settings, growthMethod: e.target.value as any })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-gray-900">AI-Based Estimation</span>
                    </div>
                    <p className="text-sm text-black dark:text-white mt-1">
                      Analyzes your Plaid transaction history to predict income growth patterns
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="growthMethod"
                    value="historical"
                    checked={settings.growthMethod === 'historical'}
                    onChange={(e) => setSettings({ ...settings, growthMethod: e.target.value as any })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-gray-900">Historical Trend</span>
                    </div>
                    <p className="text-sm text-black dark:text-white mt-1">
                      Uses your past income trends to project future growth
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="growthMethod"
                    value="manual"
                    checked={settings.growthMethod === 'manual'}
                    onChange={(e) => setSettings({ ...settings, growthMethod: e.target.value as any })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-gray-900">Manual Rate</span>
                    </div>
                    <p className="text-sm text-black dark:text-white mt-1">
                      Set your own annual growth rate
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {settings.growthMethod === 'manual' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Growth Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.manualGrowthRate || 3}
                  onChange={(e) => setSettings({ ...settings, manualGrowthRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 3.5"
                />
                <p className="text-xs text-black dark:text-white mt-1">Compound annual growth rate for income</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'inflation' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Inflation Method
              </label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="inflationMethod"
                    value="ai"
                    checked={settings.inflationMethod === 'ai'}
                    onChange={(e) => setSettings({ ...settings, inflationMethod: e.target.value as any })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-gray-900">AI-Based Analysis</span>
                    </div>
                    <p className="text-sm text-black dark:text-white mt-1">
                      Analyzes your spending patterns from Plaid to estimate personal inflation
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="inflationMethod"
                    value="historical"
                    checked={settings.inflationMethod === 'historical'}
                    onChange={(e) => setSettings({ ...settings, inflationMethod: e.target.value as any })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-orange-600" />
                      <span className="font-medium text-gray-900">Historical Expenses</span>
                    </div>
                    <p className="text-sm text-black dark:text-white mt-1">
                      Uses your past expense increases to project inflation
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="inflationMethod"
                    value="manual"
                    checked={settings.inflationMethod === 'manual'}
                    onChange={(e) => setSettings({ ...settings, inflationMethod: e.target.value as any })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-gray-900">Manual Rate</span>
                    </div>
                    <p className="text-sm text-black dark:text-white mt-1">
                      Set your own inflation rate
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {settings.inflationMethod === 'manual' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Annual Inflation Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.manualInflationRate || 3}
                  onChange={(e) => setSettings({ ...settings, manualInflationRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 3.0"
                />
                <p className="text-xs text-black dark:text-white mt-1">Monthly compound inflation rate for expenses</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'expenses' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Seasonal Expense Patterns
              </label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="expensesMethod"
                    value="ai"
                    checked={settings.expensesMethod === 'ai'}
                    onChange={(e) => setSettings({ ...settings, expensesMethod: e.target.value as any })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-gray-900">AI Seasonal Analysis</span>
                    </div>
                    <p className="text-sm text-black dark:text-white mt-1">
                      AI analyzes your Plaid history to detect seasonal spending patterns
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="expensesMethod"
                    value="seasonal"
                    checked={settings.expensesMethod === 'seasonal'}
                    onChange={(e) => setSettings({ ...settings, expensesMethod: e.target.value as any })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-indigo-600" />
                      <span className="font-medium text-gray-900">Default Seasonal</span>
                    </div>
                    <p className="text-sm text-black dark:text-white mt-1">
                      Uses typical seasonal patterns (holidays, summer, etc.)
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="expensesMethod"
                    value="manual"
                    checked={settings.expensesMethod === 'manual'}
                    onChange={(e) => setSettings({ ...settings, expensesMethod: e.target.value as any })}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-gray-900">Manual Adjustment</span>
                    </div>
                    <p className="text-sm text-black dark:text-white mt-1">
                      Set your own monthly expense factors
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {settings.expensesMethod === 'manual' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Expense Factors (% of baseline)
                </label>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {monthNames.map((month, index) => (
                    <div key={month} className="space-y-1">
                      <label className="text-xs text-black dark:text-white">{month}</label>
                      <input
                        type="number"
                        min="50"
                        max="200"
                        value={settings.manualSeasonalFactors?.[index] || 100}
                        onChange={(e) => {
                          const factors = settings.manualSeasonalFactors || new Array(12).fill(100);
                          factors[index] = Number(e.target.value);
                          setSettings({ ...settings, manualSeasonalFactors: factors });
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="100"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-black dark:text-white mt-2">
                  100% = normal expenses, 120% = 20% higher, 80% = 20% lower
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start gap-2">
          <Brain className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">AI-Powered Forecasting</p>
            <p>
              When AI options are selected, the system will analyze your connected Plaid accounts to provide 
              personalized predictions based on your actual financial behavior. Make sure you have connected 
              your accounts for the best results.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Apply Settings
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
