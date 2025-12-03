# Quick Deploy - Filename Extraction Feature

## Problem
Your app shows company names like "Exact company name not provided", "The company", "Unknown" because it's trying to extract from the document text instead of the filename.

## Solution
Deploy the updated `parse-jd` function that extracts company names from your Google Drive filenames.

---

## Option 1: CLI Deployment (30 seconds)

```bash
# Step 1: Login to Supabase
npx supabase login

# Step 2: Deploy
bash deploy-parse-jd.sh
```

---

## Option 2: Manual Dashboard Deployment (2 minutes)

### Step 1: Copy the Updated Function Code

The updated function is at: `supabase/functions/parse-jd/index.ts`

### Step 2: Go to Supabase Dashboard

Open: https://supabase.com/dashboard/project/alcnbrdpzyspeqvvsjzu/functions

### Step 3: Update the Function

1. Click on the `parse-jd` function
2. Click "Edit function" or "Deploy new version"
3. Copy the entire contents of `supabase/functions/parse-jd/index.ts`
4. Paste into the code editor
5. Click "Deploy"

### Step 4: Wait for Deployment
- Watch for "Deployment successful" message
- Usually takes 30-60 seconds

---

## Option 3: Alternative - Update via File Upload

If the dashboard has a "Deploy from file" option:

1. Go to: https://supabase.com/dashboard/project/alcnbrdpzyspeqvvsjzu/functions
2. Click on `parse-jd`
3. Look for "Upload" or "Deploy from file" button
4. Upload: `supabase/functions/parse-jd/index.ts`
5. Click "Deploy"

---

## What Changed

### Before (Current - Not Working):
```typescript
// No filename parsing - Claude extracts from document text
const messageContent = `${extractionPrompt}

Job Description Document:
---
${extractedText}
---`
```

### After (New - Works Correctly):
```typescript
// Extract company from filename first
let companyHint: string | null = null
if (fileName) {
  const filenameWithoutExt = fileName.replace(/\.(docx?|txt|pdf)$/i, '')
  const match = filenameWithoutExt.match(/^([^-]+)\s*-\s*(.+)$/)
  if (match) {
    companyHint = match[1].trim()  // "Blackrock" from "Blackrock - Role.docx"
  }
}

// Pass filename hint to Claude
const messageContent = `${extractionPrompt}

${companyHint ? `FILENAME HINT: The file is named "${fileName}" which suggests the company name is: "${companyHint}". Use this as the company_name unless the document clearly indicates a different company.\n\n` : ''}Job Description Document:
---
${extractedText}
---`
```

---

## Verify Deployment

### Test 1: Run Test Script
```bash
bash test-filename-extraction.sh
```

**Expected Output:**
```json
{
  "company_name": "Blackrock",
  "industry": "Asset Management",
  "company_type": "public",
  "stock_ticker": "BLK"
}
```

### Test 2: Import from Google Drive

1. Open app: http://localhost:5173/applications
2. Click "Import from Google Drive"
3. Select a file like: `Blackrock - Global Head of Digital Client Experience.docx`
4. Verify the table shows:
   - ✅ Company: "Blackrock" (not "Exact company name not provided")
   - ✅ Industry: "Asset Management"
   - ✅ Company Type: "public"

---

## Troubleshooting

### Issue: "Access token not provided"
**Solution:** Run `npx supabase login` first

### Issue: "Project not linked"
**Solution:** Run `npx supabase link --project-ref alcnbrdpzyspeqvvsjzu`

### Issue: Deployment times out
**Solution:** Use Dashboard deployment (Option 2) instead

### Issue: Still showing "Unknown" company
**Cause:** Old function is still running
**Solution:**
1. Clear Supabase function cache
2. Wait 1-2 minutes for deployment to propagate
3. Hard refresh browser (Cmd+Shift+R)
4. Try importing a new file

---

## Example Filename Mappings

After deployment, these filenames will extract correctly:

| Your Filename | Extracted Company | Old Behavior |
|---------------|------------------|--------------|
| `Blackrock - Global Head of Digital Client Experience.docx` | ✅ Blackrock | ❌ "Unknown" |
| `Capital One - Sr. Director, Product Management.docx` | ✅ Capital One | ❌ "Exact company name not provided" |
| `Canva - Global Head of Business Marketing.docx` | ✅ Canva | ❌ "The company" |
| `Macy's - Sr. Director, Product Management.docx` | ✅ Macy's | ❌ "Macy's" (worked by luck) |
| `Dentsu - Executive Vice President, Strategic Futures.docx` | ✅ Dentsu | ❌ "Dentsu" (worked by luck) |

---

## Re-Import Existing Applications

After deployment, to fix existing applications with wrong names:

1. Delete applications with "Unknown", "The company", etc.
2. Re-import from Google Drive
3. New imports will have correct company names

Or create a backfill script to update existing records (I can help with this).

---

## Need Help?

If deployment fails or you need assistance:
1. Share the error message you see
2. Check Supabase function logs: https://supabase.com/dashboard/project/alcnbrdpzyspeqvvsjzu/logs/edge-functions
3. Run: `bash test-filename-extraction.sh` to test the endpoint
