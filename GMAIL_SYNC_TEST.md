# Gmail Sync Testing Guide

## How Gmail Sync Works

Your app automatically updates application statuses based on Gmail labels you add to emails. It matches emails to applications by extracting company names from:
1. Sender email domain (e.g., `recruiter@blackrock.com` → "Blackrock")
2. Sender name (e.g., "John Smith @ Capital One")
3. Email subject line (e.g., "Interview at American Express")

## Supported Gmail Labels

The app recognizes these Gmail labels and maps them to application statuses:

| Gmail Label | App Status | Example Use |
|-------------|-----------|-------------|
| `JH25 - Applied` | applied | Initial application sent |
| `JH25 - Follow up` | follow_up | Sent follow-up email |
| `JH25 - Recruiter Screen` | recruiter_screen | Scheduled or completed recruiter call |
| `JH25 - Hiring Manager` | hiring_manager | Scheduled or completed hiring manager interview |
| `JH25 - interviews` | interviews | Technical or panel interviews |
| `JH25 - Offer` | offer | Received job offer |
| `JH25-Rejected` | rejected | Received rejection |
| `JH25 - Withdraw` | withdrawn | Withdrew application |
| `JH25 - Networking` | (networking contacts) | General networking emails |

## Testing Steps

### Step 1: Enable Gmail Sync

1. **Go to Settings:**
   - Open your app: http://localhost:5173
   - Click "Settings" in the left sidebar

2. **Initialize Gmail Sync:**
   - Find the "Gmail Sync" section
   - Click "Enable Gmail Sync" or "Initialize Sync"
   - App will use your Google OAuth token (already authenticated)

### Step 2: Create Gmail Labels

1. **Open Gmail:** https://mail.google.com

2. **Create Labels:**
   - Click the Settings gear icon (top right)
   - Click "See all settings"
   - Go to "Labels" tab
   - Click "Create new label"
   - Create these labels (case-sensitive!):
     - `JH25 - Applied`
     - `JH25 - Recruiter Screen`
     - `JH25 - Hiring Manager`
     - `JH25 - interviews`
     - `JH25 - Offer`
     - `JH25-Rejected`
     - `JH25 - Withdraw`
     - `JH25 - Follow up`

3. **Tip:** Create a parent label "JH25" and nest all labels under it for organization

### Step 3: Label Test Emails

For this test, you'll label emails related to applications you've already imported.

**Example Test Scenario:**

1. **Find an email from a company in your applications:**
   - Look for an email from Blackrock, Capital One, American Express, etc.
   - Could be any email: application confirmation, recruiter outreach, interview invite

2. **Add a label to test status update:**
   - Select the email
   - Click the label icon (looks like a tag)
   - Choose `JH25 - Recruiter Screen`
   - The label will be applied

3. **Try multiple companies:**
   - Find email from Capital One → Label it `JH25 - Hiring Manager`
   - Find email from American Express → Label it `JH25 - interviews`
   - Find email from Canva → Label it `JH25 - Offer`

### Step 4: Run Gmail Sync

1. **Go to Settings Page:**
   - Click "Settings" in sidebar
   - Find "Gmail Sync" section

2. **Click "Sync Now" button**
   - Button will show loading spinner
   - Wait 10-30 seconds (depends on email volume)

3. **Check Results:**
   - Success message shows:
     - `Processed: X messages`
     - `Matched: X applications`
     - `Unmatched: X emails`
   - `Matched` = emails successfully linked to applications
   - `Unmatched` = emails that couldn't match to any application

### Step 5: Verify Status Updates

1. **Go to Applications Page:**
   - Click "Applications" in sidebar

2. **Check Status Column:**
   - Find the application for the company you labeled
   - Status should now match the label you applied:
     - Blackrock email with `JH25 - Recruiter Screen` → Status: "recruiter screen"
     - Capital One email with `JH25 - Hiring Manager` → Status: "hiring manager"
     - American Express email with `JH25 - interviews` → Status: "interviews"

3. **Verify Status History (Optional):**
   - Open your Supabase dashboard
   - Go to Table Editor → `application_status_history`
   - You should see entries with:
     - `source: 'gmail'`
     - `previous_status` and `new_status`
     - `gmail_message_id`

---

## Expected Results

### ✅ Success Indicators:

1. **Sync completes without errors**
2. **Matched count > 0** (at least one email matched)
3. **Application status updated** in the table
4. **Status history logged** in database

### ❌ Common Issues:

| Issue | Cause | Solution |
|-------|-------|----------|
| "Gmail sync not configured" | Not initialized | Click "Enable Gmail Sync" in Settings |
| Matched: 0 applications | Company name mismatch | Check email sender domain matches company name in app |
| "Invalid authorization token" | OAuth token expired | Sign out and sign back in with Google |
| Labels not found | Label names incorrect | Labels are case-sensitive: `JH25 - Recruiter Screen` |

---

## Advanced Testing Scenarios

### Scenario 1: Multiple Emails, Same Company

1. Find 3 emails from the same company (e.g., Blackrock)
2. Label them with different statuses in chronological order:
   - Email 1 (oldest): `JH25 - Applied`
   - Email 2: `JH25 - Recruiter Screen`
   - Email 3 (newest): `JH25 - Hiring Manager`
3. Run sync
4. **Expected:** App status = "hiring manager" (most recent)

### Scenario 2: Unmatched Email (New Company)

1. Find email from a company NOT in your applications
2. Label it `JH25 - Recruiter Screen`
3. Run sync
4. **Expected:**
   - Matched: 0 (for this email)
   - Unmatched: 1
   - Email saved to `unmatched_emails` table

### Scenario 3: Company Name Variations

1. Application in database: "American Express"
2. Email from: `recruiter@amex.com`
3. Label email: `JH25 - Offer`
4. Run sync
5. **Expected:** Fuzzy matching should work (both contain "amex"/"american express")

---

## Troubleshooting

### Check Sync State

```sql
-- Run in Supabase SQL Editor
SELECT
  user_id,
  sync_enabled,
  last_sync_at,
  token_expiry
FROM gmail_sync_state
WHERE user_id = 'YOUR_USER_ID';
```

### Check Status History

```sql
-- Run in Supabase SQL Editor
SELECT
  a.company_name,
  h.previous_status,
  h.new_status,
  h.source,
  h.changed_at
FROM application_status_history h
JOIN applications a ON h.application_id = a.id
WHERE h.source = 'gmail'
ORDER BY h.changed_at DESC
LIMIT 10;
```

### Check Unmatched Emails

```sql
-- Run in Supabase SQL Editor
SELECT
  sender_email,
  subject,
  label_name,
  suggested_status,
  received_at
FROM unmatched_emails
ORDER BY received_at DESC
LIMIT 10;
```

---

## Manual Sync via API (Alternative Testing)

If UI doesn't work, test via API directly:

```bash
# Get your JWT token from browser (DevTools → Application → Local Storage → supabase.auth.token)
TOKEN="your_jwt_token_here"

curl -X POST "https://alcnbrdpzyspeqvvsjzu.supabase.co/functions/v1/gmail-sync" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

---

## Test Checklist

- [ ] Gmail sync enabled in Settings
- [ ] Created all required Gmail labels
- [ ] Labeled at least 3 emails with different statuses
- [ ] Ran sync from Settings page
- [ ] Verified status updates in Applications table
- [ ] Checked status history in database
- [ ] Tested with company name variations
- [ ] Tested unmatched email handling

---

## Notes

- **Sync is manual:** You must click "Sync Now" - it's not automatic
- **Label format matters:** `JH25 - Recruiter Screen` not `jh25-recruiter-screen`
- **Company matching:** Uses fuzzy logic (normalized strings, contains matching)
- **Email limits:** Syncs up to 500 most recent emails with JH25 labels
- **Rate limits:** Gmail API has rate limits - wait if you hit errors

---

## Next Steps After Testing

If sync works:
1. Label more emails in Gmail with appropriate statuses
2. Run sync regularly to keep statuses updated
3. Consider automating sync (would require adding a cron job/webhook)

If sync fails:
1. Share the error message
2. Check browser console (F12 → Console tab)
3. Check Supabase function logs
4. I can help debug!
