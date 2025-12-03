#!/bin/bash

# Test filename extraction with real examples from Google Drive

SUPABASE_URL="https://alcnbrdpzyspeqvvsjzu.supabase.co"
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsY25icmRwenlzcGVxdnZzanp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODExNjksImV4cCI6MjA4MDI1NzE2OX0.oI5tsvwopz_4-umWsXtVG4cC9dYoehdrmmf2b02oa4g"

# Test Case 1: Blackrock job
echo "======================================"
echo "Test 1: Blackrock filename extraction"
echo "======================================"

PAYLOAD1=$(jq -n \
  --arg text "Global Head of Digital Client Experience position. Strategic role leading digital transformation initiatives." \
  --arg fileId "test-blackrock" \
  --arg fileName "Blackrock - Global Head of Digital Client Experience.docx" \
  --arg isDocx "false" \
  '{documentText: $text, fileId: $fileId, fileName: $fileName, isDocx: ($isDocx == "true")}')

echo "Filename: Blackrock - Global Head of Digital Client Experience.docx"
echo ""
curl -X POST "${SUPABASE_URL}/functions/v1/parse-jd" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD1" 2>/dev/null | jq '.company_name, .job_title, .industry, .company_type'

echo ""
echo ""

# Test Case 2: Capital One job
echo "======================================"
echo "Test 2: Capital One filename extraction"
echo "======================================"

PAYLOAD2=$(jq -n \
  --arg text "Senior Director, Product Management - AI/ML Platform Intelligence. Leading AI/ML initiatives." \
  --arg fileId "test-capital-one" \
  --arg fileName "Capital One - Sr. Director, Product Management - AI/ML Platform Intelligence.docx" \
  --arg isDocx "false" \
  '{documentText: $text, fileId: $fileId, fileName: $fileName, isDocx: ($isDocx == "true")}')

echo "Filename: Capital One - Sr. Director, Product Management - AI/ML Platform Intelligence.docx"
echo ""
curl -X POST "${SUPABASE_URL}/functions/v1/parse-jd" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD2" 2>/dev/null | jq '.company_name, .job_title, .industry, .company_type, .stock_ticker'

echo ""
echo ""

# Test Case 3: Confidential job (should still work)
echo "======================================"
echo "Test 3: Confidential company handling"
echo "======================================"

PAYLOAD3=$(jq -n \
  --arg text "Chief Product and Experience Officer position for a leading technology company." \
  --arg fileId "test-confidential" \
  --arg fileName "Confidential - Chief Product and Experience Officer or VP/SVP of Product.docx" \
  --arg isDocx "false" \
  '{documentText: $text, fileId: $fileId, fileName: $fileName, isDocx: ($isDocx == "true")}')

echo "Filename: Confidential - Chief Product and Experience Officer or VP/SVP of Product.docx"
echo ""
curl -X POST "${SUPABASE_URL}/functions/v1/parse-jd" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD3" 2>/dev/null | jq '.company_name, .job_title'

echo ""
echo ""
echo "======================================"
echo "Test Results Summary"
echo "======================================"
echo "✓ Test 1 should show company_name: 'Blackrock'"
echo "✓ Test 2 should show company_name: 'Capital One'"
echo "✓ Test 3 should show company_name: 'Confidential'"
echo ""
