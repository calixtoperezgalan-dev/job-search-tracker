# Deploy Filename Extraction - Simple Instructions

## The Problem
Your app shows company names like "Unknown", "Exact company name not provided", "The company" instead of extracting from Google Drive filenames.

## The Fix
I've updated the code to extract company names from filenames (pattern: `[Company] - [Role]`).
**The code is ready**, it just needs to be deployed to Supabase cloud.

---

## Deploy in 1 Command

```bash
npx supabase functions deploy parse-jd --project-ref alcnbrdpzyspeqvvsjzu
```

### If you get "Access token not provided"

Run this first (it will open your browser to login):
```bash
npx supabase login
```

Then deploy:
```bash
npx supabase functions deploy parse-jd --project-ref alcnbrdpzyspeqvvsjzu
```

---

## What Happens After Deployment

### Before (Current):
- ❌ Company: "Exact company name not provided"
- ❌ Company: "Unknown"
- ❌ Company: "The company"

### After (Fixed):
- ✅ Company: "Blackrock" (from filename: `Blackrock - Global Head...docx`)
- ✅ Company: "Capital One" (from filename: `Capital One - Sr. Director...docx`)
- ✅ Company: "Canva" (from filename: `Canva - Global Head...docx`)

Plus enriched data:
- ✅ Industry populated
- ✅ Company size populated
- ✅ Company type populated
- ✅ Stock ticker (for public companies)

---

## Test After Deployment

```bash
bash test-filename-extraction.sh
```

Expected output:
```json
"Blackrock"
"Asset Management"
"public"
```

---

## Alternative: Deploy via Supabase Dashboard

If CLI doesn't work:

1. Go to: https://supabase.com/dashboard/project/alcnbrdpzyspeqvvsjzu/functions
2. Click on `parse-jd` function
3. Click "Edit" or "Deploy new version"
4. Copy all contents from: `supabase/functions/parse-jd/index.ts`
5. Paste into editor
6. Click "Deploy"

---

## Why This Didn't Auto-Deploy

Supabase Edge Functions are deployed to the cloud and don't auto-update when you change local code. They need manual deployment.

Yesterday Claude Code likely had you logged in already, so the deployment worked automatically.

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npx supabase login` | Login to Supabase (one-time) |
| `npx supabase functions deploy parse-jd --project-ref alcnbrdpzyspeqvvsjzu` | Deploy the function |
| `bash test-filename-extraction.sh` | Test the deployed function |
| `npx supabase functions logs parse-jd` | View function logs |

---

## Need Help?

If deployment fails, share the error message and I'll help troubleshoot.
