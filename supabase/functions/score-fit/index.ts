import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ScoreRequest {
  applicationId: string
  jobDescriptionText: string
  resumeText?: string
}

// Sanitize text to remove problematic Unicode characters
function sanitizeText(text: string): string {
  if (!text) return text;
  return text
    .replace(/\u0000/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Remove control characters except \n and \r
    .trim();
}

// Recursively sanitize all string values in an object
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return sanitizeText(obj);
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
    return sanitized;
  }
  return obj;
}

const DEFAULT_RESUME = `CALIXTO PEREZ GALAN
Global Head of Go-To-Market & Sales Enablement at Amazon Ads

EXPERIENCE:
- 20+ years across Amazon Ads, Heineken, Citi, L'Oréal
- Expertise: Revenue Operations, GTM Strategy, Sales Enablement, Platform Consolidation, AI-enabled GTM transformation

KEY ACHIEVEMENTS:
- 91% adoption rate for sales tools across 3.3K global users
- $683M revenue attribution through automated insights
- Sunset 23 legacy tools through platform consolidation
- Cross-functional leadership across 6 international Ad Sales organizations

TARGET:
- SVP/C-Suite roles, $800K+ total compensation
- Location: NYC-based`

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

    const { applicationId, jobDescriptionText, resumeText }: ScoreRequest = await req.json()

    if (!applicationId || !jobDescriptionText) {
      return new Response(
        JSON.stringify({ error: 'applicationId and jobDescriptionText are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const candidateResume = resumeText || DEFAULT_RESUME

    // Call Claude API to score the fit
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: `You are evaluating job fit for a senior executive candidate. Return ONLY valid JSON.

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
${candidateResume}

JOB DESCRIPTION:
${jobDescriptionText}

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
- Below 60: Significant gaps, likely not a fit`,
          },
        ],
      }),
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('Claude API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to score fit', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const claudeData = await claudeResponse.json()
    let content = claudeData.content[0].text

    // Sanitize the Claude response before parsing
    content = sanitizeText(content)

    // Parse the JSON response from Claude
    let fitAnalysis
    try {
      fitAnalysis = JSON.parse(content)
    } catch (e) {
      console.error('Failed to parse Claude response as JSON:', content)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON response from AI', rawResponse: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize all string fields in the fit analysis
    fitAnalysis = sanitizeObject(fitAnalysis)

    // Update the application with fit score and analysis
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        fit_score: fitAnalysis.fit_score,
        fit_analysis: fitAnalysis,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)

    if (updateError) {
      console.error('Failed to update application:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update application', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        applicationId,
        fitScore: fitAnalysis.fit_score,
        fitAnalysis,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in score-fit function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
