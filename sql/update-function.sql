-- Update the function to include reminder_enabled
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