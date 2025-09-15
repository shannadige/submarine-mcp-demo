import { NextRequest, NextResponse } from 'next/server'
import { updateBill } from '../../../../lib/simple-database'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const bill = await updateBill(id, body)
    return NextResponse.json(bill)
  } catch (error) {
    console.error('Update bill error:', error)
    return NextResponse.json(
      { error: 'Failed to update bill' },
      { status: 500 }
    )
  }
}