-- Job Search Tracker Database Schema
-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'recruiter_screen', 'hiring_manager', 'interviews', 'offer', 'rejected', 'withdrawn', 'follow_up')),
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  salary_min INTEGER,
  salary_max INTEGER,
  location TEXT,
  company_size TEXT,
  industry TEXT,
  company_type TEXT,
  stock_ticker TEXT,
  contact_name TEXT,
  contact_email TEXT,
  contact_linkedin TEXT,
  referral_source TEXT,
  fit_score INTEGER CHECK (fit_score >= 0 AND fit_score <= 100),
  fit_analysis JSONB,
  google_drive_file_id TEXT,
  job_description_text TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_date ON applications(application_date DESC);

-- Status history
CREATE TABLE IF NOT EXISTS application_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Networking contacts
CREATE TABLE IF NOT EXISTS networking_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  relationship_strength TEXT DEFAULT 'warm',
  referral_status TEXT DEFAULT 'none',
  last_contact_date DATE,
  next_follow_up_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Gmail sync state
CREATE TABLE IF NOT EXISTS gmail_sync_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expiry TIMESTAMPTZ,
  last_history_id TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI insights
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  content JSONB NOT NULL,
  is_actionable BOOLEAN DEFAULT true,
  is_dismissed BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User profile
CREATE TABLE IF NOT EXISTS user_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_text TEXT,
  current_title TEXT,
  current_company TEXT,
  years_experience INTEGER,
  key_skills TEXT[],
  target_salary_min INTEGER DEFAULT 800000,
  target_salary_max INTEGER,
  target_industries TEXT[],
  target_roles TEXT[],
  target_locations TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE networking_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own applications" ON applications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own status history" ON application_status_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own contacts" ON networking_contacts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own gmail state" ON gmail_sync_state FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own insights" ON ai_insights FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own profile" ON user_profile FOR ALL USING (auth.uid() = user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON networking_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_gmail_state_updated_at BEFORE UPDATE ON gmail_sync_state FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_user_profile_updated_at BEFORE UPDATE ON user_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at();

SELECT 'Database schema created!' as status;
