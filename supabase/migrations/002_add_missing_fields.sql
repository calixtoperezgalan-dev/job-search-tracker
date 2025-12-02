-- Add missing fields to applications table

ALTER TABLE applications
ADD COLUMN IF NOT EXISTS company_summary TEXT,
ADD COLUMN IF NOT EXISTS annual_revenue TEXT,
ADD COLUMN IF NOT EXISTS salary_currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS google_drive_file_url TEXT;

-- Add comment to track migration
COMMENT ON TABLE applications IS 'Updated: Added company_summary, annual_revenue, salary_currency, google_drive_file_url fields';

SELECT 'Added missing fields to applications table!' as status;
