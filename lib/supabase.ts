import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database Types
export interface DBTransaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  description: string
  date: string
  receipt_data?: any
  created_at?: string
  updated_at?: string
}

export interface DBBudget {
  id: string
  category: string
  limit: number
  spent: number
  period: 'monthly' | 'weekly' | 'yearly'
  created_at?: string
  updated_at?: string
}

export interface DBBill {
  id: string
  name: string
  amount: number
  due_date: string
  recurring: boolean
  paid: boolean
  created_at?: string
  updated_at?: string
}