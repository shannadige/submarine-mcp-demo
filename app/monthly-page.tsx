'use client'

import { useState, useEffect } from 'react'
import {
  MonthlyBillStatus,
  MonthlyBill,
  BillAlert,
  getCurrentMonthBills,
  getNextMonthBills,
  getAllBills,
  createBill,
  updateBill,
  deleteBill,
  markCurrentMonthBillPaid,
  getRecentAlerts,
  getMonthlyBillsSummary
} from '../lib/monthly-database'

export default function MonthlyBillsTracker() {
  const [currentMonthBills, setCurrentMonthBills] = useState<MonthlyBillStatus[]>([])
  const [nextMonthBills, setNextMonthBills] = useState<MonthlyBillStatus[]>([])
  const [billTemplates, setBillTemplates] = useState<MonthlyBill[]>([])
  const [alerts, setAlerts] = useState<BillAlert[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingBill, setEditingBill] = useState<MonthlyBill | null>(null)
  const [activeTab, setActiveTab] = useState<'current' | 'next' | 'manage'>('current')

  const [newBill, setNewBill] = useState({
    name: '',
    amount: '',
    due_day: '',
    frequency: 'monthly' as const,
    autopay: false,
    category: 'subscription',
    notes: ''
  })

  const [editBill, setEditBill] = useState({
    name: '',
    amount: '',
    due_day: '',
    frequency: 'monthly' as 'monthly' | 'quarterly' | 'yearly',
    autopay: false,
    category: 'subscription',
    notes: ''
  })

  useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    try {
      const [currentBills, nextBills, templates, recentAlerts, monthlySummary] = await Promise.all([
        getCurrentMonthBills(),
        getNextMonthBills(),
        getAllBills(),
        getRecentAlerts(5),
        getMonthlyBillsSummary()
      ])

      setCurrentMonthBills(currentBills)
      setNextMonthBills(nextBills)
      setBillTemplates(templates)
      setAlerts(recentAlerts)
      setSummary(monthlySummary)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function addBill() {
    try {
      await createBill({
        ...newBill,
        amount: parseFloat(newBill.amount),
        due_day: parseInt(newBill.due_day),
        reminder_enabled: true,
        reminder_days_before: 3,
        active: true
      })

      setNewBill({
        name: '',
        amount: '',
        due_day: '',
        frequency: 'monthly',
        autopay: false,
        category: 'subscription',
        notes: ''
      })
      setShowAddForm(false)
      loadAllData()
    } catch (error) {
      console.error('Failed to add bill:', error)
    }
  }

  function startEditBill(bill: MonthlyBill) {
    setEditingBill(bill)
    setEditBill({
      name: bill.name,
      amount: bill.amount.toString(),
      due_day: bill.due_day.toString(),
      frequency: bill.frequency,
      autopay: bill.autopay,
      category: bill.category,
      notes: bill.notes || ''
    })
    setShowEditForm(true)
  }

  async function updateBillTemplate() {
    if (!editingBill) return

    try {
      await updateBill(editingBill.id, {
        name: editBill.name,
        amount: parseFloat(editBill.amount),
        due_day: parseInt(editBill.due_day),
        frequency: editBill.frequency,
        autopay: editBill.autopay,
        category: editBill.category,
        notes: editBill.notes
      })

      setShowEditForm(false)
      setEditingBill(null)
      loadAllData()
    } catch (error) {
      console.error('Failed to update bill:', error)
    }
  }

  async function deleteBillTemplate(billId: string) {
    if (!confirm('Are you sure you want to delete this bill template?')) {
      return
    }

    try {
      await deleteBill(billId)
      loadAllData()
    } catch (error) {
      console.error('Failed to delete bill:', error)
    }
  }

  async function markAsPaid(billId: string, amount: number) {
    try {
      await markCurrentMonthBillPaid(billId, amount)
      loadAllData()
    } catch (error) {
      console.error('Failed to mark as paid:', error)
    }
  }

  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your bills...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Monthly Bills Tracker</h1>
              <p className="text-gray-600">Track bills by month - no shifting dates!</p>
            </div>
            {summary && (
              <div className="text-right">
                <p className="text-sm text-gray-600">{currentMonth} Total</p>
                <p className="text-2xl font-bold text-gray-900">${summary.totalAmount.toFixed(2)}</p>
                <p className="text-sm text-gray-500">
                  {summary.paidBills}/{summary.totalBills} paid • ${summary.unpaidAmount.toFixed(2)} remaining
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8">
          {[
            { key: 'current', label: `${currentMonth}`, icon: '📅' },
            { key: 'next', label: `${nextMonth}`, icon: '➡️' },
            { key: 'manage', label: 'Manage Bills', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Current Month Tab */}
        {activeTab === 'current' && (
          <div className="space-y-6">
            {summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500">Paid This Month</h3>
                  <p className="text-xl font-bold text-green-600">{summary.paidBills}/{summary.totalBills}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500">Due Soon</h3>
                  <p className="text-xl font-bold text-orange-600">{summary.dueSoonBills}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500">Overdue</h3>
                  <p className="text-xl font-bold text-red-600">{summary.overdueBills}</p>
                </div>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-500">Auto-Pay</h3>
                  <p className="text-xl font-bold text-blue-600">{summary.autopayBills}</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">{currentMonth} Bills</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Day</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {currentMonthBills.map(bill => (
                      <tr key={bill.bill_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900">{bill.bill_name}</div>
                            <div className="text-sm text-gray-500">{bill.category}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {bill.due_day}
                          {bill.days_until_due >= 0 ? (
                            <div className="text-xs text-gray-500">
                              {bill.days_until_due === 0 ? 'Due today' : `${bill.days_until_due} days`}
                            </div>
                          ) : (
                            <div className="text-xs text-red-500">
                              {Math.abs(bill.days_until_due)} days overdue
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">${bill.amount}</td>
                        <td className="px-6 py-4">
                          {bill.is_paid ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              ✅ Paid {bill.paid_date && new Date(bill.paid_date).getDate()}
                            </span>
                          ) : bill.is_overdue ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              ⚠️ Overdue
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              ⏳ Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            bill.autopay ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {bill.autopay ? '🤖 Auto' : '💳 Manual'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {!bill.autopay && !bill.is_paid && (
                            <button
                              onClick={() => markAsPaid(bill.bill_id, bill.amount)}
                              className="text-green-600 hover:text-green-900 text-sm font-medium"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Next Month Tab */}
        {activeTab === 'next' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">{nextMonth} Bills Preview</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Day</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {nextMonthBills.map(bill => (
                    <tr key={bill.bill_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{bill.bill_name}</div>
                          <div className="text-sm text-gray-500">{bill.category}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{bill.due_day}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">${bill.amount}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          bill.autopay ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {bill.autopay ? '🤖 Auto' : '💳 Manual'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Manage Bills Tab */}
        {activeTab === 'manage' && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Manage Bill Templates</h2>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                + Add Bill
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Day</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {billTemplates.map(bill => (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{bill.name}</div>
                          <div className="text-sm text-gray-500">{bill.category}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{bill.due_day}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">${bill.amount}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 capitalize">{bill.frequency}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          bill.autopay ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {bill.autopay ? '🤖 Auto' : '💳 Manual'}
                        </span>
                      </td>
                      <td className="px-6 py-4 space-x-2">
                        <button
                          onClick={() => startEditBill(bill)}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteBillTemplate(bill.id)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {alerts.map(alert => (
                  <div key={alert.id} className="flex items-center space-x-3 text-sm">
                    <span className="text-gray-500">{new Date(alert.sent_at).toLocaleDateString()}</span>
                    <span className="text-gray-800">{alert.message}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Bill Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Bill Template</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={newBill.name}
                  onChange={(e) => setNewBill({...newBill, name: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Netflix, Rent, Electric Bill"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={newBill.amount}
                  onChange={(e) => setNewBill({...newBill, amount: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Due Day (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={newBill.due_day}
                  onChange={(e) => setNewBill({...newBill, due_day: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Frequency</label>
                <select
                  value={newBill.frequency}
                  onChange={(e) => setNewBill({...newBill, frequency: e.target.value as any})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly (every 3 months)</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={newBill.category}
                  onChange={(e) => setNewBill({...newBill, category: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="subscription">Subscription</option>
                  <option value="streaming">Streaming</option>
                  <option value="utilities">Utilities</option>
                  <option value="housing">Housing</option>
                  <option value="insurance">Insurance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autopay"
                  checked={newBill.autopay}
                  onChange={(e) => setNewBill({...newBill, autopay: e.target.checked})}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="autopay" className="ml-2 text-sm text-gray-900">
                  🤖 This bill is on autopay
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={addBill}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Add Bill
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Bill Modal */}
      {showEditForm && editingBill && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Bill: {editingBill.name}</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={editBill.name}
                  onChange={(e) => setEditBill({...editBill, name: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={editBill.amount}
                  onChange={(e) => setEditBill({...editBill, amount: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Due Day (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={editBill.due_day}
                  onChange={(e) => setEditBill({...editBill, due_day: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Frequency</label>
                <select
                  value={editBill.frequency}
                  onChange={(e) => setEditBill({...editBill, frequency: e.target.value as any})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select
                  value={editBill.category}
                  onChange={(e) => setEditBill({...editBill, category: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="subscription">Subscription</option>
                  <option value="streaming">Streaming</option>
                  <option value="utilities">Utilities</option>
                  <option value="housing">Housing</option>
                  <option value="insurance">Insurance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="editAutopay"
                  checked={editBill.autopay}
                  onChange={(e) => setEditBill({...editBill, autopay: e.target.checked})}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <label htmlFor="editAutopay" className="ml-2 text-sm text-gray-900">
                  🤖 This bill is on autopay
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditForm(false)
                  setEditingBill(null)
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={updateBillTemplate}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Update Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}