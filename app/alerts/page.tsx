'use client'

import { useState, useEffect } from 'react'

interface AlertPreferences {
  budget_overspend: boolean
  large_transaction: boolean
  monthly_summary: boolean
  bill_reminder: boolean
  large_transaction_threshold: number
  bill_reminder_days: number
}

interface Alert {
  id: string
  alert_type: string
  message: string
  created_at: string
  acknowledged: boolean
  related_entity_id?: string
  related_entity_type?: string
}

export default function AlertsPage() {
  const [preferences, setPreferences] = useState<AlertPreferences>({
    budget_overspend: true,
    large_transaction: true,
    monthly_summary: true,
    bill_reminder: true,
    large_transaction_threshold: 500,
    bill_reminder_days: 3
  })
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPreferences()
    loadAlerts()
  }, [])

  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/alerts')
      if (response.ok) {
        const data = await response.json()
        setPreferences(data)
      }
    } catch (error) {
      console.error('Failed to load preferences:', error)
    }
  }

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/alerts/history')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data)
      }
    } catch (error) {
      console.error('Failed to load alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const savePreferences = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      })
      if (response.ok) {
        console.log('Preferences saved successfully')
      }
    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setSaving(false)
    }
  }

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/history/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledged: true })
      })
      if (response.ok) {
        setAlerts(alerts.map(alert =>
          alert.id === alertId ? { ...alert, acknowledged: true } : alert
        ))
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  const testAlert = async () => {
    try {
      await fetch('/api/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertType: 'test',
          message: 'This is a test alert from the finance tracker',
          relatedEntityId: null,
          relatedEntityType: null
        })
      })
      loadAlerts() // Refresh alerts
    } catch (error) {
      console.error('Failed to send test alert:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading alert settings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Alert Management</h1>
          <p className="text-gray-600">Configure your Poke notification preferences and view alert history</p>
        </div>

        {/* Alert Preferences */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Notification Preferences</h2>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Budget Overspend Alerts</h3>
                <p className="text-sm text-gray-600">Get notified when you exceed a budget category</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.budget_overspend}
                  onChange={(e) => setPreferences({...preferences, budget_overspend: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Large Transaction Alerts</h3>
                <p className="text-sm text-gray-600">Get notified for transactions above threshold</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">$</span>
                  <input
                    type="number"
                    value={preferences.large_transaction_threshold}
                    onChange={(e) => setPreferences({...preferences, large_transaction_threshold: parseInt(e.target.value) || 0})}
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.large_transaction}
                    onChange={(e) => setPreferences({...preferences, large_transaction: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Monthly Summary</h3>
                <p className="text-sm text-gray-600">Receive monthly spending and budget summaries</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.monthly_summary}
                  onChange={(e) => setPreferences({...preferences, monthly_summary: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Bill Reminders</h3>
                <p className="text-sm text-gray-600">Get reminded about upcoming bill due dates</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={preferences.bill_reminder_days}
                    onChange={(e) => setPreferences({...preferences, bill_reminder_days: parseInt(e.target.value) || 0})}
                    className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <span className="text-sm text-gray-600">days before</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preferences.bill_reminder}
                    onChange={(e) => setPreferences({...preferences, bill_reminder: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4 mt-8">
            <button
              onClick={savePreferences}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
            <button
              onClick={testAlert}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Send Test Alert
            </button>
          </div>
        </div>

        {/* Alert History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Alerts</h2>

          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No alerts yet. Configure your preferences above to start receiving notifications.
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg border ${
                    alert.acknowledged
                      ? 'border-gray-200 bg-gray-50'
                      : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          alert.alert_type === 'budget_overspend' ? 'bg-red-100 text-red-800' :
                          alert.alert_type === 'large_transaction' ? 'bg-yellow-100 text-yellow-800' :
                          alert.alert_type === 'bill_reminder' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {alert.alert_type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(alert.created_at).toLocaleDateString()} at {new Date(alert.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-800">{alert.message}</p>
                    </div>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="ml-4 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Acknowledge
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}