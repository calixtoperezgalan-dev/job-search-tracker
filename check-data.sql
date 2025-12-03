-- Check what company enrichment data we have
SELECT 
  company_name,
  industry,
  company_size,
  company_type,
  annual_revenue,
  stock_ticker,
  company_summary
FROM applications
ORDER BY created_at DESC
LIMIT 5;
