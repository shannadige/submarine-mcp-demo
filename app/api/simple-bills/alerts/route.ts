import { NextResponse } from 'next/server'
import { getBillAlerts } from '../../../../lib/simple-database'

export async function GET() {
  try {
    const alerts = await getBillAlerts(20)
    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Get alerts error:', error)
    return NextResponse.json(
      { error: 'Failed to load alerts' },
      { status: 500 }
    )
  }
}