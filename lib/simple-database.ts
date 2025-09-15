import { supabase } from './supabase'

// Simplified Bill interface for subscriptions/recurring bills only
export interface SimpleBill {
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

export interface BillAlert {
  id: string
  bill_id: string
  alert_type: string
  message: string
  sent_at: string
  acknowledged: boolean
}

// Get all active bills
export async function getAllBills(): Promise<SimpleBill[]> {
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('active', true)
    .order('next_due_date', { ascending: true })

  if (error) throw error
  return data || []
}

// Get bills due within specified days
export async function getBillsDueSoon(daysAhead: number = 7): Promise<SimpleBill[]> {
  const today = new Date()
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysAhead)

  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('active', true)
    .gte('next_due_date', today.toISOString().split('T')[0])
    .lte('next_due_date', futureDate.toISOString().split('T')[0])
    .order('next_due_date', { ascending: true })

  if (error) throw error
  return data || []
}

// Get bills that need manual payment (not autopay)
export async function getManualPaymentBills(): Promise<SimpleBill[]> {
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('active', true)
    .eq('autopay', false)
    .order('next_due_date', { ascending: true })

  if (error) throw error
  return data || []
}

// Create a new bill/subscription
export async function createBill(bill: Omit<SimpleBill, 'id' | 'created_at' | 'updated_at'>): Promise<SimpleBill> {
  const { data, error } = await supabase
    .from('bills')
    .insert(bill)
    .select()
    .single()

  if (error) throw error
  return data
}

// Update an existing bill
export async function updateBill(id: string, updates: Partial<SimpleBill>): Promise<SimpleBill> {
  const { data, error } = await supabase
    .from('bills')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Delete a bill (mark as inactive)
export async function deleteBill(id: string): Promise<void> {
  const { error } = await supabase
    .from('bills')
    .update({ active: false })
    .eq('id', id)

  if (error) throw error
}

// Update next due date after payment (for manual bills)
export async function markBillAsPaid(id: string): Promise<SimpleBill> {
  // Get the current bill to calculate next due date
  const { data: bill, error: fetchError } = await supabase
    .from('bills')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError) throw fetchError

  // Calculate next due date using the database function
  const { data: nextDueDateResult, error: calcError } = await supabase
    .rpc('calculate_next_due_date', {
      current_due_date: bill.next_due_date,
      frequency_type: bill.frequency
    })

  if (calcError) throw calcError

  // Update the bill with the new due date
  const { data, error } = await supabase
    .from('bills')
    .update({ next_due_date: nextDueDateResult })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Toggle autopay status
export async function toggleAutopay(id: string, autopay: boolean): Promise<SimpleBill> {
  const { data, error } = await supabase
    .from('bills')
    .update({ autopay })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Get bill alerts
export async function getBillAlerts(limit: number = 50): Promise<BillAlert[]> {
  const { data, error } = await supabase
    .from('bill_alerts')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

// Log a bill alert
export async function logBillAlert(billId: string, alertType: string, message: string): Promise<BillAlert> {
  const { data, error } = await supabase
    .from('bill_alerts')
    .insert({
      bill_id: billId,
      alert_type: alertType,
      message
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Acknowledge an alert
export async function acknowledgeBillAlert(alertId: string): Promise<BillAlert> {
  const { data, error } = await supabase
    .from('bill_alerts')
    .update({ acknowledged: true })
    .eq('id', alertId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Get bills summary
export async function getBillsSummary() {
  const allBills = await getAllBills()
  const manualBills = allBills.filter(bill => !bill.autopay)
  const autoBills = allBills.filter(bill => bill.autopay)

  const totalMonthlyAmount = allBills.reduce((sum, bill) => {
    // Convert all frequencies to monthly equivalent for comparison
    const monthlyAmount = bill.frequency === 'weekly' ? bill.amount * 4.33 :
                         bill.frequency === 'monthly' ? bill.amount :
                         bill.frequency === 'quarterly' ? bill.amount / 3 :
                         bill.amount / 12 // yearly
    return sum + monthlyAmount
  }, 0)

  return {
    totalBills: allBills.length,
    manualPaymentBills: manualBills.length,
    autopayBills: autoBills.length,
    estimatedMonthlyTotal: totalMonthlyAmount,
    bills: allBills
  }
}