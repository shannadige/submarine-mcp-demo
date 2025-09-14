import { createMcpHandler } from "mcp-handler";
import { z } from "zod";

// Finance data store (in production, this would be a database)
interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
}

interface Budget {
  category: string;
  limit: number;
  spent: number;
  period: 'monthly' | 'weekly' | 'yearly';
}

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  recurring: boolean;
  paid: boolean;
}

// In-memory storage (use database in production)
let transactions: Transaction[] = [];
let budgets: Budget[] = [];
let bills: Bill[] = [];

// Poke API integration
async function sendPokeNotification(message: string, apiKey?: string) {
  if (!apiKey) return { success: false, error: "No API key provided" };

  try {
    const response = await fetch('https://poke.com/api/v1/inbound-sms/webhook', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ message })
    });

    if (response.ok) {
      return { success: true, data: await response.json() };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

const handler = createMcpHandler(
  async (server) => {
    // Add Transaction Tool
    server.tool(
      "add_transaction",
      "Add a new income or expense transaction",
      {
        type: z.enum(['income', 'expense']),
        amount: z.number().positive(),
        category: z.string(),
        description: z.string(),
        date: z.string().optional(),
        pokeApiKey: z.string().optional()
      },
      async ({ type, amount, category, description, date, pokeApiKey }) => {
        const transaction: Transaction = {
          id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type,
          amount,
          category,
          description,
          date: date || new Date().toISOString().split('T')[0]
        };

        transactions.push(transaction);

        // Update budget if it's an expense
        if (type === 'expense') {
          const budget = budgets.find(b => b.category === category);
          if (budget) {
            budget.spent += amount;

            // Send Poke notification if budget exceeded
            if (budget.spent > budget.limit && pokeApiKey) {
              const message = `⚠️ Budget Alert: You've exceeded your ${category} budget! Spent: $${budget.spent}, Limit: $${budget.limit}`;
              await sendPokeNotification(message, pokeApiKey);
            }
          }
        }

        return {
          content: [{
            type: "text",
            text: `✅ ${type === 'income' ? 'Income' : 'Expense'} of $${amount} added successfully!\nCategory: ${category}\nDescription: ${description}\nID: ${transaction.id}`
          }]
        };
      }
    );

    // Set Budget Tool
    server.tool(
      "set_budget",
      "Set or update a budget for a category",
      {
        category: z.string(),
        limit: z.number().positive(),
        period: z.enum(['monthly', 'weekly', 'yearly']).default('monthly')
      },
      async ({ category, limit, period }) => {
        const existingBudget = budgets.find(b => b.category === category);

        if (existingBudget) {
          existingBudget.limit = limit;
          existingBudget.period = period;
        } else {
          budgets.push({
            category,
            limit,
            spent: 0,
            period
          });
        }

        return {
          content: [{
            type: "text",
            text: `💰 Budget set for ${category}: $${limit} ${period}`
          }]
        };
      }
    );

    // Get Financial Summary Tool
    server.tool(
      "get_financial_summary",
      "Get a comprehensive financial summary",
      {
        period: z.enum(['week', 'month', 'year']).default('month'),
        pokeApiKey: z.string().optional()
      },
      async ({ period, pokeApiKey }) => {
        const now = new Date();
        const startDate = new Date();

        if (period === 'week') {
          startDate.setDate(now.getDate() - 7);
        } else if (period === 'month') {
          startDate.setMonth(now.getMonth() - 1);
        } else {
          startDate.setFullYear(now.getFullYear() - 1);
        }

        const periodTransactions = transactions.filter(t =>
          new Date(t.date) >= startDate
        );

        const totalIncome = periodTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = periodTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        const netIncome = totalIncome - totalExpenses;

        // Category breakdown
        const expensesByCategory: Record<string, number> = {};
        periodTransactions
          .filter(t => t.type === 'expense')
          .forEach(t => {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
          });

        const summary = `📊 Financial Summary (${period}):\n` +
          `💰 Total Income: $${totalIncome.toFixed(2)}\n` +
          `💸 Total Expenses: $${totalExpenses.toFixed(2)}\n` +
          `📈 Net Income: $${netIncome.toFixed(2)}\n\n` +
          `📂 Expenses by Category:\n` +
          Object.entries(expensesByCategory)
            .map(([cat, amount]) => `  • ${cat}: $${amount.toFixed(2)}`)
            .join('\n');

        // Send to Poke if requested
        if (pokeApiKey) {
          await sendPokeNotification(summary, pokeApiKey);
        }

        return {
          content: [{ type: "text", text: summary }]
        };
      }
    );

    // Add Bill Tool
    server.tool(
      "add_bill",
      "Add a bill reminder",
      {
        name: z.string(),
        amount: z.number().positive(),
        dueDate: z.string(),
        recurring: z.boolean().default(false)
      },
      async ({ name, amount, dueDate, recurring }) => {
        const bill: Bill = {
          id: `bill_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name,
          amount,
          dueDate,
          recurring,
          paid: false
        };

        bills.push(bill);

        return {
          content: [{
            type: "text",
            text: `📅 Bill reminder added: ${name} - $${amount} due ${dueDate}${recurring ? ' (recurring)' : ''}`
          }]
        };
      }
    );

    // Check Due Bills Tool
    server.tool(
      "check_due_bills",
      "Check for bills due soon and send Poke notifications",
      {
        daysAhead: z.number().default(7),
        pokeApiKey: z.string().optional()
      },
      async ({ daysAhead, pokeApiKey }) => {
        const now = new Date();
        const checkDate = new Date();
        checkDate.setDate(now.getDate() + daysAhead);

        const dueBills = bills.filter(bill => {
          const billDue = new Date(bill.dueDate);
          return !bill.paid && billDue <= checkDate && billDue >= now;
        });

        if (dueBills.length === 0) {
          return {
            content: [{ type: "text", text: "✅ No bills due in the next " + daysAhead + " days!" }]
          };
        }

        const billsList = dueBills.map(bill =>
          `📋 ${bill.name}: $${bill.amount} due ${bill.dueDate}`
        ).join('\n');

        const message = `🔔 Bills Due Soon:\n${billsList}`;

        // Send Poke notification
        if (pokeApiKey) {
          await sendPokeNotification(message, pokeApiKey);
        }

        return {
          content: [{ type: "text", text: message }]
        };
      }
    );

    // Budget Status Tool
    server.tool(
      "budget_status",
      "Check current budget status for all categories",
      {
        pokeApiKey: z.string().optional()
      },
      async ({ pokeApiKey }) => {
        if (budgets.length === 0) {
          return {
            content: [{ type: "text", text: "No budgets set. Use set_budget to create one!" }]
          };
        }

        const budgetStatus = budgets.map(budget => {
          const percentage = (budget.spent / budget.limit) * 100;
          const status = percentage > 100 ? '❌ OVER' :
                        percentage > 80 ? '⚠️ WARNING' : '✅ GOOD';

          return `${status} ${budget.category}: $${budget.spent.toFixed(2)} / $${budget.limit} (${percentage.toFixed(1)}%) ${budget.period}`;
        }).join('\n');

        const message = `💰 Budget Status:\n${budgetStatus}`;

        // Send to Poke if requested
        if (pokeApiKey) {
          await sendPokeNotification(message, pokeApiKey);
        }

        return {
          content: [{ type: "text", text: message }]
        };
      }
    );

    // Investment Tracker Tool
    server.tool(
      "track_investment",
      "Track investment performance (simulated)",
      {
        symbol: z.string(),
        shares: z.number().positive(),
        purchasePrice: z.number().positive(),
        pokeApiKey: z.string().optional()
      },
      async ({ symbol, shares, purchasePrice, pokeApiKey }) => {
        // Simulate current price (in real app, fetch from financial API)
        const currentPrice = purchasePrice * (0.9 + Math.random() * 0.2); // ±10% change
        const totalValue = shares * currentPrice;
        const totalCost = shares * purchasePrice;
        const gainLoss = totalValue - totalCost;
        const gainLossPercent = (gainLoss / totalCost) * 100;

        const message = `📈 Investment Update: ${symbol}\n` +
          `Shares: ${shares}\n` +
          `Purchase Price: $${purchasePrice.toFixed(2)}\n` +
          `Current Price: $${currentPrice.toFixed(2)}\n` +
          `Total Value: $${totalValue.toFixed(2)}\n` +
          `${gainLoss >= 0 ? '📈 Gain' : '📉 Loss'}: $${Math.abs(gainLoss).toFixed(2)} (${gainLossPercent.toFixed(2)}%)`;

        // Send to Poke if requested
        if (pokeApiKey) {
          await sendPokeNotification(message, pokeApiKey);
        }

        return {
          content: [{ type: "text", text: message }]
        };
      }
    );

    // Send Custom Poke Message Tool
    server.tool(
      "send_poke_message",
      "Send a custom message via Poke API",
      {
        message: z.string(),
        pokeApiKey: z.string()
      },
      async ({ message, pokeApiKey }) => {
        const result = await sendPokeNotification(message, pokeApiKey);

        return {
          content: [{
            type: "text",
            text: result.success
              ? `✅ Message sent to Poke: "${message}"`
              : `❌ Failed to send message: ${result.error}`
          }]
        };
      }
    );
  },
  {
    capabilities: {
      tools: {
        add_transaction: {
          description: "Add a new income or expense transaction with optional Poke notifications"
        },
        set_budget: {
          description: "Set or update a budget for a spending category"
        },
        get_financial_summary: {
          description: "Get comprehensive financial summary with optional Poke delivery"
        },
        add_bill: {
          description: "Add a bill reminder with due date tracking"
        },
        check_due_bills: {
          description: "Check for upcoming bills and send Poke notifications"
        },
        budget_status: {
          description: "Check current budget status for all categories"
        },
        track_investment: {
          description: "Track investment performance with current value estimates"
        },
        send_poke_message: {
          description: "Send custom messages via Poke API for financial alerts"
        }
      }
    }
  },
  {
    basePath: "",
    verboseLogs: true,
    maxDuration: 300,
    disableSse: true
  }
);

export { handler as GET, handler as POST, handler as DELETE };