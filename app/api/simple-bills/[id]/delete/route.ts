import { NextRequest, NextResponse } from 'next/server'
import { deleteBill } from '../../../../../lib/simple-database'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteBill(id)
    return NextResponse.json({ success: true, message: 'Bill deleted successfully' })
  } catch (error) {
    console.error('Delete bill error:', error)
    return NextResponse.json(
      { error: 'Failed to delete bill' },
      { status: 500 }
    )
  }
}