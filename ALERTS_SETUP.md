# Bill Alerts Setup Guide

## Overview

The alert system automatically sends proactive bill reminders to Poke when bills are due. It checks for:

- **Overdue bills** (past due date, unpaid)
- **Due today** (current day = due day)
- **Due tomorrow** (next day = due day)
- **3-day advance reminder** (3 days before due day)

## Alert Messages

The system sends formatted messages like:
- `🚨 OVERDUE: Electric Bill ($120) was due 5 days ago. Please pay immediately!`
- `⏰ DUE TODAY: Rent ($1200) is due today. Don't forget to pay!`
- `📅 REMINDER: Tomorrow, you have Netflix ($15.99) due. Plan ahead!`
- `🔔 HEADS UP: Spotify ($9.99) is due in 3 days on the 10th.`

## Usage Options

### 1. Manual via MCP (AI Assistant)
Use the `check_bill_alerts` tool through your AI assistant:
```
"Check for any bill alerts and send notifications"
```

### 2. Manual via API
```bash
# GET or POST
curl https://your-domain.com/api/alerts/check
```

### 3. Automated via Cron Job
Set up a daily cron job to automatically check alerts:

#### Vercel Cron (Recommended for Vercel deployments)
Create `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/alerts/check",
      "schedule": "0 9 * * *"
    }
  ]
}
```
This runs daily at 9 AM UTC.

#### External Cron Service
Use a service like cron-job.org or uptimerobot.com to hit:
```
GET https://your-domain.com/api/alerts/check
```

#### GitHub Actions (if using GitHub)
Create `.github/workflows/daily-alerts.yml`:
```yaml
name: Daily Bill Alerts
on:
  schedule:
    - cron: '0 9 * * *'  # 9 AM UTC daily
jobs:
  send-alerts:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger alerts
        run: curl -X GET ${{ secrets.APP_URL }}/api/alerts/check
```

## Alert Logic

The system will:
- ✅ **Send alerts** for manual bills that are overdue, due today, due tomorrow, or due in 3 days
- ⏭️ **Skip alerts** for autopay bills (unless overdue)
- ⏭️ **Skip alerts** for already paid bills
- 📝 **Log all alerts** in the `bill_alerts` database table
- 🔄 **Prevent duplicate alerts** by checking alert history

## Configuration

### Required Environment Variable
```bash
NEXT_PUBLIC_POKE_API_KEY=your_poke_api_key_here
```

### Alert Timing
- **3-day advance**: Only sent if `reminder_enabled = true` on the bill
- **1-day advance**: Always sent for unpaid manual bills
- **Due today**: Always sent for unpaid bills
- **Overdue**: Always sent for unpaid bills

## Testing

Test the alert system:
```bash
# Test via API
curl https://your-domain.com/api/alerts/check

# Test via MCP
Use AI assistant: "Check bill alerts and send notifications"
```

## Response Format

```json
{
  "success": true,
  "summary": "📊 Alert Summary: 2 sent, 1 skipped",
  "details": {
    "sent": 2,
    "skipped": 1,
    "errors": []
  }
}
```

## Troubleshooting

1. **No alerts sent**: Check that you have unpaid manual bills due soon
2. **API key errors**: Verify `NEXT_PUBLIC_POKE_API_KEY` is set
3. **Cron not working**: Check your deployment platform's cron job logs
4. **Duplicate alerts**: The system should prevent these, but check `bill_alerts` table

## Integration with Deployment

When you deploy to Vercel:
1. Set the `NEXT_PUBLIC_POKE_API_KEY` environment variable
2. Add the `vercel.json` cron configuration
3. The system will automatically send daily alerts

The alert system is now fully integrated and ready for production! 🎉