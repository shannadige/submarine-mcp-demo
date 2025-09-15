import { NextResponse } from 'next/server'
import { triggerBillReminderCheck } from '../../../../lib/simple-notifications'

export async function POST() {
  try {
    const result = await triggerBillReminderCheck()

    if (result.success) {
      return NextResponse.json({ message: result.message })
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Reminder check error:', error)
    return NextResponse.json(
      { error: 'Failed to check reminders' },
      { status: 500 }
    )
  }
}