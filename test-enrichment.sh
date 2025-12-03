#!/bin/bash

# Test the parse-jd function to verify enrichment data
# This sends a sample American Express job description

SUPABASE_URL="https://alcnbrdpzyspeqvvsjzu.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsY25icmRwenlzcGVxdnZzanp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODExNjksImV4cCI6MjA4MDI1NzE2OX0.oI5tsvwopz_4-umWsXtVG4cC9dYoehdrmmf2b02oa4g"

# Sample job description text
JOB_TEXT="American Express - VP, Cross Platform Delivery, Enterprise Data & AI - New York, NY - Salary: \$280,000 - \$400,000 - We are seeking an experienced VP to lead our cross-platform delivery initiatives."

echo "Testing parse-jd function with American Express job..."
echo ""

# Create JSON payload properly
PAYLOAD=$(jq -n \
  --arg text "$JOB_TEXT" \
  --arg fileId "test123" \
  --arg fileName "test-amex.txt" \
  --arg isDocx "false" \
  '{documentText: $text, fileId: $fileId, fileName: $fileName, isDocx: ($isDocx == "true")}')

curl -X POST "${SUPABASE_URL}/functions/v1/parse-jd" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" | jq '.'

echo ""
echo "Check if the response includes:"
echo "- company_name: American Express"
echo "- industry: (should be populated)"
echo "- company_size: (should be populated)"
echo "- company_type: (should be populated)"
echo "- stock_ticker: AXP"
