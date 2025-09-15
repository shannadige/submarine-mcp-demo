'use client'

import { useState, useEffect } from 'react'

interface Budget {
  id: string
  category: string
  budget_limit: number
  spent: number
  period: 'monthly' | 'weekly' | 'yearly'
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [newBudget, setNewBudget] = useState({
    category: '',
    budget_limit: '',
    period: 'monthly' as 'monthly' | 'weekly' | 'yearly'
  })

  const predefinedCategories = [
    'food', 'groceries', 'transportation', 'entertainment',
    'shopping', 'healthcare', 'utilities', 'miscellaneous',
    'housing', 'insurance', 'debt', 'savings', 'education'
  ]

  useEffect(() => {
    loadBudgets()
  }, [])

  async function loadBudgets() {
    try {
      const response = await fetch('/api/budgets')
      if (!response.ok) throw new Error('Failed to load budgets')
      const data = await response.json()
      setBudgets(data)
    } catch (error) {
      console.error('Error loading budgets:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveBudget(e: React.FormEvent) {
    e.preventDefault()

    try {
      const budgetData = editingBudget ? {
        category: editingBudget.category,
        budget_limit: parseFloat(newBudget.budget_limit),
        spent: editingBudget.spent,
        period: newBudget.period
      } : {
        category: newBudget.category,
        budget_limit: parseFloat(newBudget.budget_limit),
        spent: 0,
        period: newBudget.period
      }

      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetData)
      })

      if (!response.ok) throw new Error('Failed to save budget')

      setNewBudget({
        category: '',
        budget_limit: '',
        period: 'monthly'
      })
      setEditingBudget(null)
      setShowModal(false)
      loadBudgets()
    } catch (error) {
      console.error('Error saving budget:', error)
    }
  }

  function openEditModal(budget: Budget) {
    setEditingBudget(budget)
    setNewBudget({
      category: budget.category,
      budget_limit: budget.budget_limit.toString(),
      period: budget.period
    })
    setShowModal(true)
  }

  function openNewModal() {
    setEditingBudget(null)
    setNewBudget({
      category: '',
      budget_limit: '',
      period: 'monthly'
    })
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Budget Management</h1>
              <p className="text-gray-600">Set and track your spending limits</p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={() => window.location.href = '/'}
                className="text-gray-600 hover:text-gray-900"
              >
                ← Back to Dashboard
              </button>
              <button
                onClick={openNewModal}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Budget
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Budgets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {budgets.length === 0 ? (
            <div className="col-span-full bg-white rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No budgets yet</h3>
              <p className="text-gray-600 mb-6">Create your first budget to start tracking your spending</p>
              <button
                onClick={openNewModal}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                Create Budget
              </button>
            </div>
          ) : (
            budgets.map((budget) => {
              const percentage = (budget.spent / budget.budget_limit) * 100
              const isOver = percentage > 100
              const isWarning = percentage > 80

              return (
                <div key={budget.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 capitalize">{budget.category}</h3>
                      <p className="text-sm text-gray-600 capitalize">{budget.period}</p>
                    </div>
                    <button
                      onClick={() => openEditModal(budget)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>${budget.spent.toFixed(2)} spent</span>
                      <span>${budget.budget_limit.toFixed(2)} limit</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${
                          isOver ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">{percentage.toFixed(1)}% used</span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        isOver ? 'bg-red-100 text-red-800' :
                        isWarning ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {isOver ? 'Over Budget' : isWarning ? 'Warning' : 'On Track'}
                      </span>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      ${(budget.budget_limit - budget.spent).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {budget.spent <= budget.budget_limit ? 'remaining' : 'over budget'}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Add/Edit Budget Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingBudget ? 'Edit Budget' : 'Add New Budget'}
              </h3>
              <form onSubmit={handleSaveBudget} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  {editingBudget ? (
                    <input
                      type="text"
                      value={newBudget.category}
                      disabled
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-500"
                    />
                  ) : (
                    <select
                      value={newBudget.category}
                      onChange={(e) => setNewBudget({...newBudget, category: e.target.value})}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a category</option>
                      {predefinedCategories
                        .filter(cat => !budgets.some(b => b.category === cat))
                        .map(category => (
                          <option key={category} value={category} className="capitalize">
                            {category}
                          </option>
                        ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Budget Limit</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newBudget.budget_limit}
                    onChange={(e) => setNewBudget({...newBudget, budget_limit: e.target.value})}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Period</label>
                  <select
                    value={newBudget.period}
                    onChange={(e) => setNewBudget({...newBudget, period: e.target.value as 'monthly' | 'weekly' | 'yearly'})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    {editingBudget ? 'Update Budget' : 'Create Budget'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}