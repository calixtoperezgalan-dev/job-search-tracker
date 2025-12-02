import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const GMAIL_LABEL_STATUS_MAP: Record<string, string> = {
  'JH25 - Applied': 'applied',
  'JH25 - Follow up': 'follow_up',
  'JH25 - Hiring Manager': 'hiring_manager',
  'JH25 - interviews': 'interviews',
  'JH25 - Offer': 'offer',
  'JH25 - Recruiter Screen': 'recruiter_screen',
  'JH25 - Withdraw': 'withdrawn',
  'JH25-Rejected': 'rejected',
}

const NETWORKING_LABEL = 'JH25 - Networking'

interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
  }
  internalDate: string
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresIn: number }> {
  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID')
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to refresh access token')
  }

  const data = await response.json()
  return { accessToken: data.access_token, expiresIn: data.expires_in }
}

function extractCompanyFromEmail(subject: string, senderName: string, senderEmail: string): string | null {
  // Try to extract company from sender email domain
  const domain = senderEmail.split('@')[1]
  if (domain && !domain.includes('gmail.com') && !domain.includes('yahoo.com') && !domain.includes('outlook.com')) {
    const companyName = domain.split('.')[0]
    return companyName.charAt(0).toUpperCase() + companyName.slice(1)
  }

  // Try to extract from sender name (if it's "Name @ Company")
  if (senderName.includes('@')) {
    const parts = senderName.split('@')
    if (parts.length > 1) {
      return parts[1].trim()
    }
  }

  // Try to extract from subject line
  const companyMatch = subject.match(/at\s+([A-Z][a-zA-Z0-9\s&]+)/i)
  if (companyMatch) {
    return companyMatch[1].trim()
  }

  return null
}

async function fuzzyMatchCompany(supabase: any, userId: string, companyName: string): Promise<string | null> {
  if (!companyName) return null

  // Try exact match first
  const { data: exactMatch } = await supabase
    .from('applications')
    .select('id')
    .eq('user_id', userId)
    .ilike('company_name', companyName)
    .limit(1)

  if (exactMatch && exactMatch.length > 0) {
    return exactMatch[0].id
  }

  // Try fuzzy match (contains)
  const { data: fuzzyMatch } = await supabase
    .from('applications')
    .select('id, company_name')
    .eq('user_id', userId)

  if (fuzzyMatch) {
    for (const app of fuzzyMatch) {
      const normalized1 = companyName.toLowerCase().replace(/[^a-z0-9]/g, '')
      const normalized2 = app.company_name.toLowerCase().replace(/[^a-z0-9]/g, '')

      if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
        return app.id
      }
    }
  }

  return null
}

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

    // Get sync state for user
    const { data: syncState, error: syncError } = await supabase
      .from('gmail_sync_state')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (syncError || !syncState) {
      return new Response(
        JSON.stringify({ error: 'Gmail sync not configured. Please connect your Google account.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!syncState.sync_enabled) {
      return new Response(
        JSON.stringify({ error: 'Gmail sync is disabled' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if we need to refresh the access token
    let accessToken = syncState.access_token_encrypted
    const tokenExpiry = new Date(syncState.token_expiry)
    const now = new Date()

    if (tokenExpiry < now) {
      const { accessToken: newAccessToken, expiresIn } = await refreshAccessToken(syncState.refresh_token_encrypted)
      accessToken = newAccessToken

      // Update stored tokens
      await supabase
        .from('gmail_sync_state')
        .update({
          access_token_encrypted: newAccessToken,
          token_expiry: new Date(now.getTime() + expiresIn * 1000).toISOString(),
        })
        .eq('user_id', user.id)
    }

    // Fetch messages with JH25 labels
    const labelQuery = Object.keys(GMAIL_LABEL_STATUS_MAP).join(' OR ') + ` OR ${NETWORKING_LABEL}`
    const gmailResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=label:(${encodeURIComponent(labelQuery)})&maxResults=500`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    )

    if (!gmailResponse.ok) {
      const errorText = await gmailResponse.text()
      return new Response(
        JSON.stringify({ error: 'Failed to fetch Gmail messages', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const gmailData = await gmailResponse.json()
    const messages = gmailData.messages || []

    let processed = 0
    let matched = 0
    let unmatched = 0
    let networkingContacts = 0

    // Process each message
    for (const msg of messages) {
      // Fetch full message details
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      )

      if (!msgResponse.ok) continue

      const fullMessage: GmailMessage = await msgResponse.json()
      const headers = fullMessage.payload.headers

      const subject = headers.find(h => h.name === 'Subject')?.value || ''
      const from = headers.find(h => h.name === 'From')?.value || ''
      const senderMatch = from.match(/(.+?)\s*<(.+?)>/) || [null, from, from]
      const senderName = senderMatch[1]?.trim() || ''
      const senderEmail = senderMatch[2]?.trim() || from

      // Get labels for this message
      const gmailLabelsResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/labels',
        {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        }
      )

      if (!gmailLabelsResponse.ok) continue

      const labelsData = await gmailLabelsResponse.json()
      const allLabels = labelsData.labels || []

      const messageLabels = fullMessage.labelIds
        .map(labelId => {
          const label = allLabels.find((l: any) => l.id === labelId)
          return label?.name || null
        })
        .filter(Boolean)

      // Check if it's a networking email
      if (messageLabels.includes(NETWORKING_LABEL)) {
        // TODO: Handle networking contacts
        networkingContacts++
        processed++
        continue
      }

      // Find the status label
      const statusLabel = messageLabels.find(label => label && GMAIL_LABEL_STATUS_MAP[label])
      if (!statusLabel) continue

      const newStatus = GMAIL_LABEL_STATUS_MAP[statusLabel]

      // Try to match to an application
      const companyName = extractCompanyFromEmail(subject, senderName, senderEmail)
      const applicationId = companyName ? await fuzzyMatchCompany(supabase, user.id, companyName) : null

      if (applicationId) {
        // Update application status
        const { data: currentApp } = await supabase
          .from('applications')
          .select('status')
          .eq('id', applicationId)
          .single()

        if (currentApp && currentApp.status !== newStatus) {
          // Update status
          await supabase
            .from('applications')
            .update({
              status: newStatus,
              status_updated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', applicationId)

          // Log status change
          await supabase
            .from('application_status_history')
            .insert({
              user_id: user.id,
              application_id: applicationId,
              previous_status: currentApp.status,
              new_status: newStatus,
              source: 'gmail',
              gmail_message_id: fullMessage.id,
              notes: `Auto-updated from Gmail label: ${statusLabel}`,
            })

          matched++
        }
      } else {
        // Add to unmatched emails
        await supabase
          .from('unmatched_emails')
          .insert({
            user_id: user.id,
            gmail_message_id: fullMessage.id,
            gmail_thread_id: fullMessage.threadId,
            subject,
            sender_email: senderEmail,
            sender_name: senderName,
            snippet: fullMessage.snippet,
            label_name: statusLabel,
            suggested_status: newStatus,
            received_at: new Date(parseInt(fullMessage.internalDate)).toISOString(),
          })

        unmatched++
      }

      processed++
    }

    // Update sync state
    await supabase
      .from('gmail_sync_state')
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        matched,
        unmatched,
        networkingContacts,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in gmail-sync function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
