import { NextRequest, NextResponse } from 'next/server'
import { markCurrentMonthBillPaid } from '../../../../../lib/monthly-database'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const amount = body.amount || 0

    const payment = await markCurrentMonthBillPaid(id, amount)
    return NextResponse.json(payment)
  } catch (error) {
    console.error('Mark bill paid error:', error)
    return NextResponse.json(
      { error: 'Failed to mark bill as paid' },
      { status: 500 }
    )
  }
}