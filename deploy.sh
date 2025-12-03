#!/bin/bash

# Simple deployment script for parse-jd function
# This updates the cloud function with filename extraction feature

echo "🚀 Deploying parse-jd function to Supabase..."
echo ""

# Export the Supabase URL from .env
export SUPABASE_URL="https://alcnbrdpzyspeqvvsjzu.supabase.co"

# Try to deploy (will prompt for login if needed)
npx supabase functions deploy parse-jd --project-ref alcnbrdpzyspeqvvsjzu

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deployment successful!"
  echo ""
  echo "Testing the deployed function..."
  bash test-filename-extraction.sh
else
  echo ""
  echo "❌ Deployment failed"
  echo ""
  echo "You need to login to Supabase first:"
  echo "  npx supabase login"
  echo ""
  echo "Then run this script again:"
  echo "  bash deploy.sh"
fi
