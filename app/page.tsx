'use client'

import { useState, useEffect } from 'react'

interface SimpleBill {
  id: string
  name: string
  amount: number
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  next_due_date: string
  autopay: boolean
  reminder_enabled: boolean
  reminder_days_before: number
  category: string
  notes?: string
  active: boolean
  created_at?: string
  updated_at?: string
}

interface BillAlert {
  id: string
  bill_id: string
  alert_type: string
  message: string
  sent_at: string
  acknowledged: boolean
}

export default function SimpleBillsTracker() {
  const [bills, setBills] = useState<SimpleBill[]>([])
  const [alerts, setAlerts] = useState<BillAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingBill, setEditingBill] = useState<SimpleBill | null>(null)
  const [newBill, setNewBill] = useState({
    name: '',
    amount: '',
    frequency: 'monthly' as const,
    next_due_date: '',
    autopay: false,
    category: 'subscription',
    notes: ''
  })
  const [editBill, setEditBill] = useState({
    name: '',
    amount: '',
    frequency: 'monthly' as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    next_due_date: '',
    autopay: false,
    category: 'subscription',
    notes: ''
  })

  useEffect(() => {
    loadBills()
    loadAlerts()
  }, [])

  async function loadBills() {
    try {
      const response = await fetch('/api/simple-bills')
      if (response.ok) {
        const data = await response.json()
        setBills(data)
      }
    } catch (error) {
      console.error('Failed to load bills:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadAlerts() {
    try {
      const response = await fetch('/api/simple-bills/alerts')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.slice(0, 5)) // Show only latest 5 alerts
      }
    } catch (error) {
      console.error('Failed to load alerts:', error)
    }
  }

  async function addBill() {
    try {
      const response = await fetch('/api/simple-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newBill,
          amount: parseFloat(newBill.amount),
          reminder_enabled: true,
          reminder_days_before: 3,
          active: true
        })
      })

      if (response.ok) {
        setNewBill({
          name: '',
          amount: '',
          frequency: 'monthly',
          next_due_date: '',
          autopay: false,
          category: 'subscription',
          notes: ''
        })
        setShowAddForm(false)
        loadBills()
      }
    } catch (error) {
      console.error('Failed to add bill:', error)
    }
  }

  async function toggleAutopay(billId: string, currentAutopay: boolean) {
    try {
      const response = await fetch(`/api/simple-bills/${billId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autopay: !currentAutopay })
      })

      if (response.ok) {
        loadBills()
      }
    } catch (error) {
      console.error('Failed to toggle autopay:', error)
    }
  }

  async function markAsPaid(billId: string) {
    try {
      const response = await fetch(`/api/simple-bills/${billId}/paid`, {
        method: 'POST'
      })

      if (response.ok) {
        loadBills()
      }
    } catch (error) {
      console.error('Failed to mark as paid:', error)
    }
  }

  function startEditBill(bill: SimpleBill) {
    setEditingBill(bill)
    setEditBill({
      name: bill.name,
      amount: bill.amount.toString(),
      frequency: bill.frequency,
      next_due_date: bill.next_due_date,
      autopay: bill.autopay,
      category: bill.category,
      notes: bill.notes || ''
    })
    setShowEditForm(true)
  }

  async function updateBill() {
    if (!editingBill) return

    try {
      const response = await fetch(`/api/simple-bills/${editingBill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editBill.name,
          amount: parseFloat(editBill.amount),
          frequency: editBill.frequency,
          next_due_date: editBill.next_due_date,
          autopay: editBill.autopay,
          category: editBill.category,
          notes: editBill.notes
        })
      })

      if (response.ok) {
        setShowEditForm(false)
        setEditingBill(null)
        loadBills()
      }
    } catch (error) {
      console.error('Failed to update bill:', error)
    }
  }

  async function deleteBill(billId: string) {
    if (!confirm('Are you sure you want to delete this bill?')) {
      return
    }

    try {
      const response = await fetch(`/api/simple-bills/${billId}/delete`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadBills()
      }
    } catch (error) {
      console.error('Failed to delete bill:', error)
    }
  }

  const dueSoonBills = bills.filter(bill => {
    const daysUntil = Math.ceil((new Date(bill.next_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil <= 7 && !bill.autopay
  })

  const totalMonthlyAmount = bills.reduce((sum, bill) => {
    const monthlyAmount = bill.frequency === 'weekly' ? bill.amount * 4.33 :
                         bill.frequency === 'monthly' ? bill.amount :
                         bill.frequency === 'quarterly' ? bill.amount / 3 :
                         bill.amount / 12
    return sum + monthlyAmount
  }, 0)

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
              <h1 className="text-3xl font-bold text-gray-900">Bills & Subscriptions Tracker</h1>
              <p className="text-gray-600">Simple recurring bills management with AI reminders</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Monthly Total</p>
              <p className="text-2xl font-bold text-gray-900">${totalMonthlyAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Total Bills</h3>
            <p className="text-2xl font-bold text-gray-900">{bills.length}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Autopay Bills</h3>
            <p className="text-2xl font-bold text-green-600">{bills.filter(b => b.autopay).length}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Manual Bills</h3>
            <p className="text-2xl font-bold text-blue-600">{bills.filter(b => !b.autopay).length}</p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">Due Soon</h3>
            <p className="text-2xl font-bold text-orange-600">{dueSoonBills.length}</p>
          </div>
        </div>

        {/* Due Soon Section */}
        {dueSoonBills.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-orange-800 mb-4">🔔 Bills Due Soon (Manual Payment Required)</h2>
            <div className="space-y-3">
              {dueSoonBills.map(bill => {
                const daysUntil = Math.ceil((new Date(bill.next_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                const urgencyText = daysUntil <= 0 ? 'OVERDUE' : daysUntil === 1 ? 'DUE TOMORROW' : `${daysUntil} days`

                return (
                  <div key={bill.id} className="flex items-center justify-between bg-white p-4 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{bill.name}</h3>
                      <p className="text-sm text-gray-600">${bill.amount} - {urgencyText}</p>
                    </div>
                    <button
                      onClick={() => markAsPaid(bill.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Mark Paid
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Recent Alerts */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm mb-8">
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

        {/* Bills List */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">All Bills & Subscriptions</h2>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bill/Service</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frequency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Due</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bills.map(bill => {
                  const daysUntil = Math.ceil((new Date(bill.next_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

                  return (
                    <tr key={bill.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{bill.name}</div>
                          <div className="text-sm text-gray-500">{bill.category}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${bill.amount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                        {bill.frequency}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(bill.next_due_date).toLocaleDateString()}
                        <div className="text-xs text-gray-500">
                          {daysUntil <= 0 ? 'Overdue' : `${daysUntil} days`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          bill.autopay ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {bill.autopay ? '🤖 Autopay' : '💳 Manual'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-col space-y-1">
                          <div className="space-x-2">
                            <button
                              onClick={() => startEditBill(bill)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteBill(bill.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </div>
                          <div className="space-x-2">
                            <button
                              onClick={() => toggleAutopay(bill.id, bill.autopay)}
                              className="text-purple-600 hover:text-purple-900 text-xs"
                            >
                              {bill.autopay ? 'Disable Autopay' : 'Enable Autopay'}
                            </button>
                            {!bill.autopay && (
                              <button
                                onClick={() => markAsPaid(bill.id)}
                                className="text-green-600 hover:text-green-900 text-xs"
                              >
                                Mark Paid
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {bills.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No bills tracked yet. Add your first bill to get started!</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Add Bill Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Bill/Subscription</h3>

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
                <label className="block text-sm font-medium text-gray-700">Frequency</label>
                <select
                  value={newBill.frequency}
                  onChange={(e) => setNewBill({...newBill, frequency: e.target.value as any})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Next Due Date</label>
                <input
                  type="date"
                  value={newBill.next_due_date}
                  onChange={(e) => setNewBill({...newBill, next_due_date: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
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
                  placeholder="e.g., Netflix, Rent, Electric Bill"
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
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Frequency</label>
                <select
                  value={editBill.frequency}
                  onChange={(e) => setEditBill({...editBill, frequency: e.target.value as any})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Next Due Date</label>
                <input
                  type="date"
                  value={editBill.next_due_date}
                  onChange={(e) => setEditBill({...editBill, next_due_date: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                />
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
                onClick={updateBill}
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