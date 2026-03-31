ALTER TABLE payout_calendar
ADD COLUMN IF NOT EXISTS end_date DATE;

UPDATE payout_calendar
SET end_date = entry_date
WHERE end_date IS NULL;

ALTER TABLE payout_calendar
ALTER COLUMN end_date SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'payout_calendar_end_date_check'
    ) THEN
        ALTER TABLE payout_calendar
        ADD CONSTRAINT payout_calendar_end_date_check
        CHECK (end_date >= entry_date);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payout_calendar_end_date ON payout_calendar(end_date ASC);