# Gmail Sync Not Working - Diagnosis & Fix

## Problem
Your Gmail has emails with the label "JH25 - Recruiter Screen" for Blackrock, but the application status in the app isn't updating when you run Gmail sync.

---

## Root Cause Analysis

### Issue 1: Nested Gmail Labels ✅ **Already Fixed**

**Your Gmail Structure:**
```
Job Search/
  JH - Apps/
    JH25 - Recruiter Screen
    JH25 - Applied
    JH25 - Offer
    etc.
```

**Gmail API Returns:**
```
"Job Search/JH - Apps/JH25 - Recruiter Screen"
```

**Good News:** The code already handles this!

Lines 241-244 in `gmail-sync/index.ts`:
```typescript
const matchingLabel = allLabels.find((l: any) =>
  l.name === expectedLabel || l.name?.endsWith(expectedLabel)
)
```

This checks if label **ends with** "JH25 - Recruiter Screen", so it matches your nested labels correctly.

---

### Issue 2: Company Name Matching ⚠️ **This is the Real Problem**

The Gmail sync extracts company names from emails and tries to match them to applications in your database.

**How Gmail Extracts Company Names:**

From your Gmail screenshot:
```
From: blackrock@myworkday.com
Subject: Thank you for applying for Managing Director...
Label: JH25 - Recruiter Screen
```

The function extracts company name from:
1. Email domain: `blackrock@myworkday.com` → "Blackrock" ✅
2. Subject line: No company found (generic recruiter message)
3. Sender name: "blackrock" → "Blackrock" ✅

**So Gmail extracts: "Blackrock"**

**But what's in your database?**

We need to check if:
- Application exists with company_name = "Blackrock" (or "BlackRock" or "blackrock")
- The fuzzy matching is working correctly
- Row Level Security (RLS) is blocking the match

---

## Diagnosis Steps

### Step 1: Check if Applications Exist

Run this from your browser console while logged into the app:

```javascript
// In browser console (F12 → Console tab)
const { data, error } = await window.supabase
  .from('applications')
  .select('id, company_name, status')
console.log('Applications:', data)
console.log('Error:', error)
```

**Expected Results:**
- If `data` is empty `[]` → **No applications in database!** Need to import first
- If `data` has companies → Check exact company names
- If `error` exists → RLS policy or auth issue

---

### Step 2: Test Company Matching Manually

Try fuzzy matching for "Blackrock":

```javascript
// In browser console
const { data: apps } = await window.supabase
  .from('applications')
  .select('id, company_name')

// Test fuzzy matching
const searchName = 'Blackrock'
const matches = apps.filter(app => {
  const norm1 = searchName.toLowerCase().replace(/[^a-z0-9]/g, '')
  const norm2 = app.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')
  return norm1.includes(norm2) || norm2.includes(norm1)
})

console.log('Fuzzy matches for "Blackrock":', matches)
```

**Expected:**
- Should find applications with company names like:
  - "Blackrock"
  - "BlackRock"
  - "BLACKROCK"
  - "Blackrock Inc"

---

### Step 3: Check Unmatched Emails

After running sync, check what emails couldn't be matched:

```javascript
// In browser console
const { data: unmatched } = await window.supabase
  .from('unmatched_emails')
  .select('*')
  .order('received_at', { ascending: false })
  .limit(10)

console.log('Unmatched emails:', unmatched)
```

**Look for:**
- Blackrock emails in unmatched list
- What company name was extracted (`sender_email`, `subject`)
- Why it didn't match

---

### Step 4: Run Sync with Debug Logging

Go to Settings → Gmail Sync → Click "Sync Now"

Look at the result message:
```
Sync Successful
• Processed: X emails
• Matched: X applications updated
• Unmatched: X emails

Debug Info:
• Found labels: JH - Apps/JH25 - Recruiter Screen, ...
• Messages found: 6
```

**Check:**
- `Found labels` includes your labels ✅
- `Messages found` > 0 ✅
- `Matched` > 0 ⚠️ (If 0, company matching failed)

---

## Most Likely Scenarios

### Scenario A: No Applications in Database

**Symptom:** All emails show as "Unmatched: 6"

**Cause:** You haven't imported any job applications yet from Google Drive

**Solution:**
1. Go to Applications page
2. Click "Import from Google Drive"
3. Select files with pattern: `[Company] - [Role].docx`
4. After import completes, run Gmail sync again

---

### Scenario B: Company Name Mismatch

**Symptom:** Applications exist but sync shows "Matched: 0"

**Cause:**
- Gmail extracts: "Blackrock"
- Database has: "BlackRock" or "Black Rock" or "Unknown"

**Solution:**

If database has wrong company names (like "Unknown"), you need to re-import:

1. Delete existing applications
2. Re-import from Google Drive with updated `parse-jd` function (already deployed!)
3. New imports will have correct company names from filenames
4. Run Gmail sync again

---

### Scenario C: Email Domain Not Matching

**Symptom:** Some companies match, others don't

**Example:**
- ✅ Blackrock email from `blackrock@myworkday.com` → Works
- ❌ Capital One email from `noreply@greenhouse.io` → Doesn't work

**Cause:** Generic ATS domains (greenhouse, lever, workday) hide company name

**Solution:**

The code tries multiple extraction methods:
1. Email domain (works for `company@company.com`)
2. Subject line (looks for "at Company" or "for Company")
3. Sender name (looks for "Name @ Company")

If email has generic domain AND no company in subject, it won't match.

**Manual fix:** Add company name to subject in Gmail before syncing

---

## Quick Test Procedure

### Test 1: Verify You Have Applications

```bash
# Open your app
open http://localhost:5173/applications

# Should see 3 applications (as shown in screenshot)
# Check company names
```

**If you see 3 applications:**
- Note exact company names (case-sensitive!)
- Proceed to Test 2

**If you see 0 applications:**
- Import from Google Drive first
- Use files with `[Company] - [Role]` pattern
- Then run Gmail sync

---

### Test 2: Run Sync and Check Results

1. Go to Settings page
2. Enable Gmail Sync (if not already enabled)
3. Click "Sync Now"
4. **Look at the result:**

**Success:**
```
✅ Sync Successful
• Processed: 6 emails
• Matched: 3 applications updated  ← Should be > 0
• Unmatched: 3 emails

Debug Info:
• Found labels: Job Search/JH - Apps/JH25 - Recruiter Screen, ...
• Messages found: 6
```

**Failure:**
```
⚠️ Sync Successful
• Processed: 6 emails
• Matched: 0 applications updated  ← This means company matching failed
• Unmatched: 6 emails
```

---

### Test 3: Verify Status Update

1. Go to Applications page
2. Find Blackrock application
3. Check Status column
4. Should show: "recruiter screen" (if email was labeled)

---

## Solutions by Scenario

### If Matched: 0 and Applications Exist

**Problem:** Company names don't match between Gmail and database

**Fix:**

1. **Check database company names:**
   ```javascript
   // Browser console
   const { data } = await window.supabase.from('applications').select('company_name')
   console.log('Company names:', data.map(a => a.company_name))
   ```

2. **Check what Gmail extracts:**
   - Look in `unmatched_emails` table
   - Or check Supabase logs for gmail-sync function

3. **If names are different:**
   - Option A: Manually update company_name in database to match Gmail
   - Option B: Re-import from Google Drive (recommended - uses filename)

---

### If No Applications in Database

**Fix:**

1. Import from Google Drive:
   ```
   Go to Applications page
   → Click "Import from Google Drive"
   → Select job description files
   → Wait for import to complete
   ```

2. Verify filenames follow pattern:
   ```
   ✅ Blackrock - Global Head of Digital Client Experience.docx
   ✅ Capital One - Sr. Director, Product Management.docx
   ❌ job_description_v2.docx
   ```

3. After import, run Gmail sync

---

### If Gmail Labels Not Found

**Symptom:**
```
❌ Label Configuration Issue
No Gmail labels found matching expected names
```

**Fix:**

Your labels are nested, which is fine. The code handles it.

But ensure exact spelling:
- ✅ `JH25 - Recruiter Screen` (capital R, capital S)
- ❌ `JH25 - recruiter screen` (lowercase)
- ❌ `JH25-Recruiter Screen` (no spaces around dash)

---

## Expected Behavior After Fix

1. **Import Applications from Google Drive**
   - Company names extracted from filenames: "Blackrock", "Capital One", etc.
   - Enriched with industry, size, type data

2. **Label Emails in Gmail**
   - Label Blackrock email with `JH25 - Recruiter Screen`
   - Label Capital One email with `JH25 - Hiring Manager`

3. **Run Gmail Sync**
   ```
   ✅ Processed: 2 emails
   ✅ Matched: 2 applications updated
   ✅ Unmatched: 0 emails
   ```

4. **Check Applications Page**
   - Blackrock status: "recruiter screen"
   - Capital One status: "hiring manager"

---

## Next Steps

1. **Verify applications exist:**
   - Open http://localhost:5173/applications
   - Check you have 3 applications
   - Note exact company names

2. **Run Gmail sync:**
   - Go to Settings
   - Click "Sync Now"
   - Share the result message with me

3. **If Matched: 0, run diagnosis:**
   ```javascript
   // Browser console
   const { data: apps } = await window.supabase
     .from('applications')
     .select('company_name')
   console.log('Apps:', apps)

   const { data: unmatched } = await window.supabase
     .from('unmatched_emails')
     .select('*')
     .order('received_at', { ascending: false })
     .limit(5)
   console.log('Unmatched:', unmatched)
   ```

4. **Share the output** and I'll help debug further!

---

## Files to Check

- [gmail-sync/index.ts](supabase/functions/gmail-sync/index.ts#L59-L110) - Company extraction logic
- [gmail-sync/index.ts](supabase/functions/gmail-sync/index.ts#L112-L145) - Fuzzy matching logic
- [GmailSync.tsx](src/components/GmailSync.tsx) - UI component
- [GMAIL_SYNC_TEST.md](GMAIL_SYNC_TEST.md) - Full testing guide

---

## Common Issues Summary

| Issue | Symptom | Fix |
|-------|---------|-----|
| No applications imported | Matched: 0, database empty | Import from Google Drive first |
| Company name mismatch | Matched: 0, apps exist | Re-import or manually update company names |
| Generic ATS email domain | Some match, others don't | Add company to subject line or sender name |
| Label spelling wrong | "Labels not found" error | Fix label names (case-sensitive) |
| RLS blocking query | Database returns [] | Check auth/session |
| Token expired | "Invalid authorization token" | Sign out and sign back in |

---

Let me know the results and I'll help debug further!
