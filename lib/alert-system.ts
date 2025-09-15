import { getCurrentMonthBills, logBillAlert } from './monthly-database'

export interface AlertResult {
  sent: number
  skipped: number
  errors: string[]
}

async function sendPokeNotification(message: string): Promise<{ success: boolean, error?: string }> {
  if (!process.env.NEXT_PUBLIC_POKE_API_KEY) {
    console.log('Poke notification (no API key):', message)
    return { success: false, error: "No Poke API key configured" }
  }

  try {
    const response = await fetch('https://poke.com/api/v1/inbound-sms/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_POKE_API_KEY}`
      },
      body: JSON.stringify({
        message,
        from: 'Monthly Bills Tracker'
      })
    })

    if (!response.ok) {
      throw new Error(`Poke API error: ${response.status}`)
    }

    return { success: true }
  } catch (error) {
    console.error('Poke notification error:', error)
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function checkAndSendBillAlerts(): Promise<AlertResult> {
  const result: AlertResult = {
    sent: 0,
    skipped: 0,
    errors: []
  }

  try {
    const bills = await getCurrentMonthBills()
    const today = new Date()
    const currentDay = today.getDate()

    for (const bill of bills) {
      // Skip if already paid
      if (bill.is_paid) {
        result.skipped++
        continue
      }

      // Skip autopay bills unless they're overdue
      if (bill.autopay && !bill.is_overdue) {
        result.skipped++
        continue
      }

      let shouldAlert = false
      let alertType = ''
      let message = ''

      // Check if bill is overdue
      if (bill.is_overdue) {
        shouldAlert = true
        alertType = 'overdue'
        const daysOverdue = Math.abs(bill.days_until_due)
        message = `🚨 OVERDUE: ${bill.bill_name} ($${bill.amount}) was due ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} ago. Please pay immediately!`
      }
      // Check if bill is due today
      else if (bill.days_until_due === 0) {
        shouldAlert = true
        alertType = 'due_today'
        message = `⏰ DUE TODAY: ${bill.bill_name} ($${bill.amount}) is due today. Don't forget to pay!`
      }
      // Check if bill is due tomorrow (1 day reminder)
      else if (bill.days_until_due === 1) {
        shouldAlert = true
        alertType = 'reminder'
        message = `📅 REMINDER: Tomorrow, you have ${bill.bill_name} ($${bill.amount}) due. Plan ahead!`
      }
      // Check if bill is due in 3 days (advance reminder)
      else if (bill.days_until_due === 3 && bill.reminder_enabled) {
        shouldAlert = true
        alertType = 'advance_reminder'
        message = `🔔 HEADS UP: ${bill.bill_name} ($${bill.amount}) is due in 3 days on the ${bill.due_day}${getOrdinalSuffix(bill.due_day)}.`
      }

      if (shouldAlert) {
        // Send Poke notification
        const pokeResult = await sendPokeNotification(message)

        if (pokeResult.success) {
          // Log the alert in database
          await logBillAlert(bill.bill_id, alertType, message)
          result.sent++
          console.log(`Alert sent: ${message}`)
        } else {
          result.errors.push(`Failed to send alert for ${bill.bill_name}: ${pokeResult.error}`)
        }
      } else {
        result.skipped++
      }
    }

    return result
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    result.errors.push(`Alert system error: ${errorMsg}`)
    return result
  }
}

function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) {
    return 'th'
  }
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}

// Helper function to format alert summary
export function formatAlertSummary(result: AlertResult): string {
  let summary = `📊 Alert Summary: ${result.sent} sent, ${result.skipped} skipped`

  if (result.errors.length > 0) {
    summary += `\n❌ Errors:\n${result.errors.map(e => `• ${e}`).join('\n')}`
  }

  return summary
}