import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import {
  getAllBills,
  getBillsDueSoon,
  getManualPaymentBills,
  createBill,
  updateBill,
  deleteBill,
  markBillAsPaid,
  toggleAutopay,
  getBillsSummary,
  logBillAlert
} from "../../lib/simple-database";

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
        from: 'Bills Tracker'
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
  // Add Bill/Subscription Tool
  server.tool(
    "add_bill",
    "Add a new recurring bill or subscription",
    {
      name: z.string().describe("Name of the bill/subscription (e.g., Netflix, Rent, Electric Bill)"),
      amount: z.number().positive().describe("Amount of the bill"),
      frequency: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).describe("How often the bill recurs"),
      nextDueDate: z.string().describe("Next due date (YYYY-MM-DD format)"),
      autopay: z.boolean().default(false).describe("Is this bill on autopay?"),
      category: z.string().default('subscription').describe("Category (e.g., streaming, utilities, housing)"),
      notes: z.string().optional().describe("Optional notes about the bill")
    },
    async ({ name, amount, frequency, nextDueDate, autopay, category, notes }) => {
      try {
        const bill = await createBill({
          name,
          amount,
          frequency,
          next_due_date: nextDueDate,
          autopay,
          reminder_enabled: true,
          reminder_days_before: 3,
          category,
          notes,
          active: true
        });

        const autopayText = autopay ? "🤖 Autopay enabled" : "💳 Manual payment";
        const message = `✅ Bill added: ${name} - $${amount} ${frequency} (${autopayText})`;

        // Log the addition as an alert
        await logBillAlert(bill.id, 'bill_added', message);

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

  // List Bills Tool
  server.tool(
    "list_bills",
    "Get all active bills and subscriptions",
    {
      filter: z.enum(['all', 'due_soon', 'manual_only']).default('all').describe("Filter bills to show")
    },
    async ({ filter }) => {
      try {
        let bills;
        switch (filter) {
          case 'due_soon':
            bills = await getBillsDueSoon(7);
            break;
          case 'manual_only':
            bills = await getManualPaymentBills();
            break;
          default:
            bills = await getAllBills();
        }

        if (bills.length === 0) {
          return {
            content: [{
              type: "text",
              text: "📋 No bills found. Use add_bill to start tracking your subscriptions and bills."
            }]
          };
        }

        const billsList = bills.map(bill => {
          const autopayIcon = bill.autopay ? "🤖" : "💳";
          const daysUntilDue = Math.ceil((new Date(bill.next_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          const urgency = daysUntilDue <= 0 ? "⚠️ OVERDUE" :
                         daysUntilDue <= 3 ? "🔔 DUE SOON" :
                         `📅 ${daysUntilDue} days`;

          return `${autopayIcon} ${bill.name}: $${bill.amount} ${bill.frequency} - ${urgency} (${new Date(bill.next_due_date).toLocaleDateString()})`;
        }).join('\n');

        return {
          content: [{
            type: "text",
            text: `📋 Your Bills & Subscriptions:\n\n${billsList}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `❌ Failed to list bills: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Check Due Bills Tool
  server.tool(
    "check_due_bills",
    "Check for bills due soon and send reminders",
    {
      daysAhead: z.number().default(7).describe("How many days ahead to check for due bills"),
      sendNotifications: z.boolean().default(true).describe("Send Poke notifications for due bills")
    },
    async ({ daysAhead, sendNotifications }) => {
      try {
        const dueBills = await getBillsDueSoon(daysAhead);
        const manualBills = dueBills.filter(bill => !bill.autopay && bill.reminder_enabled);

        if (manualBills.length === 0) {
          return {
            content: [{
              type: "text",
              text: `✅ No manual payment bills due in the next ${daysAhead} days.`
            }]
          };
        }

        const billsList = manualBills.map(bill => {
          const daysUntil = Math.ceil((new Date(bill.next_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          const urgency = daysUntil <= 0 ? "OVERDUE" : daysUntil <= 1 ? "DUE TODAY/TOMORROW" : `due in ${daysUntil} days`;
          return `💳 ${bill.name}: $${bill.amount} - ${urgency}`;
        }).join('\n');

        const message = `🔔 Bills Requiring Manual Payment:\n\n${billsList}`;

        // Log alerts for each bill
        for (const bill of manualBills) {
          const daysUntil = Math.ceil((new Date(bill.next_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
          const alertType = daysUntil <= 0 ? 'overdue' : daysUntil <= 1 ? 'due_today' : 'reminder';
          await logBillAlert(bill.id, alertType, `${bill.name} payment reminder: $${bill.amount} due ${new Date(bill.next_due_date).toLocaleDateString()}`);
        }

        // Send Poke notification if enabled
        if (sendNotifications) {
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
            text: `❌ Failed to check due bills: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Mark Bill as Paid Tool
  server.tool(
    "mark_bill_paid",
    "Mark a manual bill as paid and update its next due date",
    {
      billName: z.string().describe("Name of the bill that was paid"),
      sendConfirmation: z.boolean().default(true).describe("Send Poke confirmation")
    },
    async ({ billName, sendConfirmation }) => {
      try {
        // Find the bill by name
        const bills = await getAllBills();
        const bill = bills.find(b => b.name.toLowerCase().includes(billName.toLowerCase()));

        if (!bill) {
          return {
            content: [{
              type: "text",
              text: `❌ Bill not found: ${billName}. Use list_bills to see available bills.`
            }]
          };
        }

        if (bill.autopay) {
          return {
            content: [{
              type: "text",
              text: `ℹ️ ${bill.name} is on autopay - no need to mark as paid manually.`
            }]
          };
        }

        // Mark as paid (updates next due date)
        const updatedBill = await markBillAsPaid(bill.id);

        const message = `✅ ${bill.name} marked as paid! Next due date: ${new Date(updatedBill.next_due_date).toLocaleDateString()}`;

        // Log the payment
        await logBillAlert(bill.id, 'payment_recorded', message);

        // Send confirmation
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

  // Toggle Autopay Tool
  server.tool(
    "toggle_autopay",
    "Enable or disable autopay for a bill",
    {
      billName: z.string().describe("Name of the bill to modify"),
      enableAutopay: z.boolean().describe("True to enable autopay, false to disable")
    },
    async ({ billName, enableAutopay }) => {
      try {
        const bills = await getAllBills();
        const bill = bills.find(b => b.name.toLowerCase().includes(billName.toLowerCase()));

        if (!bill) {
          return {
            content: [{
              type: "text",
              text: `❌ Bill not found: ${billName}`
            }]
          };
        }

        await toggleAutopay(bill.id, enableAutopay);

        const message = `${enableAutopay ? '🤖 Autopay enabled' : '💳 Autopay disabled'} for ${bill.name}`;

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
            text: `❌ Failed to toggle autopay: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Bills Summary Tool
  server.tool(
    "bills_summary",
    "Get a summary of all bills and spending",
    {},
    async () => {
      try {
        const summary = await getBillsSummary();

        const message = `📊 Bills Summary:
📋 Total Bills: ${summary.totalBills}
🤖 Autopay Bills: ${summary.autopayBills}
💳 Manual Bills: ${summary.manualPaymentBills}
💰 Est. Monthly Total: $${summary.estimatedMonthlyTotal.toFixed(2)}

Use check_due_bills to see what's coming up!`;

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

  // Delete Bill Tool
  server.tool(
    "delete_bill",
    "Delete/cancel a bill or subscription",
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
              text: `❌ Bill not found: ${billName}`
            }]
          };
        }

        await deleteBill(bill.id);

        const message = `🗑️ Deleted bill: ${bill.name}`;
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
});

export const GET = mcpHandler;
export const POST = mcpHandler;