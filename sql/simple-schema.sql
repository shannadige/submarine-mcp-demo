-- Simplified Bills Tracker Schema
-- Only tracks recurring bills/subscriptions with reminders

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
DROP TABLE IF EXISTS alert_history CASCADE;
DROP TABLE IF EXISTS alert_preferences CASCADE;
DROP TABLE IF EXISTS recurring_income CASCADE;

-- Simplified bills table for recurring subscriptions/bills only
DROP TABLE IF EXISTS bills CASCADE;
CREATE TABLE bills (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,                    -- e.g., "Netflix", "Rent", "Electric Bill"
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  next_due_date DATE NOT NULL,                   -- When the next payment is due
  autopay BOOLEAN DEFAULT FALSE,                 -- Is this bill on autopay?
  reminder_enabled BOOLEAN DEFAULT TRUE,         -- Should we send reminders?
  reminder_days_before INTEGER DEFAULT 3,       -- How many days before due date to remind
  category VARCHAR(100) DEFAULT 'subscription', -- e.g., "streaming", "utilities", "housing"
  notes TEXT,                                    -- Optional notes about the bill
  active BOOLEAN DEFAULT TRUE,                   -- Is this subscription still active?
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simple alert history for bill reminders only
CREATE TABLE bill_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL,              -- 'reminder', 'due_today', 'overdue'
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX idx_bills_next_due_date ON bills(next_due_date);
CREATE INDEX idx_bills_autopay ON bills(autopay);
CREATE INDEX idx_bills_active ON bills(active);
CREATE INDEX idx_bills_reminder_enabled ON bills(reminder_enabled);
CREATE INDEX idx_bill_alerts_bill_id ON bill_alerts(bill_id);
CREATE INDEX idx_bill_alerts_sent_at ON bill_alerts(sent_at);

-- Function to calculate next due date based on frequency
CREATE OR REPLACE FUNCTION calculate_next_due_date(current_due_date DATE, frequency_type VARCHAR)
RETURNS DATE AS $$
BEGIN
  CASE frequency_type
    WHEN 'weekly' THEN RETURN current_due_date + INTERVAL '7 days';
    WHEN 'monthly' THEN RETURN current_due_date + INTERVAL '1 month';
    WHEN 'quarterly' THEN RETURN current_due_date + INTERVAL '3 months';
    WHEN 'yearly' THEN RETURN current_due_date + INTERVAL '1 year';
    ELSE RETURN current_due_date + INTERVAL '1 month';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bills_updated_at
  BEFORE UPDATE ON bills
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_alerts ENABLE ROW LEVEL SECURITY;

-- Simple policies (allow all for now)
CREATE POLICY "Allow all operations on bills" ON bills FOR ALL USING (true);
CREATE POLICY "Allow all operations on bill_alerts" ON bill_alerts FOR ALL USING (true);

-- Sample data for common subscriptions
INSERT INTO bills (name, amount, frequency, next_due_date, autopay, category, notes) VALUES
('Netflix', 15.99, 'monthly', CURRENT_DATE + INTERVAL '5 days', true, 'streaming', 'Standard plan'),
('Spotify', 9.99, 'monthly', CURRENT_DATE + INTERVAL '10 days', true, 'streaming', 'Premium subscription'),
('Rent', 1200.00, 'monthly', CURRENT_DATE + INTERVAL '25 days', false, 'housing', 'Monthly rent payment'),
('Electric Bill', 85.00, 'monthly', CURRENT_DATE + INTERVAL '15 days', false, 'utilities', 'Average monthly usage');