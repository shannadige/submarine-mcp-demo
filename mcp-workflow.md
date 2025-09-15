# MCP Workflow for Monthly Bills Tracker

## How MCP (Model Context Protocol) Works in This System

```
                    ┌─────────────────────┐
                    │  AI Assistant/Poke  │
                    └──────────┬──────────┘
                               │ HTTP POST Request
                               ▼
                    ┌─────────────────────┐
                    │  MCP Server (/mcp)  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Parse MCP Request │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
        ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
        │ tools/list  │ │ tools/call  │ │    other    │
        └──────┬──────┘ └──────┬──────┘ └─────────────┘
               │               │
               ▼               ▼
        ┌─────────────┐ ┌─────────────┐
        │Return Tool  │ │Tool Router  │
        │    List     │ │             │
        └─────────────┘ └──────┬──────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
        ▼                      ▼                      ▼
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   add_bill   │      │current_month │      │ mark_bill_   │
│              │      │    _bills    │      │    paid      │
└──────┬───────┘      └──────┬───────┘      └──────┬───────┘
       │                     │                     │
       └─────────────────────┼─────────────────────┘
                             │
                             ▼
                  ┌─────────────────────┐
                  │  Supabase Database  │
                  └──────────┬──────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ bills table  │    │bill_payments │    │ bill_alerts  │
│(due_day 1-31)│    │  (by month)  │    │(notifications│
└──────────────┘    └──────────────┘    └──────────────┘

                             │
                             ▼
                  ┌─────────────────────┐
                  │   Poke API/SMS      │
                  │   (notifications)   │
                  └─────────────────────┘
```

## MCP Tools Available

| Tool Name | Purpose | Key Parameters |
|-----------|---------|---------------|
| `add_bill` | Create recurring bill template | `name`, `amount`, `dueDay` (1-31), `autopay` |
| `current_month_bills` | Show current month bills with payment status | None |
| `mark_bill_paid` | Mark bill as paid for current month | `billName`, `sendConfirmation` |
| `bills_summary` | Get monthly totals and statistics | None |
| `check_due_bills` | Find bills needing manual payment | None |
| `next_month_bills` | Preview next month's bills | None |
| `edit_bill` | Modify bill template | `billName`, `newAmount`, `newDueDay`, `newAutopay` |
| `delete_bill` | Remove bill template | `billName` |

## Data Flow

1. **Bill Creation**: AI → MCP → Database (bills table with due_day 1-31)
2. **Monthly View**: AI → MCP → SQL function `get_month_bills_status()` → Payment status per month
3. **Payment Tracking**: AI → MCP → Database (bill_payments table by year/month)
4. **Notifications**: MCP → Poke API → SMS/Webhook notifications

## Key Differences from Traditional Billing Systems

- **Fixed Due Days**: Bills have `due_day` (1-31) instead of shifting dates
- **Monthly Payment Records**: Separate table tracks payments per month/year
- **No Date Manipulation**: Payment tracking doesn't change bill templates
- **Current/Next Month Focus**: Users only interact with current and next month data