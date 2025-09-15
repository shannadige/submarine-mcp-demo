import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  getCurrentMonthBills,
  getNextMonthBills,
  getAllBills,
  createBill,
  updateBill,
  deleteBill,
  markCurrentMonthBillPaid,
  getMonthlyBillsSummary,
  getBillsDueSoon,
  getOverdueBills,
  logBillAlert
} from "../../lib/monthly-database";
import { checkAndSendBillAlerts, formatAlertSummary } from "../../lib/alert-system";

// Poke API integration for notifications
async function sendPokeNotification(message: string) {
  if (!process.env.NEXT_PUBLIC_POKE_API_KEY) {
    console.log('Poke notification (no API key):', message);
    return { success: false, error: "No Poke API key configured" };
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
    });

    if (!response.ok) {
      throw new Error(`Poke API error: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Poke notification error:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

const mcpHandler = createMcpHandler((server) => {
  // Add Bill Tool
  server.tool(
    "add_bill",
    "Add a new recurring bill or subscription with a specific due day of month",
    {
      name: z.string().describe("Name of the bill (e.g., Netflix, Rent, Electric Bill)"),
      amount: z.number().positive().describe("Monthly amount in dollars"),
      dueDay: z.number().min(1).max(31).describe("Day of month when bill is due (1-31)"),
      frequency: z.enum(['monthly', 'quarterly', 'yearly']).default('monthly'),
      autopay: z.boolean().default(false).describe("True if bill is automatically paid"),
      category: z.string().default('subscription').describe("Category like streaming, utilities, housing")
    },
    async ({ name, amount, dueDay, frequency, autopay, category }) => {
      try {
        const bill = await createBill({
          name,
          amount,
          due_day: dueDay,
          frequency,
          autopay,
          category,
          reminder_enabled: true,
          reminder_days_before: 3,
          active: true
        });

        const autopayText = autopay ? ' 🤖 (autopay enabled)' : ' 💳 (manual payment)';
        const message = `✅ Added bill: ${name} - $${amount} due on ${dueDay}${autopayText}`;

        await logBillAlert(bill.id, 'bill_created', message);
        await sendPokeNotification(message);

        return {
          content: [{
            type: "text",
            text: message
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `❌ Failed to add bill: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // List Current Month Bills
  server.tool(
    "current_month_bills",
    "Show all bills for the current month with payment status",
    {},
    async () => {
      try {
        const bills = await getCurrentMonthBills();
        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        if (bills.length === 0) {
          return {
            content: [{
              type: "text",
              text: `📋 No bills for ${currentMonth}`
            }]
          };
        }

        let message = `📅 ${currentMonth} Bills:\n\n`;

        bills.forEach(bill => {
          const statusIcon = bill.is_paid ? '✅' : bill.is_overdue ? '⚠️' : '⏳';
          const paymentType = bill.autopay ? '🤖' : '💳';
          const daysText = bill.days_until_due >= 0
            ? (bill.days_until_due === 0 ? 'Due today' : `${bill.days_until_due} days`)
            : `${Math.abs(bill.days_until_due)} days overdue`;

          message += `${statusIcon} ${bill.bill_name} - $${bill.amount}\n`;
          message += `   Due ${bill.due_day} (${daysText}) ${paymentType}\n`;
          if (bill.is_paid && bill.paid_date) {
            message += `   Paid on ${new Date(bill.paid_date).getDate()}\n`;
          }
          message += '\n';
        });

        return {
          content: [{
            type: "text",
            text: message
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `❌ Failed to get current month bills: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Check Due Soon Bills
  server.tool(
    "check_due_bills",
    "Check bills that are due soon and need manual payment",
    {},
    async () => {
      try {
        const dueSoon = await getBillsDueSoon();
        const overdue = await getOverdueBills();

        if (dueSoon.length === 0 && overdue.length === 0) {
          return {
            content: [{
              type: "text",
              text: "✨ No manual bills due soon! All bills are either paid, on autopay, or not due yet."
            }]
          };
        }

        let message = "";

        if (overdue.length > 0) {
          message += "🚨 OVERDUE BILLS (Manual Payment Required):\n\n";
          overdue.forEach(bill => {
            const daysOverdue = Math.abs(bill.days_until_due);
            message += `⚠️ ${bill.bill_name} - $${bill.amount}\n`;
            message += `   Due ${bill.due_day} (${daysOverdue} days overdue) 💳\n\n`;
          });
        }

        if (dueSoon.length > 0) {
          message += "📅 DUE SOON (Manual Payment Required):\n\n";
          dueSoon.forEach(bill => {
            const daysText = bill.days_until_due === 0 ? 'Due today' : `${bill.days_until_due} days`;
            message += `⏳ ${bill.bill_name} - $${bill.amount}\n`;
            message += `   Due ${bill.due_day} (${daysText}) 💳\n\n`;
          });
        }

        return {
          content: [{
            type: "text",
            text: message
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `❌ Failed to check due bills: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Mark Bill Paid
  server.tool(
    "mark_bill_paid",
    "Mark a bill as paid for the current month",
    {
      billName: z.string().describe("Name of the bill to mark as paid"),
      sendConfirmation: z.boolean().default(true).describe("Send Poke notification")
    },
    async ({ billName, sendConfirmation }) => {
      try {
        const bills = await getCurrentMonthBills();
        const bill = bills.find(b =>
          b.bill_name.toLowerCase().includes(billName.toLowerCase()) && !b.is_paid
        );

        if (!bill) {
          return {
            content: [{
              type: "text",
              text: `❌ No unpaid bill found matching: ${billName}`
            }]
          };
        }

        await markCurrentMonthBillPaid(bill.bill_id, bill.amount);

        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long' });
        const message = `✅ Marked ${bill.bill_name} as paid for ${currentMonth}! ($${bill.amount})`;

        await logBillAlert(bill.bill_id, 'payment_recorded', message);

        if (sendConfirmation) {
          await sendPokeNotification(message);
        }

        return {
          content: [{
            type: "text",
            text: message
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `❌ Failed to mark bill as paid: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Bills Summary
  server.tool(
    "bills_summary",
    "Get monthly bills summary with payment status",
    {},
    async () => {
      try {
        const summary = await getMonthlyBillsSummary();
        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        const message = `📊 ${currentMonth} Bills Summary:

📋 Total Bills: ${summary.totalBills}
✅ Paid: ${summary.paidBills}
⏳ Unpaid: ${summary.unpaidBills}
⚠️ Overdue: ${summary.overdueBills}
🤖 Auto-Pay: ${summary.autopayBills}
💳 Manual: ${summary.manualBills}

💰 Total Amount: $${summary.totalAmount.toFixed(2)}
✅ Paid Amount: $${summary.paidAmount.toFixed(2)}
⏳ Remaining: $${summary.unpaidAmount.toFixed(2)}

Use 'check_due_bills' to see what needs attention!`;

        return {
          content: [{
            type: "text",
            text: message
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `❌ Failed to get bills summary: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Next Month Preview
  server.tool(
    "next_month_bills",
    "Preview bills for next month",
    {},
    async () => {
      try {
        const bills = await getNextMonthBills();
        const nextMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1)
          .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        if (bills.length === 0) {
          return {
            content: [{
              type: "text",
              text: `📋 No bills scheduled for ${nextMonth}`
            }]
          };
        }

        let message = `🗓️ ${nextMonth} Bills Preview:\n\n`;

        bills.forEach(bill => {
          const paymentType = bill.autopay ? '🤖 Auto' : '💳 Manual';
          message += `• ${bill.bill_name} - $${bill.amount}\n`;
          message += `  Due ${bill.due_day} (${paymentType})\n\n`;
        });

        const totalAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
        message += `💰 Total: $${totalAmount.toFixed(2)}`;

        return {
          content: [{
            type: "text",
            text: message
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `❌ Failed to get next month bills: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Edit Bill Template
  server.tool(
    "edit_bill",
    "Edit a bill template (affects future months, not current payments)",
    {
      billName: z.string().describe("Name of the bill to edit"),
      newAmount: z.number().positive().optional().describe("New amount"),
      newDueDay: z.number().min(1).max(31).optional().describe("New due day (1-31)"),
      newAutopay: z.boolean().optional().describe("New autopay setting")
    },
    async ({ billName, newAmount, newDueDay, newAutopay }) => {
      try {
        const bills = await getAllBills();
        const bill = bills.find(b => b.name.toLowerCase().includes(billName.toLowerCase()));

        if (!bill) {
          return {
            content: [{
              type: "text",
              text: `❌ Bill template not found: ${billName}`
            }]
          };
        }

        const updates: any = {};
        if (newAmount !== undefined) updates.amount = newAmount;
        if (newDueDay !== undefined) updates.due_day = newDueDay;
        if (newAutopay !== undefined) updates.autopay = newAutopay;

        if (Object.keys(updates).length === 0) {
          return {
            content: [{
              type: "text",
              text: `❌ No changes specified for ${bill.name}`
            }]
          };
        }

        await updateBill(bill.id, updates);

        let changes = [];
        if (newAmount !== undefined) changes.push(`amount: $${newAmount}`);
        if (newDueDay !== undefined) changes.push(`due day: ${newDueDay}`);
        if (newAutopay !== undefined) changes.push(`autopay: ${newAutopay ? 'enabled' : 'disabled'}`);

        const message = `✅ Updated ${bill.name}: ${changes.join(', ')}`;

        await logBillAlert(bill.id, 'bill_updated', message);

        return {
          content: [{
            type: "text",
            text: message
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `❌ Failed to edit bill: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Delete Bill
  server.tool(
    "delete_bill",
    "Delete a bill template (stops tracking for future months)",
    {
      billName: z.string().describe("Name of the bill to delete")
    },
    async ({ billName }) => {
      try {
        const bills = await getAllBills();
        const bill = bills.find(b => b.name.toLowerCase().includes(billName.toLowerCase()));

        if (!bill) {
          return {
            content: [{
              type: "text",
              text: `❌ Bill template not found: ${billName}`
            }]
          };
        }

        await deleteBill(bill.id);

        const message = `🗑️ Deleted bill template: ${bill.name}`;
        await logBillAlert(bill.id, 'bill_deleted', message);

        return {
          content: [{
            type: "text",
            text: message
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `❌ Failed to delete bill: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Check and Send Bill Alerts
  server.tool(
    "check_bill_alerts",
    "Check for due bills and send proactive Poke notifications",
    {},
    async () => {
      try {
        const result = await checkAndSendBillAlerts();
        const summary = formatAlertSummary(result);

        return {
          content: [{
            type: "text",
            text: summary
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `❌ Failed to check bill alerts: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
});

export const GET = mcpHandler;
export const POST = mcpHandler;