# Deploy Filename Extraction Feature

## What Changed

The `parse-jd` edge function has been updated to extract company names from Google Drive filenames using the pattern: **`[Company] - [Role]`**

### Code Changes

**File:** [supabase/functions/parse-jd/index.ts](supabase/functions/parse-jd/index.ts)

**New Feature (Lines 88-97):**
```typescript
// Extract company name from filename if it follows pattern: [Company] - [Role]
let companyHint: string | null = null
if (fileName) {
  const filenameWithoutExt = fileName.replace(/\.(docx?|txt|pdf)$/i, '')
  const match = filenameWithoutExt.match(/^([^-]+)\s*-\s*(.+)$/)
  if (match) {
    companyHint = match[1].trim()
    console.log(`Extracted company hint from filename: "${companyHint}"`)
  }
}
```

**Updated Prompt (Line 127):**
```typescript
${companyHint ? `FILENAME HINT: The file is named "${fileName}" which suggests the company name is: "${companyHint}". Use this as the company_name unless the document clearly indicates a different company.\n\n` : ''}
```

### How It Works

1. **Filename Parsing**: Extracts company name from filenames like:
   - `Blackrock - Global Head of Digital Client Experience.docx` → Company: "Blackrock"
   - `Capital One - Sr. Director, Product Management.docx` → Company: "Capital One"
   - `Confidential - Chief Product Officer.docx` → Company: "Confidential"

2. **Claude AI Enrichment**: The extracted company name is passed as a hint to Claude, which then:
   - Uses the filename company name as the primary source
   - Falls back to document text if filename doesn't match
   - Enriches with company data (size, revenue, industry, type, ticker)

3. **Backward Compatible**: Files without the `[Company] - [Role]` pattern still work - Claude extracts from document text as before

---

## Deployment Steps

### Option 1: Using Supabase CLI (Recommended)

```bash
# 1. Login to Supabase (if not already logged in)
npx supabase login

# 2. Link to your project
npx supabase link --project-ref alcnbrdpzyspeqvvsjzu

# 3. Deploy the updated function
npx supabase functions deploy parse-jd

# 4. Verify deployment
npx supabase functions list
```

### Option 2: Using Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/alcnbrdpzyspeqvvsjzu/functions
2. Click on `parse-jd` function
3. Click "Deploy new version"
4. Copy the entire contents of `supabase/functions/parse-jd/index.ts`
5. Paste into the editor and click "Deploy"

---

## Testing After Deployment

### Test 1: Verify Filename Extraction
```bash
bash test-filename-extraction.sh
```

**Expected Output:**
- Test 1: `company_name: "Blackrock"`
- Test 2: `company_name: "Capital One"`
- Test 3: `company_name: "Confidential"`

### Test 2: Import from Google Drive UI

1. Open your app: http://localhost:5173/applications
2. Click "Import from Google Drive"
3. Select a file with pattern: `[Company] - [Role].docx`
4. Verify the imported application has:
   - ✅ Correct company name from filename
   - ✅ Enriched data: industry, company_size, company_type
   - ✅ Stock ticker (if public company)

---

## Example Filenames from Your Drive

These will now extract company names correctly:

| Filename | Extracted Company | Will Enrich With |
|----------|------------------|------------------|
| `Blackrock - Global Head of Digital Client Experience.docx` | Blackrock | Industry: Asset Management<br>Size: 10000+<br>Type: public<br>Ticker: BLK |
| `Capital One - Sr. Director, Product Management.docx` | Capital One | Industry: Financial Services<br>Size: 10000+<br>Type: public<br>Ticker: COF |
| `American Express - VP, Cross Platform Delivery.docx` | American Express | Industry: Financial Services<br>Size: 10000+<br>Type: public<br>Ticker: AXP |
| `24Seven Talent - Senior Vice President of Engagement Marketing.docx` | 24Seven Talent | Industry: Staffing/Recruiting<br>(Will search for company info) |
| `Confidential - Chief Product and Experience Officer.docx` | Confidential | Company: Confidential<br>(No enrichment data) |

---

## Benefits

### Before This Update:
- ❌ Company name extracted only from document text (unreliable)
- ❌ Missing company names if not mentioned in document
- ❌ Inconsistent company name formatting

### After This Update:
- ✅ Company name extracted from filename (reliable, consistent)
- ✅ Works even if company name not in document
- ✅ Consistent company naming across all imports
- ✅ Better enrichment accuracy (Claude knows exact company name)

---

## Rollback Plan

If issues occur after deployment, revert by:

1. Remove the filename extraction code (lines 88-97)
2. Remove the company hint from prompt (line 127)
3. Redeploy the function

Or restore from git:
```bash
git diff HEAD~1 supabase/functions/parse-jd/index.ts
git checkout HEAD~1 -- supabase/functions/parse-jd/index.ts
npx supabase functions deploy parse-jd
```

---

## Monitoring

After deployment, check Supabase logs:

```bash
# View function logs
npx supabase functions logs parse-jd --tail

# Look for this log message:
# "Extracted company hint from filename: '[Company Name]'"
```

Or in Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/alcnbrdpzyspeqvvsjzu/logs/edge-functions
2. Filter by function: `parse-jd`
3. Look for company extraction logs

---

## Files Modified

- ✅ [supabase/functions/parse-jd/index.ts](supabase/functions/parse-jd/index.ts) - Added filename parsing
- ✅ [test-filename-extraction.sh](test-filename-extraction.sh) - New test script
- ✅ [DEPLOY_FILENAME_EXTRACTION.md](DEPLOY_FILENAME_EXTRACTION.md) - This file

---

## Next Steps After Deployment

1. ✅ Deploy the function
2. ✅ Run test script to verify
3. ✅ Import 1-2 test files from Google Drive
4. ✅ Verify enriched data appears correctly
5. 🔄 Re-import existing applications to get enriched data

---

## Questions?

If you encounter issues:
1. Check Supabase function logs
2. Run `test-filename-extraction.sh` to verify endpoint
3. Check browser console for client-side errors
4. Verify JWT token is valid in `.env.local`
