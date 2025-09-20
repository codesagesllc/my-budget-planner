-- Add payment tracking fields to bills table
ALTER TABLE public.bills
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT 'recurring'; -- 'recurring' or 'one-time'

-- Update existing bills to set current period based on billing cycle and due date
UPDATE public.bills
SET
  current_period_start = CASE
    WHEN billing_cycle = 'monthly' THEN
      DATE_TRUNC('month', due_date)
    WHEN billing_cycle = 'weekly' THEN
      DATE_TRUNC('week', due_date)
    WHEN billing_cycle = 'biweekly' THEN
      due_date - INTERVAL '13 days'
    WHEN billing_cycle = 'quarterly' THEN
      DATE_TRUNC('quarter', due_date)
    WHEN billing_cycle = 'annual' THEN
      DATE_TRUNC('year', due_date)
    ELSE due_date
  END,
  current_period_end = CASE
    WHEN billing_cycle = 'monthly' THEN
      DATE_TRUNC('month', due_date) + INTERVAL '1 month' - INTERVAL '1 day'
    WHEN billing_cycle = 'weekly' THEN
      DATE_TRUNC('week', due_date) + INTERVAL '6 days'
    WHEN billing_cycle = 'biweekly' THEN
      due_date + INTERVAL '13 days'
    WHEN billing_cycle = 'quarterly' THEN
      DATE_TRUNC('quarter', due_date) + INTERVAL '3 months' - INTERVAL '1 day'
    WHEN billing_cycle = 'annual' THEN
      DATE_TRUNC('year', due_date) + INTERVAL '1 year' - INTERVAL '1 day'
    ELSE due_date
  END
WHERE current_period_start IS NULL OR current_period_end IS NULL;

-- Create function to check and update overdue bills
CREATE OR REPLACE FUNCTION update_overdue_bills()
RETURNS void AS $$
BEGIN
  UPDATE public.bills
  SET is_overdue = true
  WHERE
    is_active = true
    AND is_paid = false
    AND current_period_end < NOW()
    AND (recurrence_type = 'recurring' OR recurrence_type = 'one-time');
END;
$$ LANGUAGE plpgsql;

-- Create function to reset monthly bills payment status
CREATE OR REPLACE FUNCTION reset_recurring_bills_payment_status()
RETURNS void AS $$
BEGIN
  -- Reset monthly bills at start of new month
  UPDATE public.bills
  SET
    is_paid = false,
    payment_date = NULL,
    is_overdue = false,
    current_period_start = DATE_TRUNC('month', NOW()),
    current_period_end = DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day'
  WHERE
    billing_cycle = 'monthly'
    AND recurrence_type = 'recurring'
    AND is_active = true
    AND current_period_end < DATE_TRUNC('month', NOW());

  -- Reset weekly bills
  UPDATE public.bills
  SET
    is_paid = false,
    payment_date = NULL,
    is_overdue = false,
    current_period_start = DATE_TRUNC('week', NOW()),
    current_period_end = DATE_TRUNC('week', NOW()) + INTERVAL '6 days'
  WHERE
    billing_cycle = 'weekly'
    AND recurrence_type = 'recurring'
    AND is_active = true
    AND current_period_end < DATE_TRUNC('week', NOW());

  -- Reset biweekly bills (every 14 days)
  UPDATE public.bills
  SET
    is_paid = false,
    payment_date = NULL,
    is_overdue = false,
    current_period_start = NOW(),
    current_period_end = NOW() + INTERVAL '13 days'
  WHERE
    billing_cycle = 'biweekly'
    AND recurrence_type = 'recurring'
    AND is_active = true
    AND current_period_end < NOW();

  -- Reset quarterly bills
  UPDATE public.bills
  SET
    is_paid = false,
    payment_date = NULL,
    is_overdue = false,
    current_period_start = DATE_TRUNC('quarter', NOW()),
    current_period_end = DATE_TRUNC('quarter', NOW()) + INTERVAL '3 months' - INTERVAL '1 day'
  WHERE
    billing_cycle = 'quarterly'
    AND recurrence_type = 'recurring'
    AND is_active = true
    AND current_period_end < DATE_TRUNC('quarter', NOW());

  -- Reset annual bills
  UPDATE public.bills
  SET
    is_paid = false,
    payment_date = NULL,
    is_overdue = false,
    current_period_start = DATE_TRUNC('year', NOW()),
    current_period_end = DATE_TRUNC('year', NOW()) + INTERVAL '1 year' - INTERVAL '1 day'
  WHERE
    billing_cycle = 'annual'
    AND recurrence_type = 'recurring'
    AND is_active = true
    AND current_period_end < DATE_TRUNC('year', NOW());

  -- Update overdue status after reset
  PERFORM update_overdue_bills();
END;
$$ LANGUAGE plpgsql;

-- Create function to mark bill as paid
CREATE OR REPLACE FUNCTION mark_bill_paid(bill_id UUID)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  UPDATE public.bills
  SET
    is_paid = true,
    payment_date = NOW(),
    is_overdue = false
  WHERE
    id = bill_id
    AND user_id = auth.uid()
  RETURNING
    json_build_object(
      'id', id,
      'name', name,
      'is_paid', is_paid,
      'payment_date', payment_date,
      'is_overdue', is_overdue
    ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to mark bill as unpaid
CREATE OR REPLACE FUNCTION mark_bill_unpaid(bill_id UUID)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  UPDATE public.bills
  SET
    is_paid = false,
    payment_date = NULL,
    is_overdue = CASE
      WHEN current_period_end < NOW() THEN true
      ELSE false
    END
  WHERE
    id = bill_id
    AND user_id = auth.uid()
  RETURNING
    json_build_object(
      'id', id,
      'name', name,
      'is_paid', is_paid,
      'payment_date', payment_date,
      'is_overdue', is_overdue
    ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bills_payment_status ON public.bills(user_id, is_paid, current_period_end);
CREATE INDEX IF NOT EXISTS idx_bills_overdue ON public.bills(user_id, is_overdue, is_active);
CREATE INDEX IF NOT EXISTS idx_bills_current_period ON public.bills(user_id, current_period_start, current_period_end);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_bill_paid(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_bill_unpaid(UUID) TO authenticated;

-- Initial run to set overdue status for existing bills
SELECT update_overdue_bills();