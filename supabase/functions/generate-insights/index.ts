import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TARGET_DEADLINE = new Date('2026-02-01')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    // Get JWT token from header
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch all applications for the user
    const { data: applications, error: appsError } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      .order('application_date', { ascending: false })

    if (appsError) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch applications', details: appsError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch status history
    const { data: statusHistory, error: historyError } = await supabase
      .from('application_status_history')
      .select('*')
      .eq('user_id', user.id)
      .order('changed_at', { ascending: false })
      .limit(100)

    if (historyError) {
      console.error('Failed to fetch status history:', historyError)
    }

    // Fetch networking contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('networking_contacts')
      .select('*')
      .eq('user_id', user.id)

    if (contactsError) {
      console.error('Failed to fetch contacts:', contactsError)
    }

    // Calculate key metrics
    const totalApps = applications?.length || 0
    const statusCounts = applications?.reduce((acc: any, app: any) => {
      acc[app.status] = (acc[app.status] || 0) + 1
      return acc
    }, {})

    const responseRate = totalApps > 0
      ? ((statusCounts?.recruiter_screen || 0) + (statusCounts?.hiring_manager || 0) +
         (statusCounts?.interviews || 0) + (statusCounts?.offer || 0)) / totalApps * 100
      : 0

    const interviewRate = totalApps > 0
      ? ((statusCounts?.interviews || 0) + (statusCounts?.hiring_manager || 0) + (statusCounts?.offer || 0)) / totalApps * 100
      : 0

    const now = new Date()
    const daysToDeadline = Math.ceil((TARGET_DEADLINE.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    const weeksRemaining = Math.ceil(daysToDeadline / 7)

    // Calculate average days to response
    const responseTimes = statusHistory
      ?.filter((h: any) => h.previous_status === 'applied')
      .map((h: any) => {
        const app = applications?.find((a: any) => a.id === h.application_id)
        if (!app) return null
        const appDate = new Date(app.application_date)
        const responseDate = new Date(h.changed_at)
        return Math.ceil((responseDate.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24))
      })
      .filter((days: number | null) => days !== null && days > 0) || []

    const avgDaysToResponse = responseTimes.length > 0
      ? responseTimes.reduce((a: number, b: number) => a + b, 0) / responseTimes.length
      : null

    // Find stale applications (no updates in 14+ days)
    const staleApps = applications?.filter((app: any) => {
      if (app.status === 'rejected' || app.status === 'withdrawn' || app.status === 'offer') {
        return false
      }
      const lastUpdate = new Date(app.status_updated_at || app.updated_at)
      const daysSinceUpdate = Math.ceil((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
      return daysSinceUpdate >= 14
    })

    // Build data summary for Claude
    const dataSummary = {
      total_applications: totalApps,
      status_breakdown: statusCounts,
      response_rate: Math.round(responseRate * 10) / 10,
      interview_rate: Math.round(interviewRate * 10) / 10,
      days_to_deadline: daysToDeadline,
      weeks_remaining: weeksRemaining,
      avg_days_to_response: avgDaysToResponse ? Math.round(avgDaysToResponse) : null,
      stale_applications: staleApps?.length || 0,
      top_stale_apps: staleApps?.slice(0, 5).map((app: any) => ({
        company: app.company_name,
        title: app.job_title,
        status: app.status,
        fit_score: app.fit_score,
        days_since_update: Math.ceil((now.getTime() - new Date(app.status_updated_at || app.updated_at).getTime()) / (1000 * 60 * 60 * 24)),
      })),
      high_fit_active: applications?.filter((app: any) =>
        app.fit_score >= 80 &&
        !['rejected', 'withdrawn', 'offer'].includes(app.status)
      ).length || 0,
      networking_contacts: contacts?.length || 0,
      overdue_followups: contacts?.filter((c: any) =>
        c.next_follow_up_date && new Date(c.next_follow_up_date) < now
      ).length || 0,
    }

    // Call Claude API to generate insights
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `You are a senior executive career advisor analyzing a job search campaign. The candidate is targeting $800K+ roles with a hard deadline of Feb 1, 2026 for securing an offer.

CURRENT DATA:
${JSON.stringify(dataSummary, null, 2)}

CONTEXT:
- Candidate is a Global Head level executive with 20+ years experience
- Target: VP/SVP/C-Suite roles at large tech companies, $800K+ total comp
- Deadline pressure: ${daysToDeadline} days (${weeksRemaining} weeks) until Feb 1, 2026 target offer date
- Current role ends Jan 26, 2026

Generate strategic insights and return ONLY valid JSON:

{
  "executive_summary": "2-3 sentences on search health and urgency",
  "pipeline_health": {
    "status": "healthy | at_risk | critical",
    "explanation": "why this assessment",
    "probability_of_feb_offer": "percentage as string (e.g., '65%')",
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
      "contact_name": "Name (if known) or general guidance",
      "action": "specific ask",
      "reason": "why now"
    }
  ],
  "companies_to_target": [
    {
      "company": "Company Name or type",
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

Be direct, actionable, and data-driven. This is an executive who needs strategic guidance, not platitudes.`,
          },
        ],
      }),
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('Claude API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to generate insights', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const claudeData = await claudeResponse.json()
    const content = claudeData.content[0].text

    // Parse the JSON response from Claude
    let insights
    try {
      insights = JSON.parse(content)
    } catch (e) {
      console.error('Failed to parse Claude response as JSON:', content)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON response from AI', rawResponse: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Store insights in database
    const { data: savedInsight, error: saveError } = await supabase
      .from('ai_insights')
      .insert({
        user_id: user.id,
        insight_type: 'weekly_strategy',
        title: 'Weekly Job Search Strategy Update',
        content: insights,
        generated_at: new Date().toISOString(),
        is_read: false,
        is_actionable: true,
        is_dismissed: false,
        action_taken: false,
      })
      .select()
      .single()

    if (saveError) {
      console.error('Failed to save insights:', saveError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        insights,
        metrics: dataSummary,
        insightId: savedInsight?.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in generate-insights function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
