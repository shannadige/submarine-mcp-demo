-- Schema updates for improved UX
-- Run these in your Supabase SQL Editor after the main schema

-- 1. Add recurring income support
CREATE TABLE recurring_income (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'bi-weekly', 'semi-monthly', 'monthly', 'quarterly', 'yearly')),
  start_date DATE NOT NULL,
  next_payment_date DATE NOT NULL,
  category VARCHAR(100) DEFAULT 'salary',
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add bill-budget category linking
ALTER TABLE bills ADD COLUMN budget_category VARCHAR(100) REFERENCES budgets(category);

-- 3. Add alert preferences and history
CREATE TABLE alert_preferences (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id VARCHAR(100) DEFAULT 'default_user', -- For multi-user support later
  budget_warning_threshold INTEGER DEFAULT 80,
  bill_reminder_days INTEGER DEFAULT 7,
  poke_notifications_enabled BOOLEAN DEFAULT TRUE,
  daily_summary_enabled BOOLEAN DEFAULT FALSE,
  weekly_summary_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE alert_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  alert_type VARCHAR(50) NOT NULL, -- 'budget_warning', 'bill_reminder', 'summary', etc.
  message TEXT NOT NULL,
  poke_sent BOOLEAN DEFAULT FALSE,
  poke_response JSONB,
  related_entity_id UUID, -- Could reference budget, bill, transaction, etc.
  related_entity_type VARCHAR(50), -- 'budget', 'bill', 'transaction'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add monthly context support
ALTER TABLE transactions ADD COLUMN month_year VARCHAR(7); -- Format: '2025-09'
ALTER TABLE budgets ADD COLUMN month_year VARCHAR(7) DEFAULT '2025-09';

-- 5. Create indexes for performance
CREATE INDEX idx_recurring_income_next_payment ON recurring_income(next_payment_date);
CREATE INDEX idx_transactions_month_year ON transactions(month_year);
CREATE INDEX idx_budgets_month_year ON budgets(month_year);
CREATE INDEX idx_alert_history_type ON alert_history(alert_type);
CREATE INDEX idx_bills_budget_category ON bills(budget_category);

-- 6. Create triggers for updated_at
CREATE TRIGGER update_recurring_income_updated_at BEFORE UPDATE ON recurring_income FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_alert_preferences_updated_at BEFORE UPDATE ON alert_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Enable RLS for new tables
ALTER TABLE recurring_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_history ENABLE ROW LEVEL SECURITY;

-- 8. Create policies
CREATE POLICY "Allow all operations on recurring_income" ON recurring_income FOR ALL USING (true);
CREATE POLICY "Allow all operations on alert_preferences" ON alert_preferences FOR ALL USING (true);
CREATE POLICY "Allow all operations on alert_history" ON alert_history FOR ALL USING (true);

-- 9. Insert default alert preferences
INSERT INTO alert_preferences (budget_warning_threshold, bill_reminder_days, poke_notifications_enabled)
VALUES (80, 7, true)
ON CONFLICT DO NOTHING;

-- 10. Update existing data to September 2025 context
UPDATE transactions SET month_year = '2025-09' WHERE month_year IS NULL;
UPDATE budgets SET month_year = '2025-09' WHERE month_year IS NULL;

-- 11. Remove paid status and add autopay to bills
ALTER TABLE bills DROP COLUMN IF EXISTS paid;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS autopay BOOLEAN DEFAULT FALSE;

-- 12. Update alert preferences schema to match UI
ALTER TABLE alert_preferences ADD COLUMN IF NOT EXISTS budget_overspend BOOLEAN DEFAULT TRUE;
ALTER TABLE alert_preferences ADD COLUMN IF NOT EXISTS large_transaction BOOLEAN DEFAULT TRUE;
ALTER TABLE alert_preferences ADD COLUMN IF NOT EXISTS monthly_summary BOOLEAN DEFAULT TRUE;
ALTER TABLE alert_preferences ADD COLUMN IF NOT EXISTS bill_reminder BOOLEAN DEFAULT TRUE;
ALTER TABLE alert_preferences ADD COLUMN IF NOT EXISTS large_transaction_threshold INTEGER DEFAULT 500;
ALTER TABLE alert_preferences RENAME COLUMN bill_reminder_days TO bill_reminder_days;

-- 13. Add acknowledged field to alert history
ALTER TABLE alert_history ADD COLUMN IF NOT EXISTS acknowledged BOOLEAN DEFAULT FALSE;