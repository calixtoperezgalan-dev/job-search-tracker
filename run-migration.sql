-- Add missing fields to applications table
-- Run this in Supabase SQL Editor

ALTER TABLE applications
ADD COLUMN IF NOT EXISTS company_summary TEXT,
ADD COLUMN IF NOT EXISTS annual_revenue TEXT,
ADD COLUMN IF NOT EXISTS salary_currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS google_drive_file_url TEXT;

SELECT 'Migration complete! Added company_summary, annual_revenue, salary_currency, google_drive_file_url' as status;
