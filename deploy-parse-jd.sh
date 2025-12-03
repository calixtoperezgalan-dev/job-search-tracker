#!/bin/bash

# Deploy parse-jd function to Supabase
#
# This script deploys the updated parse-jd function that extracts
# company names from Google Drive filenames using the pattern: [Company] - [Role]

echo "========================================="
echo "Deploying parse-jd Function"
echo "========================================="
echo ""

# Check if already logged in
if ! npx supabase projects list >/dev/null 2>&1; then
  echo "⚠️  Not logged in to Supabase CLI"
  echo ""
  echo "Please login first:"
  echo "  npx supabase login"
  echo ""
  echo "Then run this script again."
  exit 1
fi

echo "✓ Authenticated with Supabase"
echo ""

# Link to project if needed
echo "Linking to project..."
npx supabase link --project-ref alcnbrdpzyspeqvvsjzu 2>/dev/null || echo "✓ Already linked"
echo ""

# Deploy the function
echo "Deploying parse-jd function..."
npx supabase functions deploy parse-jd

if [ $? -eq 0 ]; then
  echo ""
  echo "========================================="
  echo "✅ Deployment Successful!"
  echo "========================================="
  echo ""
  echo "Next steps:"
  echo "1. Run: bash test-filename-extraction.sh"
  echo "2. Import a file from Google Drive to test"
  echo "3. Verify company names are extracted from filenames"
  echo ""
else
  echo ""
  echo "========================================="
  echo "❌ Deployment Failed"
  echo "========================================="
  echo ""
  echo "Troubleshooting:"
  echo "1. Make sure you're logged in: npx supabase login"
  echo "2. Check your internet connection"
  echo "3. Verify project access"
  echo ""
  exit 1
fi
