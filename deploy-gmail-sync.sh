#!/bin/bash

echo "🚀 Deploying gmail-sync function"
echo "================================="
echo ""

npx supabase functions deploy gmail-sync --project-ref alcnbrdpzyspeqvvsjzu

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Deployment successful!"
  echo ""
  echo "The Gmail sync now uses the MOST RECENT email date to determine status."
  echo ""
  echo "Example:"
  echo "  - Email 1 (Dec 1): JH25 - Applied"
  echo "  - Email 2 (Dec 2): JH25 - Recruiter Screen"
  echo "  - Email 3 (Dec 3): JH25 - Hiring Manager"
  echo "  → Status will be: 'hiring_manager' (most recent)"
  echo ""
  echo "Test it:"
  echo "  1. Go to Settings page"
  echo "  2. Click 'Sync Now'"
  echo "  3. Check Applications page for updated statuses"
else
  echo ""
  echo "❌ Deployment failed"
fi
