# Pre-Import Checklist

## ⚠️ CRITICAL: Run This First

Before importing any files, you MUST run this SQL in your Supabase dashboard:

1. Go to: https://supabase.com/dashboard/project/alcnbrdpzyspeqvvsjzu/sql
2. Click "New Query"
3. Paste and run:

```sql
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS company_summary TEXT,
ADD COLUMN IF NOT EXISTS annual_revenue TEXT,
ADD COLUMN IF NOT EXISTS salary_currency TEXT DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS google_drive_file_url TEXT;

SELECT 'Migration complete!' as status;
```

4. Verify you see "Migration complete!" message

## System Status

### ✅ Completed

- [x] Edge Function deployed with mammoth library
- [x] Claude API model updated to stable version (claude-3-5-sonnet-20241022)
- [x] .docx text extraction implemented
- [x] Unicode sanitization in place
- [x] Frontend integration complete
- [x] Dev server running without errors
- [x] Bulk delete functionality added
- [x] Company enrichment columns added to UI

### ⚠️ Requires Your Action

- [ ] Run database migration SQL (see above)
- [ ] Test with 1-2 files first
- [ ] Monitor Anthropic API usage
- [ ] Review results before bulk import

## Import Process

### Step 1: Prepare
1. Ensure you're logged in with Google OAuth
2. Verify Google Drive folder ID is correct (check `.env`)
3. Current folder: `15Tr9_d19ryo0unmno6dKxEDy5fEVuQ6p`

### Step 2: Test Import (1-2 files)
1. Go to Applications page
2. Click "Import from Google Drive"
3. Select ONLY 1-2 files
4. Click "Import X Files"
5. Watch progress and wait for completion

### Step 3: Verify Results
- Check if company name is correct
- Verify job title matches
- Look for company enrichment data (industry, size, type)
- Review salary if present
- Check fit score (may take a moment to calculate)

### Step 4: Bulk Import (if test successful)
1. If tests look good, import remaining files
2. Monitor progress
3. Use bulk delete if needed to clean up errors

## What to Expect

### Successful Import Shows:
- ✅ Company name from document
- ✅ Job title from document
- ✅ Salary range (if in document)
- ✅ Location (if in document)
- ✅ Industry (from Claude's knowledge)
- ✅ Company size (from Claude's knowledge)
- ✅ Company type (from Claude's knowledge)
- ✅ Stock ticker (if public company)
- ✅ Link to original Google Drive file
- ⏳ Fit score (calculated after import)

### Claude May Return Null For:
- Unknown/small companies
- Startups without public info
- Company fields not in training data

## Monitoring

### Watch For:
1. **Import progress**: Real-time counter shows imported/errors/total
2. **Error messages**: Specific errors displayed in UI
3. **Anthropic credits**: Check dashboard if many errors occur
4. **Database**: Verify data looks correct in Applications table

### If Errors Occur:
1. Check error message in UI
2. Review Supabase function logs: https://supabase.com/dashboard/project/alcnbrdpzyspeqvvsjzu/functions
3. Check Anthropic API dashboard for API errors
4. Ensure file is actually a .docx or Google Doc
5. Verify file isn't corrupted

## Cost Monitoring

Current Anthropic balance: Check at https://console.anthropic.com/

Estimated costs:
- Per file: $0.03-$0.10
- 100 files: $3-$10
- Your ~140 files: ~$4.20-$14

## Emergency Stop

If something goes wrong during import:
1. Refresh the page (imports are processed sequentially, stopping will prevent remaining files)
2. Use bulk delete to remove incorrect imports
3. Check logs to understand the issue
4. Fix problem before retrying

## After Import

### Next Steps:
1. Review all imported applications
2. Check fit scores
3. Delete any incorrectly parsed applications
4. Manually add any missing company data if needed
5. Use filters to find high-fit opportunities

## Support Files

- `TEST_RESULTS.md`: Detailed test results and system status
- `run-migration.sql`: Database migration SQL
- `test-import.js`: Static validation tests
- `test-edge-function.sh`: System component tests

---

**Ready to import?**

1. ✅ Run migration SQL in Supabase
2. ✅ Import 1-2 test files
3. ✅ Verify results
4. ✅ Import remaining files

**App running at:** http://localhost:5173
