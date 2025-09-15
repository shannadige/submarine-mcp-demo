import { NextRequest, NextResponse } from 'next/server'
import { markBillAsPaid } from '../../../../../lib/simple-database'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const bill = await markBillAsPaid(id)
    return NextResponse.json(bill)
  } catch (error) {
    console.error('Mark bill paid error:', error)
    return NextResponse.json(
      { error: 'Failed to mark bill as paid' },
      { status: 500 }
    )
  }
}