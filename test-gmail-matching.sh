#!/bin/bash

# Test if Gmail sync would match the Blackrock email

echo "Testing Gmail Sync Matching Logic"
echo "=================================="
echo ""
echo "Email Details:"
echo "  From: blackrock@myworkday.com"
echo "  Label: JH25 - Recruiter Screen"
echo "  Subject: Thank you for applying for Managing Director - Preqin Global..."
echo ""
echo "Application in database:"
echo "  Company: Blackrock"
echo ""
echo "Expected behavior:"
echo "  1. Extract 'blackrock' from email domain 'blackrock@myworkday.com'"
echo "  2. Fuzzy match 'blackrock' with 'Blackrock' in database"
echo "  3. Update status to 'recruiter_screen'"
echo ""
echo "Run sync from Settings page to test..."
