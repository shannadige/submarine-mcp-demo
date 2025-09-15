import { NextRequest, NextResponse } from 'next/server'
import { createBill, getAllBills } from '../../../lib/monthly-database'

export async function GET() {
  try {
    const bills = await getAllBills()
    return NextResponse.json(bills)
  } catch (error) {
    console.error('Get bills error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bills' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const bill = await createBill(body)
    return NextResponse.json(bill)
  } catch (error) {
    console.error('Create bill error:', error)
    return NextResponse.json(
      { error: 'Failed to create bill' },
      { status: 500 }
    )
  }
}