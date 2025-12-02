#!/bin/bash

echo "🧪 Testing Edge Function Components"
echo "======================================"
echo ""

# Test 1: Check if ANTHROPIC_API_KEY is set in Supabase
echo "Test 1: Checking environment variables..."
cd /Users/calixtoperezgalan/JH/2025/Job-search-tracker
export SUPABASE_ACCESS_TOKEN=sbp_4e2e6128fc9775b04613e1300d180986b1535f0a

if supabase secrets list 2>/dev/null | grep -q "ANTHROPIC_API_KEY"; then
  echo "✅ ANTHROPIC_API_KEY is configured"
else
  echo "❌ ANTHROPIC_API_KEY might not be set"
fi

echo ""
echo "Test 2: Checking deployed functions..."
supabase functions list 2>/dev/null | grep -E "(parse-jd|score-fit)" || echo "⚠️  Cannot list functions"

echo ""
echo "Test 3: Analyzing potential issues..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "🔍 Checking Claude model names in code:"
grep -n "model.*claude" supabase/functions/*/index.ts 2>/dev/null

echo ""
echo "⚠️  Known Issues from Previous Testing:"
echo "1. Model 'claude-sonnet-4-20250514' may not exist"
echo "2. Extended thinking requires specific model support"
echo "3. Web search requires extended thinking capability"
echo ""

echo "💡 Recommendations:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Verify Claude Sonnet 4 model name is correct"
echo "2. Test with a single small file first"
echo "3. Monitor Supabase logs during import"
echo "4. Check Anthropic API dashboard for errors"
echo ""
echo "🚀 Ready to test? Import 1 file first to validate pipeline"
