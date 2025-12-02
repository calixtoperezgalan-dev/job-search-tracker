-- Verify the new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'applications'
  AND column_name IN ('company_summary', 'annual_revenue', 'salary_currency', 'google_drive_file_url')
ORDER BY column_name;
