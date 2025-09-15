import { NextResponse } from 'next/server'
import { getCurrentMonthBills } from '../../../../lib/monthly-database'

export async function GET() {
  try {
    const bills = await getCurrentMonthBills()
    return NextResponse.json(bills)
  } catch (error) {
    console.error('Get current month bills error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch current month bills' },
      { status: 500 }
    )
  }
}