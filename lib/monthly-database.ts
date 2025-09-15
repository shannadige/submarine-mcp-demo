import { supabase } from './supabase'

export interface MonthlyBill {
  id: string
  name: string
  amount: number
  frequency: 'monthly' | 'quarterly' | 'yearly'
  due_day: number // 1-31
  autopay: boolean
  reminder_enabled: boolean
  reminder_days_before: number
  category: string
  notes?: string
  active: boolean
  created_at?: string
  updated_at?: string
}

export interface BillPayment {
  id: string
  bill_id: string
  year: number
  month: number
  paid_date?: string
  amount: number
  payment_method: 'autopay' | 'manual'
  created_at?: string
}

export interface MonthlyBillStatus {
  bill_id: string
  bill_name: string
  amount: number
  due_day: number
  autopay: boolean
  category: string
  frequency: string
  is_paid: boolean
  paid_date?: string
  days_until_due: number
  is_overdue: boolean
}

export interface BillAlert {
  id: string
  bill_id: string
  year: number
  month: number
  alert_type: string
  message: string
  sent_at: string
  acknowledged: boolean
}

// Get bills status for a specific month
export async function getMonthBillsStatus(year: number, month: number): Promise<MonthlyBillStatus[]> {
  const { data, error } = await supabase.rpc('get_month_bills_status', {
    target_year: year,
    target_month: month
  })

  if (error) {
    console.error('Get month bills status error:', error)
    throw error
  }

  return data || []
}

// Get current month bills (most common use case)
export async function getCurrentMonthBills(): Promise<MonthlyBillStatus[]> {
  const now = new Date()
  return getMonthBillsStatus(now.getFullYear(), now.getMonth() + 1)
}

// Get next month bills
export async function getNextMonthBills(): Promise<MonthlyBillStatus[]> {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return getMonthBillsStatus(nextMonth.getFullYear(), nextMonth.getMonth() + 1)
}

// Get all bill templates (for editing)
export async function getAllBills(): Promise<MonthlyBill[]> {
  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('active', true)
    .order('due_day')

  if (error) {
    console.error('Get all bills error:', error)
    throw error
  }

  return data || []
}

// Create a new bill
export async function createBill(bill: Omit<MonthlyBill, 'id' | 'created_at' | 'updated_at'>): Promise<MonthlyBill> {
  const { data, error } = await supabase
    .from('bills')
    .insert([bill])
    .select()
    .single()

  if (error) {
    console.error('Create bill error:', error)
    throw error
  }

  return data
}

// Update a bill
export async function updateBill(id: string, updates: Partial<MonthlyBill>): Promise<MonthlyBill> {
  const { data, error } = await supabase
    .from('bills')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Update bill error:', error)
    throw error
  }

  return data
}

// Delete a bill
export async function deleteBill(id: string): Promise<void> {
  const { error } = await supabase
    .from('bills')
    .update({ active: false })
    .eq('id', id)

  if (error) {
    console.error('Delete bill error:', error)
    throw error
  }
}

// Mark bill as paid for specific month
export async function markBillPaidForMonth(
  billId: string,
  year: number,
  month: number,
  amount: number,
  paymentMethod: 'autopay' | 'manual' = 'manual'
): Promise<BillPayment> {
  const { data, error } = await supabase
    .from('bill_payments')
    .upsert({
      bill_id: billId,
      year,
      month,
      paid_date: new Date().toISOString().split('T')[0],
      amount,
      payment_method: paymentMethod
    })
    .select()
    .single()

  if (error) {
    console.error('Mark bill paid error:', error)
    throw error
  }

  return data
}

// Mark current month bill as paid (most common use case)
export async function markCurrentMonthBillPaid(billId: string, amount: number): Promise<BillPayment> {
  const now = new Date()
  return markBillPaidForMonth(billId, now.getFullYear(), now.getMonth() + 1, amount, 'manual')
}

// Get bills due soon (within reminder window, not yet paid, manual payment)
export async function getBillsDueSoon(): Promise<MonthlyBillStatus[]> {
  const bills = await getCurrentMonthBills()
  const today = new Date().getDate()

  return bills.filter(bill =>
    !bill.autopay && // Manual payment only
    !bill.is_paid && // Not yet paid
    bill.days_until_due <= 7 && // Due within 7 days
    bill.days_until_due >= -3 // Not more than 3 days overdue
  )
}

// Get overdue bills (past due, manual payment, not paid)
export async function getOverdueBills(): Promise<MonthlyBillStatus[]> {
  const bills = await getCurrentMonthBills()

  return bills.filter(bill =>
    !bill.autopay && // Manual payment only
    !bill.is_paid && // Not yet paid
    bill.is_overdue // Past the due day
  )
}

// Log bill alert
export async function logBillAlert(
  billId: string,
  alertType: string,
  message: string,
  year?: number,
  month?: number
): Promise<BillAlert> {
  const now = new Date()
  const targetYear = year || now.getFullYear()
  const targetMonth = month || now.getMonth() + 1

  const { data, error } = await supabase
    .from('bill_alerts')
    .insert({
      bill_id: billId,
      year: targetYear,
      month: targetMonth,
      alert_type: alertType,
      message
    })
    .select()
    .single()

  if (error) {
    console.error('Log bill alert error:', error)
    throw error
  }

  return data
}

// Get recent alerts
export async function getRecentAlerts(limit: number = 10): Promise<BillAlert[]> {
  const { data, error } = await supabase
    .from('bill_alerts')
    .select(`
      *,
      bills!bill_alerts_bill_id_fkey(name)
    `)
    .order('sent_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Get recent alerts error:', error)
    throw error
  }

  return data || []
}

// Get monthly summary
export async function getMonthlyBillsSummary(year?: number, month?: number) {
  const now = new Date()
  const targetYear = year || now.getFullYear()
  const targetMonth = month || now.getMonth() + 1

  const bills = await getMonthBillsStatus(targetYear, targetMonth)

  return {
    totalBills: bills.length,
    autopayBills: bills.filter(b => b.autopay).length,
    manualBills: bills.filter(b => !b.autopay).length,
    paidBills: bills.filter(b => b.is_paid).length,
    unpaidBills: bills.filter(b => !b.is_paid).length,
    overdueBills: bills.filter(b => b.is_overdue && !b.is_paid).length,
    dueSoonBills: bills.filter(b => !b.autopay && !b.is_paid && b.days_until_due <= 7 && b.days_until_due >= 0).length,
    totalAmount: bills.reduce((sum, bill) => sum + bill.amount, 0),
    paidAmount: bills.filter(b => b.is_paid).reduce((sum, bill) => sum + bill.amount, 0),
    unpaidAmount: bills.filter(b => !b.is_paid).reduce((sum, bill) => sum + bill.amount, 0)
  }
}