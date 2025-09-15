-- Monthly Bills Schema - Day-of-month focused approach
-- Drop existing tables and recreate with monthly focus

DROP TABLE IF EXISTS bill_payments CASCADE;
DROP TABLE IF EXISTS bill_alerts CASCADE;
DROP TABLE IF EXISTS bills CASCADE;

-- Bills table - stores the recurring bill template
CREATE TABLE bills (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')) DEFAULT 'monthly',
  due_day INTEGER NOT NULL CHECK (due_day >= 1 AND due_day <= 31), -- Day of month (1-31)
  autopay BOOLEAN DEFAULT FALSE,
  reminder_enabled BOOLEAN DEFAULT TRUE,
  reminder_days_before INTEGER DEFAULT 3,
  category VARCHAR(100) DEFAULT 'subscription',
  notes TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Monthly payments table - tracks actual payments by month
CREATE TABLE bill_payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  paid_date DATE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50), -- 'autopay' or 'manual'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bill_id, year, month) -- One payment record per bill per month
);

-- Monthly bill alerts for tracking notifications
CREATE TABLE bill_alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bill_id UUID REFERENCES bills(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  alert_type VARCHAR(50) NOT NULL, -- 'reminder', 'overdue', 'payment_recorded'
  message TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX idx_bills_active ON bills(active);
CREATE INDEX idx_bills_due_day ON bills(due_day);
CREATE INDEX idx_bill_payments_date ON bill_payments(year, month);
CREATE INDEX idx_bill_alerts_date ON bill_alerts(year, month);

-- Function to get current month bills status
CREATE OR REPLACE FUNCTION get_month_bills_status(target_year INTEGER, target_month INTEGER)
RETURNS TABLE (
  bill_id UUID,
  bill_name VARCHAR(200),
  amount DECIMAL(10,2),
  due_day INTEGER,
  autopay BOOLEAN,
  reminder_enabled BOOLEAN,
  category VARCHAR(100),
  frequency VARCHAR(20),
  is_paid BOOLEAN,
  paid_date DATE,
  days_until_due INTEGER,
  is_overdue BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.amount,
    b.due_day,
    b.autopay,
    b.reminder_enabled,
    b.category,
    b.frequency,
    (bp.paid_date IS NOT NULL) as is_paid,
    bp.paid_date,
    (b.due_day - EXTRACT(DAY FROM CURRENT_DATE)::INTEGER) as days_until_due,
    (EXTRACT(DAY FROM CURRENT_DATE)::INTEGER > b.due_day AND bp.paid_date IS NULL) as is_overdue
  FROM bills b
  LEFT JOIN bill_payments bp ON (
    b.id = bp.bill_id
    AND bp.year = target_year
    AND bp.month = target_month
  )
  WHERE b.active = TRUE
  AND (
    b.frequency = 'monthly' OR
    (b.frequency = 'quarterly' AND target_month % 3 = (EXTRACT(MONTH FROM b.created_at) % 3)) OR
    (b.frequency = 'yearly' AND target_month = EXTRACT(MONTH FROM b.created_at))
  )
  ORDER BY b.due_day, b.name;
END;
$$ LANGUAGE plpgsql;

-- Example data
INSERT INTO bills (name, amount, due_day, autopay, category) VALUES
('Netflix', 15.99, 15, true, 'streaming'),
('Electric Bill', 120.00, 5, false, 'utilities'),
('Rent', 1200.00, 1, false, 'housing'),
('Spotify', 9.99, 10, true, 'streaming');

-- Example payment (Netflix was auto-paid this month)
INSERT INTO bill_payments (bill_id, year, month, paid_date, amount, payment_method)
SELECT id, EXTRACT(YEAR FROM CURRENT_DATE), EXTRACT(MONTH FROM CURRENT_DATE), CURRENT_DATE, amount, 'autopay'
FROM bills WHERE name = 'Netflix';