import { getBillsDueSoon, logBillAlert } from './simple-database'

// Send Poke notification
export async function sendPokeNotification(message: string): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_POKE_API_KEY) {
    console.log('Poke notification (no API key):', message)
    return false
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
        from: 'Bills Tracker'
      })
    })

    return response.ok
  } catch (error) {
    console.error('Poke notification error:', error)
    return false
  }
}

// Check for bills that need reminders
export async function checkBillReminders(): Promise<void> {
  try {
    const billsDueSoon = await getBillsDueSoon(7) // Check 7 days ahead
    const today = new Date()

    for (const bill of billsDueSoon) {
      // Only send reminders for manual payment bills with reminders enabled
      if (bill.autopay || !bill.reminder_enabled) {
        continue
      }

      const dueDate = new Date(bill.next_due_date)
      const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      // Check if we should send a reminder based on reminder_days_before
      if (daysUntil <= bill.reminder_days_before && daysUntil >= 0) {
        let alertType = 'reminder'
        let message = ''

        if (daysUntil === 0) {
          alertType = 'due_today'
          message = `💳 Bill Due Today: ${bill.name} - $${bill.amount} (Manual payment required)`
        } else if (daysUntil === 1) {
          alertType = 'due_tomorrow'
          message = `⏰ Bill Due Tomorrow: ${bill.name} - $${bill.amount} (Manual payment required)`
        } else {
          message = `🔔 Bill Reminder: ${bill.name} - $${bill.amount} due in ${daysUntil} days (Manual payment required)`
        }

        // Check if we already sent this reminder today
        const shouldSend = await shouldSendReminder(bill.id, alertType)

        if (shouldSend) {
          // Log the alert
          await logBillAlert(bill.id, alertType, message)

          // Send Poke notification
          await sendPokeNotification(message)

          console.log(`Sent reminder for ${bill.name}: ${message}`)
        }
      }
    }

    // Check for overdue bills
    const overdueBills = billsDueSoon.filter(bill => {
      const daysUntil = Math.ceil((new Date(bill.next_due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysUntil < 0 && !bill.autopay
    })

    for (const bill of overdueBills) {
      const daysOverdue = Math.abs(Math.ceil((new Date(bill.next_due_date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
      const message = `🚨 OVERDUE: ${bill.name} - $${bill.amount} (${daysOverdue} days overdue)`

      const shouldSend = await shouldSendReminder(bill.id, 'overdue')
      if (shouldSend) {
        await logBillAlert(bill.id, 'overdue', message)
        await sendPokeNotification(message)
        console.log(`Sent overdue notice for ${bill.name}`)
      }
    }

  } catch (error) {
    console.error('Error checking bill reminders:', error)
  }
}

// Check if we should send a reminder (avoid spam)
async function shouldSendReminder(billId: string, alertType: string): Promise<boolean> {
  try {
    // For this simple system, we'll send reminders once per day maximum
    const { supabase } = await import('./supabase')
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data, error } = await supabase
      .from('bill_alerts')
      .select('*')
      .eq('bill_id', billId)
      .eq('alert_type', alertType)
      .gte('sent_at', today.toISOString())

    if (error) throw error

    // If we already sent this type of alert today, don't send again
    return !data || data.length === 0
  } catch (error) {
    console.error('Error checking reminder history:', error)
    return false // Err on the side of not spamming
  }
}

// Manual trigger for checking reminders (can be called from API or cron)
export async function triggerBillReminderCheck(): Promise<{ success: boolean; message: string }> {
  try {
    await checkBillReminders()
    return {
      success: true,
      message: 'Bill reminder check completed successfully'
    }
  } catch (error) {
    return {
      success: false,
      message: `Bill reminder check failed: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}