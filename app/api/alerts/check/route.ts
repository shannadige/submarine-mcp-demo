import { NextResponse } from 'next/server'
import { checkAndSendBillAlerts, formatAlertSummary } from '../../../../lib/alert-system'

export async function POST() {
  try {
    console.log('⏰ Running bill alert check...')
    const result = await checkAndSendBillAlerts()
    const summary = formatAlertSummary(result)

    console.log(summary)

    return NextResponse.json({
      success: true,
      summary,
      details: result
    })
  } catch (error) {
    console.error('Alert check error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

// GET endpoint for cron jobs or manual testing
export async function GET() {
  return POST()
}