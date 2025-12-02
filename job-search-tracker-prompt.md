# Job Search Tracker - Full Implementation Specification

## Project Overview

Build a job search tracking application for a senior executive (Global Head level, targeting $800K+ total compensation roles). 

**Client Context:**
- Current Role: Global Head of Go-To-Market & Sales Enablement at Amazon Ads
- Experience: 20+ years across Amazon, Heineken, Citi, L'Oréal
- Expertise: Revenue Operations, GTM Strategy, Sales Enablement, Platform Consolidation, AI-enabled GTM transformation
- Key Achievements: 91% tool adoption rates, $683M revenue attribution, sunsetting 23 legacy tools
- Deadline: Role elimination Jan 26, 2026. Target offer by Feb 1, 2026. Start new job by Mar 1, 2026.

**Existing Assets:**
- 130+ job applications stored as files in Google Drive
- 314+ Gmail threads with status labels (JH25-[status] format)
- GitHub repo: https://github.com/calixtoperezgalan-dev/job-search-tracker
- Google Drive JD Folder: https://drive.google.com/drive/folders/15Tr9_d19ryo0unmno6dKxEDy5fEVuQ6p
- Google Drive Folder ID: 15Tr9_d19ryo0unmno6dKxEDy5fEVuQ6p

**Timeline:** Fully functional by December 5, 2025 (3 days)

**Supabase Project:**
- Project Name: job-search-tracker
- Project Ref: alcnbrdpzyspeqvvsjzu
- URL: https://alcnbrdpzyspeqvvsjzu.supabase.co
- Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsY25icmRwenlzcGVxdnZzanp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODExNjksImV4cCI6MjA4MDI1NzE2OX0.oI5tsvwopz_4-umWsXtVG4cC9dYoehdrmmf2b02oa4g

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | React 18 + TypeScript + Vite + TailwindCSS | Fast development, type safety, modern tooling |
| Backend | Supabase (Postgres + Auth + Edge Functions + RLS) | Built-in auth, real-time, serverless functions, row-level security |
| Hosting | Vercel | Seamless GitHub integration, edge functions, free tier |
| AI | Claude API (Anthropic) - claude-sonnet-4-20250514 | Cost-effective parsing and analysis |
| Charts | Recharts | React-native, well-documented |
| APIs | Google Drive API, Gmail API | Required integrations |

---

## Database Schema

### Migration File Location
`supabase/migrations/001_initial_schema.sql`

### Table: applications

```sql
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_summary TEXT,
  job_title TEXT NOT NULL,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  location TEXT,
  company_size TEXT,
  annual_revenue TEXT,
  industry TEXT,
  company_type TEXT,
  stock_ticker TEXT,
  stock_price DECIMAL,
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'recruiter_screen', 'hiring_manager', 'interviews', 'offer', 'rejected', 'withdrawn', 'follow_up')),
  status_updated_at TIMESTAMPTZ DEFAULT NOW(),
  contact_name TEXT,
  contact_email TEXT,
  contact_linkedin TEXT,
  referral_source TEXT,
  notes TEXT,
  fit_score INTEGER CHECK (fit_score >= 0 AND fit_score <= 100),
  fit_analysis JSONB,
  google_drive_file_id TEXT,
  google_drive_file_url TEXT,
  job_description_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own applications" ON applications
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_applications_user_status ON applications(user_id, status);
CREATE INDEX idx_applications_company ON applications(user_id, company_name);
CREATE INDEX idx_applications_date ON applications(user_id, application_date);
```

### Table: application_status_history

```sql
CREATE TABLE application_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'manual',
  gmail_message_id TEXT,
  notes TEXT
);

ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own history" ON application_status_history
  FOR ALL USING (auth.uid() = user_id);
```

### Table: networking_contacts

```sql
CREATE TABLE networking_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  title TEXT,
  linkedin_url TEXT,
  email TEXT,
  phone TEXT,
  relationship_strength TEXT DEFAULT 'warm',
  last_contact_date DATE,
  next_follow_up_date DATE,
  referral_status TEXT DEFAULT 'none',
  linked_application_id UUID REFERENCES applications(id),
  notes TEXT,
  tags TEXT[],
  gmail_thread_ids TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE networking_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own contacts" ON networking_contacts
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_contacts_user ON networking_contacts(user_id);
CREATE INDEX idx_contacts_followup ON networking_contacts(user_id, next_follow_up_date);
```

### Table: gmail_sync_state

```sql
CREATE TABLE gmail_sync_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  last_history_id TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gmail_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own sync state" ON gmail_sync_state
  FOR ALL USING (auth.uid() = user_id);
```

### Table: ai_insights

```sql
CREATE TABLE ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  title TEXT,
  content JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  is_actionable BOOLEAN DEFAULT TRUE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  action_taken BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own insights" ON ai_insights
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_insights_user_date ON ai_insights(user_id, generated_at DESC);
```

### Table: user_profile

```sql
CREATE TABLE user_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  full_name TEXT,
  resume_text TEXT,
  current_title TEXT,
  current_company TEXT,
  years_experience INTEGER,
  key_skills TEXT[],
  target_salary_min INTEGER DEFAULT 800000,
  target_salary_max INTEGER,
  target_industries TEXT[],
  target_company_sizes TEXT[],
  target_roles TEXT[],
  target_locations TEXT[],
  linkedin_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own profile" ON user_profile
  FOR ALL USING (auth.uid() = user_id);
```

### Table: unmatched_emails

```sql
CREATE TABLE unmatched_emails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gmail_message_id TEXT NOT NULL,
  gmail_thread_id TEXT,
  subject TEXT,
  sender_email TEXT,
  sender_name TEXT,
  snippet TEXT,
  label_name TEXT,
  suggested_status TEXT,
  received_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  resolution TEXT DEFAULT 'pending',
  matched_application_id UUID REFERENCES applications(id)
);

ALTER TABLE unmatched_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access own unmatched emails" ON unmatched_emails
  FOR ALL USING (auth.uid() = user_id);
```

---

## Gmail Label to Status Mapping

```typescript
const GMAIL_LABEL_STATUS_MAP: Record<string, string> = {
  'JH25 - Applied': 'applied',
  'JH25 - Follow up': 'follow_up',
  'JH25 - Hiring Manager': 'hiring_manager',
  'JH25 - interviews': 'interviews',
  'JH25 - Offer': 'offer',
  'JH25 - Recruiter Screen': 'recruiter_screen',
  'JH25 - Withdraw': 'withdrawn',
  'JH25-Rejected': 'rejected',
};

// Special case: 'JH25 - Networking' creates/updates networking_contacts, NOT applications
const NETWORKING_LABEL = 'JH25 - Networking';
```

**Gmail Label Volumes (as of Dec 2, 2025):**
- JH25 - Applied: 111 conversations
- JH25 - interviews: 52 conversations
- JH25-Rejected: 39 conversations
- JH25 - Networking: 104 conversations
- JH25 - Recruiter Screen: 5 conversations
- JH25 - Hiring Manager: 2 conversations
- JH25 - Follow up: 1 conversation
- JH25 - Offer: 0 conversations
- JH25 - Withdraw: 0 conversations

---

## Feature Specifications

### 1. Authentication & Security

**Implementation:**
- Supabase Auth with Google OAuth provider
- Single sign-on with same Google account used for Gmail/Drive
- Store Google OAuth tokens (access + refresh) for API access
- Implement automatic token refresh before expiry
- Row Level Security (RLS) on all tables restricting data to authenticated user

**Flow:**
1. User clicks "Sign in with Google"
2. Google OAuth consent screen requests Gmail + Drive permissions
3. On success, Supabase creates session
4. App stores tokens in gmail_sync_state table (encrypted)
5. Create user_profile record on first login

**Required OAuth Scopes:**
- `https://www.googleapis.com/auth/gmail.readonly`
- `https://www.googleapis.com/auth/gmail.labels`
- `https://www.googleapis.com/auth/drive.readonly`

---

### 2. Dashboard Home Page

**Layout:**

**Top Row - Summary Cards:**
| Card | Metric | Calculation |
|------|--------|-------------|
| Total Applications | Count | `COUNT(*) FROM applications` |
| Response Rate | Percentage | `(recruiter_screen + hiring_manager + interviews + offer) / total * 100` |
| Active Pipeline | Count | `COUNT(*) WHERE status NOT IN ('rejected', 'withdrawn')` |
| Interviews Active | Count | `COUNT(*) WHERE status = 'interviews'` |
| Days to Deadline | Number | `Feb 1, 2026 - today` |
| Pending Follow-ups | Count | Networking contacts where `next_follow_up_date <= today` |

**Main Content:**

**Left Column (60%):**
- Application Funnel visualization (horizontal bar chart)
- Recent Activity feed (last 10 status changes)
- Applications needing attention (high fit score + stale status)

**Right Column (40%):**
- AI Insights Panel (latest 3 insights, expandable)
- Quick Actions: Add Application, Sync Gmail, Generate Insights
- Upcoming follow-ups from networking contacts

---

### 3. Applications Table View

**Columns (sortable):**
- Company Name
- Job Title
- Status (with color-coded badge)
- Application Date
- Salary Range (formatted as "$XXXk - $XXXk")
- Fit Score (with color: green >80, yellow 60-80, red <60)
- Days Since Applied
- Last Updated
- Actions (View, Edit, Delete)

**Filters:**
- Status: Multi-select dropdown (all statuses)
- Industry: Multi-select dropdown (populated from data)
- Company Size: Multi-select dropdown
- Company Type: Multi-select (public, private, startup, nonprofit)
- Fit Score Range: Slider (0-100)
- Date Range: Date picker (from/to)
- Has Referral: Yes/No toggle
- Salary Minimum: Number input

**Search:**
- Full-text search across company_name, job_title, notes

**Bulk Actions:**
- Update Status (select multiple, apply new status)
- Re-score Fit (trigger AI re-evaluation)
- Export Selected (CSV)
- Delete Selected

---

### 4. Application Detail View

**Modal or Drawer with tabs:**

**Tab 1: Overview**
- Company name + summary (2 sentences)
- Job title
- Status dropdown (change triggers history log)
- Fit Score badge + "Re-score" button
- Fit Analysis (expandable text)
- Salary range
- Location
- Application date
- Link to Google Drive JD file (opens new tab)

**Tab 2: Company Info**
- Company size
- Annual revenue
- Industry
- Company type
- Stock ticker + current price (if public)
- "Research Company" button (opens Google search)

**Tab 3: Contacts & Referrals**
- Contact name, email, LinkedIn
- Referral source
- Linked networking contact (if any)

**Tab 4: Notes**
- Rich text editor for notes
- Auto-save on blur

**Tab 5: History**
- Timeline of all status changes
- Each entry shows: previous status → new status, date, source (manual/gmail/import)

**Tab 6: Job Description**
- Full JD text (stored in job_description_text)
- "View Original" link to Google Drive

---

### 5. Add/Edit Application Form

**Fields:**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Company Name | Text | Yes | Min 2 chars |
| Job Title | Text | Yes | Min 2 chars |
| Application Date | Date | Yes | Not future |
| Status | Dropdown | Yes | From enum |
| Salary Min | Number | No | >= 0 |
| Salary Max | Number | No | >= salary_min |
| Location | Text | No | - |
| Company Size | Dropdown | No | From enum |
| Annual Revenue | Text | No | - |
| Industry | Text/Autocomplete | No | Suggest from existing |
| Company Type | Dropdown | No | From enum |
| Stock Ticker | Text | No | Auto-fetch price on blur |
| Contact Name | Text | No | - |
| Contact Email | Email | No | Valid email format |
| Contact LinkedIn | URL | No | Valid URL |
| Referral Source | Text | No | - |
| Notes | Textarea | No | - |
| Google Drive URL | URL | No | Extract file ID |
| Job Description | Textarea | No | Paste JD text |

**On Save:**
1. Validate all fields
2. If stock_ticker provided, fetch current price
3. Save to database
4. If job_description_text provided, trigger AI fit scoring (async)
5. Log to status_history with source='manual'
6. Show success toast
7. Close form and refresh table

---

### 6. Bulk Import from Google Drive

**UI Flow:**

**Step 1: Connect**
- Button: "Import from Google Drive"
- If not connected, trigger Google OAuth
- Show connected Google account email

**Step 2: Select Files**
- Fetch file list from folder: `15Tr9_d19ryo0unmno6dKxEDy5fEVuQ6p`
- Display as checklist with file names
- Show file type icons (PDF, DOCX, Google Doc)
- "Select All" / "Deselect All" buttons
- Show count: "X files selected"

**Step 3: Import**
- Button: "Import Selected Files"
- Progress bar with percentage
- Current file being processed
- Running totals: "Imported: X | Skipped: Y | Errors: Z"

**Step 4: Summary**
- Total imported
- Skipped (duplicates) with list
- Errors with file names and reasons
- "View Imported Applications" button

**Claude Parsing Prompt:**

```
You are parsing a job description document to extract structured data. Return ONLY valid JSON with no additional text.

Extract the following information:

{
  "company_name": "string - the company name",
  "company_summary": "string - exactly 2 sentences describing what the company does and their market position",
  "job_title": "string - the exact job title",
  "salary_min": "number or null - minimum salary as integer (e.g., 300000 for $300K)",
  "salary_max": "number or null - maximum salary as integer",
  "location": "string or null - job location",
  "company_size": "string or null - one of: '1-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10000+'",
  "annual_revenue": "string or null - e.g., '$1.2B' or '$500M'",
  "industry": "string - primary industry",
  "company_type": "string - one of: 'public', 'private', 'startup', 'nonprofit'",
  "stock_ticker": "string or null - stock symbol if public company"
}

Rules:
- If a field cannot be determined from the document, use null
- For salary, convert ranges like "$300,000 - $400,000" or "300K-400K" to integers (300000, 400000)
- For company_type: mentions of stock ticker or "NYSE/NASDAQ" = public; Series A/B/C funding = startup; otherwise infer from context
- For company_size: infer from headcount mentions, "Fortune 500" = 10000+, "startup" without size = 1-50

Job Description Document:
---
{document_text}
---
```

---

### 7. Gmail Auto-Sync

**Architecture:**
- Supabase Edge Function triggered every 15 minutes via pg_cron
- Incremental sync using Gmail History API
- No manual work required - fully automatic

**Sync Process:**
1. Get stored tokens and last history ID
2. Refresh access token if needed
3. Fetch history since last sync (filtered to JH25 labels)
4. Process each message:
   - Map label to status
   - Extract company info from email
   - Find matching application (fuzzy match on company name)
   - Update application status OR add to unmatched queue
5. Update sync state with new history ID

**Unmatched Emails View:**
- Table showing emails that couldn't be auto-matched
- Columns: Subject, Sender, Date, Suggested Status, Actions
- Actions per row:
  - "Match to Application" dropdown (search existing applications)
  - "Create New Application" button (pre-fills company from email)
  - "Ignore" button (marks as ignored)

---

### 8. AI Fit Assessment

**Trigger Points:**
- On application create (manual or import)
- On "Re-score" button click
- Bulk re-score from applications table

**Claude Prompt:**

```
You are evaluating job fit for a senior executive candidate. Return ONLY valid JSON.

CANDIDATE PROFILE:
- Current Role: Global Head of Go-To-Market & Sales Enablement at Amazon Ads
- Experience: 20+ years across Amazon Ads, Heineken, Citi, L'Oréal
- Expertise: Revenue Operations, GTM Strategy, Sales Enablement, Platform Consolidation, AI-enabled GTM transformation
- Key Achievements:
  * 91% adoption rate for sales tools across 3.3K global users
  * $683M revenue attribution through automated insights
  * Sunset 23 legacy tools through platform consolidation
  * Cross-functional leadership across 6 international Ad Sales organizations
- Target: SVP/C-Suite roles, $800K+ total compensation
- Location: NYC-based

CANDIDATE RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description_text}

Evaluate fit and return:
{
  "fit_score": <number 0-100>,
  "strengths": [
    "<specific reason this role matches candidate's experience>",
    "<another strength>",
    "<third strength>"
  ],
  "gaps": [
    "<potential concern or missing qualification>",
    "<another gap if applicable>"
  ],
  "recommendation": "<one of: 'pursue aggressively', 'strong fit', 'worth pursuing', 'proceed with caution', 'likely not a fit'>",
  "talking_points": [
    "<specific achievement from resume to highlight for THIS role>",
    "<another relevant talking point>",
    "<third talking point>"
  ],
  "interview_questions_to_prepare": [
    "<likely question based on gaps>",
    "<another question>"
  ]
}

Scoring Guidelines:
- 90-100: Perfect match, pursue immediately
- 80-89: Strong fit, high priority
- 70-79: Good fit, worth pursuing
- 60-69: Moderate fit, proceed with caution
- Below 60: Significant gaps, likely not a fit
```

---

### 9. Networking Contacts Tab

**Table Columns:**
- Name
- Company
- Title
- Relationship Strength (color-coded: advocate=green, strong=blue, warm=yellow, cold=gray)
- Last Contact Date
- Next Follow-up (highlighted red if overdue)
- Referral Status (badge)
- Linked Application (if any)
- Actions (View, Edit, Delete)

**Filters:**
- Relationship Strength: Multi-select
- Referral Status: Multi-select
- Company: Search/autocomplete
- Has Linked Application: Yes/No
- Follow-up Due: Overdue / This Week / This Month

---

### 10. Analytics Dashboard

**Summary Metrics Row:**

| Metric | Calculation |
|--------|-------------|
| Total Applications | COUNT(*) |
| Response Rate | (status != 'applied' AND status != 'rejected') / total * 100 |
| Interview Rate | (interviews + hiring_manager + offer) / total * 100 |
| Offer Rate | offer / total * 100 |
| Avg Days to First Response | AVG(first_status_change_date - application_date) |
| Pipeline Value | SUM(salary_max) WHERE status IN ('interviews', 'hiring_manager', 'offer') |

**Charts:**
1. Application Funnel (Horizontal Bar) - Show conversion % between stages
2. Applications Over Time (Line Chart)
3. Status Distribution (Donut Chart)
4. Response Time Distribution (Histogram)
5. Source Comparison (Bar Chart) - Cold Apply vs Referral
6. Industry Breakdown (Horizontal Bar)
7. Company Size Breakdown (Horizontal Bar)
8. Salary Distribution (Histogram) - with $800K target line
9. Fit Score Distribution (Histogram)
10. Weekly Activity (Stacked Bar)
11. Networking ROI (Comparison Cards)

---

### 11. AI Strategy Advisor

**Trigger Points:**
- Automatic: Weekly (Sunday 11pm)
- Automatic: After bulk import completes
- Manual: "Generate Insights" button

**Output Structure (JSONB stored in ai_insights.content):**
```json
{
  "executive_summary": "2-3 sentences on search health",
  "pipeline_health": {
    "status": "healthy | at_risk | critical",
    "explanation": "why this assessment",
    "probability_of_feb_offer": "percentage",
    "applications_needed_per_week": 5
  },
  "whats_working": ["pattern 1", "pattern 2"],
  "whats_not_working": ["pattern 1", "pattern 2"],
  "immediate_actions": [
    {
      "action": "specific action",
      "rationale": "why",
      "priority": "critical | high | medium",
      "effort": "15min | 1hour | half-day | ongoing"
    }
  ],
  "follow_up_priorities": [
    {
      "company": "Company Name",
      "current_status": "status",
      "days_since_update": 14,
      "recommended_action": "action",
      "urgency": "immediate | this_week | next_week"
    }
  ],
  "networking_actions": [
    {
      "contact_name": "Name",
      "action": "specific ask",
      "reason": "why now"
    }
  ],
  "companies_to_target": [
    {
      "company": "Company Name",
      "why_good_fit": "reason",
      "likely_roles": ["Role 1", "Role 2"],
      "approach": "how to apply"
    }
  ],
  "weekly_targets": {
    "new_applications": 10,
    "follow_ups": 5,
    "networking_conversations": 3
  },
  "risk_alerts": [
    {
      "risk": "specific concern",
      "mitigation": "what to do"
    }
  ]
}
```

---

### 12. Settings Page

**Sections:**

**Profile**
- Full name
- Resume text (large textarea)
- Target salary range
- Target industries (multi-select)
- Target company sizes (multi-select)
- LinkedIn URL

**Integrations**
- Google Account: Show connected email, "Reconnect" button
- Gmail Sync: Status, Last sync time, "Sync Now" button, "Pause Sync" toggle
- Google Drive: Connected folder ID, "Change Folder" button

**Data Management**
- "Export All Applications (CSV)" button
- "Export All Applications (JSON)" button
- "Export Networking Contacts (CSV)" button
- "Delete All Data" with confirmation

---

## File Structure

```
job-search-tracker/
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── functions/
│       ├── gmail-sync/
│       │   └── index.ts
│       ├── parse-jd/
│       │   └── index.ts
│       ├── score-fit/
│       │   └── index.ts
│       └── generate-insights/
│           └── index.ts
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── index.ts
│   │   └── layout/
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       └── Layout.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── AuthCallback.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Applications.tsx
│   │   ├── Networking.tsx
│   │   ├── Analytics.tsx
│   │   ├── Insights.tsx
│   │   └── Settings.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── lib/
│   │   └── supabase.ts
│   ├── App.tsx
│   ├── Router.tsx
│   ├── main.tsx
│   ├── index.css
│   └── vite-env.d.ts
├── .env.local
├── .env.example
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tailwind.config.js
├── postcss.config.js
└── vite.config.ts
```

---

## Google Cloud Console Setup

### Step 1: Create Project
1. Go to https://console.cloud.google.com/
2. Create new project: "Job Search Tracker"
3. Enable APIs:
   - Gmail API
   - Google Drive API

### Step 2: OAuth Consent Screen
1. Go to APIs & Services → OAuth consent screen
2. Select "External" user type
3. Fill in:
   - App name: Job Search Tracker
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.labels`
   - `https://www.googleapis.com/auth/drive.readonly`
5. Add test users (your email)

### Step 3: Create OAuth Credentials
1. Go to APIs & Services → Credentials
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: Web application
4. Name: "Job Search Tracker Web"
5. Authorized JavaScript origins:
   - `http://localhost:5173`
   - `https://alcnbrdpzyspeqvvsjzu.supabase.co`
6. Authorized redirect URIs:
   - `http://localhost:5173/auth/callback`
   - `https://alcnbrdpzyspeqvvsjzu.supabase.co/auth/v1/callback`
7. Copy Client ID and Client Secret

### Step 4: Configure Supabase
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Paste Client ID and Client Secret
4. Save

---

## Environment Variables

### .env.local
```bash
VITE_SUPABASE_URL=https://alcnbrdpzyspeqvvsjzu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFsY25icmRwenlzcGVxdnZzanp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2ODExNjksImV4cCI6MjA4MDI1NzE2OX0.oI5tsvwopz_4-umWsXtVG4cC9dYoehdrmmf2b02oa4g
VITE_APP_URL=http://localhost:5173
```

### Supabase Secrets (for Edge Functions)
```bash
supabase secrets set GOOGLE_CLIENT_ID=xxx
supabase secrets set GOOGLE_CLIENT_SECRET=xxx
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-ki9...cQAA
```

---

## Implementation Order (3-Day Sprint)

### Day 1: Foundation (Monday Dec 2) ✅ COMPLETED

**Morning:**
1. ✅ Initialize repo with Vite + React + TypeScript
2. ✅ Set up Tailwind CSS
3. ✅ Create Supabase project
4. ✅ Write database migration file
5. ✅ Configure environment variables

**Afternoon:**
6. ✅ Build authentication flow (Login page, AuthContext, AuthCallback)
7. ✅ Create Layout components (Sidebar with deadline countdown, Header)
8. ✅ Build routing (React Router with protected routes)
9. ✅ Create UI component library (Button, Card, Badge, Input, Select, Modal)
10. ✅ Build Dashboard page with stats cards
11. ✅ Build Applications page with table, filters, add form
12. ✅ Create Networking, Analytics, Insights, Settings pages (placeholder UI)
13. ✅ Verify build successful

**Deliverable:** `job-search-tracker.zip` ready for download

### Day 2: Integrations (Tuesday Dec 3)

**Morning (4 hours):**
1. Run database migration in Supabase SQL Editor
2. Set up Google OAuth in Google Cloud Console
3. Configure Google provider in Supabase Auth
4. Test authentication flow end-to-end
5. Build Google Drive integration (list files from folder)
6. Create bulk import UI (file selection, progress)

**Afternoon (4 hours):**
7. Create parse-jd Edge Function (Claude API)
8. Implement import flow (download → parse → save)
9. Create score-fit Edge Function
10. Test: Import 10 files successfully with fit scoring
11. Build Gmail OAuth token storage
12. Create gmail-sync Edge Function

### Day 3: Intelligence (Wednesday Dec 4)

**Morning (4 hours):**
1. Implement Gmail label-to-status mapping
2. Implement company matching logic (fuzzy match)
3. Create unmatched emails view and resolution UI
4. Complete networking contacts page with full CRUD

**Afternoon (4 hours):**
5. Build full analytics dashboard (all charts)
6. Create generate-insights Edge Function
7. Build AI Insights page with all components
8. Deploy to Vercel production
9. Set up Gmail sync cron job

### Buffer Day (Thursday Dec 5)

- Fix bugs discovered in testing
- Polish UI/UX
- Add loading states and error handling
- Run bulk import of all 130 files
- End-to-end testing
- Create backup export

---

## Success Criteria Checklist

### Must Have (Launch Blockers)
- [ ] Can login with Google OAuth
- [ ] Can view all applications in table with sort/filter
- [ ] Can manually add/edit/delete applications
- [ ] Can bulk import from Google Drive (130 files)
- [ ] JDs are parsed and structured data extracted
- [ ] Gmail auto-syncs and updates statuses
- [ ] Can view networking contacts
- [ ] Dashboard shows summary metrics
- [ ] Analytics charts display correctly
- [ ] AI fit scores generated for applications
- [ ] AI insights generated and displayed
- [ ] Deployed to production with HTTPS
- [ ] Data secured with RLS

### Should Have (First Week)
- [ ] Mobile responsive design
- [ ] Unmatched email resolution UI
- [ ] Export to CSV functionality
- [ ] Company research links
- [ ] Stock price auto-fetch

### Nice to Have (Future)
- [ ] Email notifications
- [ ] Calendar integration for interviews
- [ ] Document generation (cover letters)
- [ ] LinkedIn integration

---

## Estimated API Costs

| Service | Usage | Cost |
|---------|-------|------|
| Claude API (bulk import) | 130 files × ~3K tokens | ~$2-3 |
| Claude API (fit scoring) | 130 applications × ~2K tokens | ~$2-3 |
| Claude API (weekly insights) | 1 call/week × ~5K tokens | ~$0.10/week |
| Supabase | Free tier | $0 |
| Vercel | Free tier | $0 |
| Google APIs | Free tier | $0 |
| **Total Initial** | | **~$5-7** |
| **Total Monthly** | | **~$1-2** |

**Anthropic API:** $30 credits available (sk-ant-api03-ki9...cQAA)

---

## Quick Start Commands

```bash
# Clone and setup
cd ~/Projects
unzip job-search-tracker.zip
cd job-search-tracker
npm install

# Local development
npm run dev
# Opens http://localhost:5173

# Build for production
npm run build

# Deploy to Vercel
vercel
vercel --prod
```

---

## Support

If you encounter issues:

1. **Authentication errors**: Check Google OAuth credentials and redirect URIs
2. **Gmail sync not working**: Verify tokens stored, check Edge Function logs
3. **Claude API errors**: Verify API key, check rate limits
4. **Import failures**: Check file permissions in Google Drive

For debugging:
- Supabase Dashboard → Logs → Edge Functions
- Vercel Dashboard → Deployments → Functions → Logs
- Browser DevTools → Network tab for API calls

---

*Document Version: 2.0*
*Created: December 2, 2025*
*Updated: December 2, 2025 (renamed from career-tracker to job-search-tracker)*
*Target Completion: December 5, 2025*
