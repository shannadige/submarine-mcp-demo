# Finance Tracker MCP Server

A comprehensive Model Context Protocol (MCP) server for personal finance tracking with **Poke integration** for automated messaging and alerts.

## 🏆 HackMIT Poke Challenge Entry

This MCP server was built for the **Interaction Company's Poke MCP Challenge** at HackMIT 2024. It demonstrates practical financial automation with intelligent notifications via Poke's messaging platform.

## ✨ Features

### Core Finance Tools
- **Transaction Tracking**: Add income and expenses with categorization
- **Budget Management**: Set spending limits with automatic overage alerts
- **Bill Reminders**: Track due dates with proactive notifications
- **Financial Summaries**: Generate comprehensive reports
- **Investment Tracking**: Monitor portfolio performance (simulated)

### Poke Integration
- **Smart Alerts**: Automatic budget overage notifications
- **Bill Reminders**: Timely bill due notifications via Poke
- **Financial Reports**: Deliver summaries directly to Poke
- **Custom Messages**: Send any financial alert via Poke API

## 🚀 Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/finance-tracker-mcp)

## 🛠 Local Development

```bash
# Clone and setup
git clone <your-repo-url>
cd finance-tracker-mcp
npm install

# Development server
npm run dev
```

Visit `http://localhost:3000/mcp` to test the MCP server.

## 📱 Poke Setup

### **Step 1: Get API Key**
Visit [poke.com/settings/advanced](https://poke.com/settings/advanced) to get your API key.

### **Step 2: Configure Environment Variables**

**For Vercel Deployment:**
1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add: `POKE_API_KEY` = `your-api-key-here`

**For Local Development:**
```bash
# Copy example file
cp .env.local.example .env.local

# Edit with your API key
POKE_API_KEY=your-poke-api-key-here
```

### **Step 3: Connect MCP Integration**
1. **Add MCP Integration**: Go to [poke.com/settings/connections/integrations/new](https://poke.com/settings/connections/integrations/new)
2. **Use Your Server URL**: `https://your-app.vercel.app/mcp`

✅ **Now all tools automatically send notifications without needing API key parameters!**

## 🔧 Available Tools

### `add_transaction`
Add income or expense with automatic budget tracking and Poke notifications.
```json
{
  "type": "expense",
  "amount": 50.00,
  "category": "food",
  "description": "Lunch at café"
}
```
*🔔 Automatically sends Poke alerts if budget exceeded*

### `set_budget`
Create spending limits for categories.
```json
{
  "category": "food",
  "limit": 500,
  "period": "monthly"
}
```

### `get_financial_summary`
Generate comprehensive financial reports with automatic Poke delivery.
```json
{
  "period": "month"
}
```

### `check_due_bills`
Check upcoming bills and send automatic Poke alerts.
```json
{
  "daysAhead": 7
}
```

### `budget_status`
Check all budget statuses with visual indicators.

### `track_investment`
Monitor investment performance with automatic Poke updates.
```json
{
  "symbol": "AAPL",
  "shares": 10,
  "purchasePrice": 150.00
}
```

### `send_poke_message`
Send custom financial alerts via Poke.
```json
{
  "message": "💰 Monthly financial review completed!"
}
```

## 🎯 Use Cases

### 1. Automated Budget Monitoring
Set budgets and receive instant Poke notifications when you exceed limits:
- Add expense → Automatically checks budget → Sends alert if over limit

### 2. Proactive Bill Management
Never miss a payment with smart reminders:
- Add bills → Check due dates → Receive Poke notifications 7 days before

### 3. Investment Tracking
Stay informed about your portfolio:
- Track positions → Get performance updates → Receive alerts via Poke

### 4. Financial Health Reports
Regular financial summaries delivered to Poke:
- Weekly/monthly reports → Comprehensive breakdowns → Delivered automatically

## 🏗 Architecture

Built with:
- **Next.js 15** for serverless deployment
- **mcp-handler** for MCP protocol implementation
- **Zod** for type-safe validation
- **Vercel** for hosting and edge functions
- **Poke API** for messaging integration

## 🔐 Security Notes

- API keys are never stored permanently
- All financial data is ephemeral (use database in production)
- Poke integration uses secure Bearer token authentication

## 📈 Future Enhancements

- **Persistent Storage**: Database integration for transaction history
- **Real Financial APIs**: Live stock prices and market data
- **Advanced Analytics**: Spending trends and predictions
- **Multi-Currency**: International currency support
- **Scheduled Reports**: Automatic weekly/monthly summaries

## 🏆 Prize Categories

This project targets:
- **Most Practical MCP Automation**: Real-world financial management
- **Most Technically Impressive**: Complex MCP integration with external APIs
- **Most Fun**: Interactive finance tracking with emoji-rich notifications

---

*Built with ❤️ for the Interaction Company Poke MCP Challenge at HackMIT 2024*
