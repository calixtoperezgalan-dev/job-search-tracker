#!/bin/bash

echo "🚀 Deploying Filename Extraction Feature"
echo "========================================"
echo ""

# Deploy the function
npx supabase functions deploy parse-jd --project-ref alcnbrdpzyspeqvvsjzu

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deployment Successful!"
  echo ""
  echo "Running tests..."
  echo ""
  bash test-filename-extraction.sh
else
  echo ""
  echo "❌ Deployment failed"
  echo ""
  echo "Please run:"
  echo "  npx supabase login"
  echo ""
  echo "Then try again:"
  echo "  bash deploy-now.sh"
fi
