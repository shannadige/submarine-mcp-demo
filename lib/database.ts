import { supabase, DBTransaction, DBBudget, DBBill } from './supabase'

// Transaction operations
export async function createTransaction(transaction: Omit<DBTransaction, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('transactions')
    .insert(transaction)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getTransactions(filters?: {
  type?: 'income' | 'expense'
  category?: string
  startDate?: string
  endDate?: string
}) {
  let query = supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }
  if (filters?.category) {
    query = query.eq('category', filters.category)
  }
  if (filters?.startDate) {
    query = query.gte('date', filters.startDate)
  }
  if (filters?.endDate) {
    query = query.lte('date', filters.endDate)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getTransactionsByDateRange(startDate: string, endDate: string) {
  return getTransactions({ startDate, endDate })
}

// Budget operations
export async function createOrUpdateBudget(budget: Omit<DBBudget, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('budgets')
    .upsert(budget, { onConflict: 'category' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getBudgets() {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .order('category', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getBudgetByCategory(category: string) {
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('category', category)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
  return data
}

export async function updateBudgetSpent(category: string, amount: number) {
  // Get current budget
  const budget = await getBudgetByCategory(category)
  if (!budget) return null

  // Update spent amount
  const { data, error } = await supabase
    .from('budgets')
    .update({ spent: budget.spent + amount })
    .eq('category', category)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function resetBudgetSpent(category: string) {
  const { data, error } = await supabase
    .from('budgets')
    .update({ spent: 0 })
    .eq('category', category)
    .select()
    .single()

  if (error) throw error
  return data
}

// Bill operations
export async function createBill(bill: Omit<DBBill, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('bills')
    .insert(bill)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getBills(filters?: {
  paid?: boolean
  dueBefore?: string
  dueAfter?: string
}) {
  let query = supabase
    .from('bills')
    .select('*')
    .order('due_date', { ascending: true })

  if (filters?.paid !== undefined) {
    query = query.eq('paid', filters.paid)
  }
  if (filters?.dueBefore) {
    query = query.lte('due_date', filters.dueBefore)
  }
  if (filters?.dueAfter) {
    query = query.gte('due_date', filters.dueAfter)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function getDueBills(daysAhead: number) {
  const today = new Date().toISOString().split('T')[0]
  const futureDate = new Date()
  futureDate.setDate(futureDate.getDate() + daysAhead)
  const futureDateStr = futureDate.toISOString().split('T')[0]

  return getBills({
    paid: false,
    dueAfter: today,
    dueBefore: futureDateStr
  })
}

export async function updateBillPaidStatus(id: string, paid: boolean) {
  const { data, error } = await supabase
    .from('bills')
    .update({ paid })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

// Utility functions
export async function getFinancialSummary(period: 'week' | 'month' | 'year') {
  const now = new Date()
  const startDate = new Date()

  if (period === 'week') {
    startDate.setDate(now.getDate() - 7)
  } else if (period === 'month') {
    startDate.setMonth(now.getMonth() - 1)
  } else {
    startDate.setFullYear(now.getFullYear() - 1)
  }

  const transactions = await getTransactionsByDateRange(
    startDate.toISOString().split('T')[0],
    now.toISOString().split('T')[0]
  )

  const income = transactions.filter(t => t.type === 'income')
  const expenses = transactions.filter(t => t.type === 'expense')

  const totalIncome = income.reduce((sum, t) => sum + t.amount, 0)
  const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0)

  // Group expenses by category
  const expensesByCategory: Record<string, number> = {}
  expenses.forEach(t => {
    expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount
  })

  return {
    period,
    totalIncome,
    totalExpenses,
    netIncome: totalIncome - totalExpenses,
    expensesByCategory,
    transactionCount: transactions.length
  }
}