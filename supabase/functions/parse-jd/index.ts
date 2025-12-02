import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import mammoth from 'npm:mammoth@1.6.0'

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ParseRequest {
  documentText: string
  fileId?: string
  fileName?: string
  isDocx?: boolean
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

const extractionPrompt = `You are parsing a job description document to extract structured data.

IMPORTANT INSTRUCTIONS:
1. First, read the job description and extract: company name, job title, salary, location from the document
2. For company information (size, revenue, industry, type, stock ticker), use your knowledge base and training data
3. If you recognize the company, provide accurate details; if uncertain, use null
4. Return ONLY valid JSON with no additional text

Extract the following information:

{
  "company_name": "string - the actual company name from the job posting",
  "company_summary": "string - 2 sentences from web search describing what the company does",
  "job_title": "string - the exact job title from the posting",
  "salary_min": "number or null - minimum salary from posting as integer (e.g., 300000)",
  "salary_max": "number or null - maximum salary from posting as integer",
  "location": "string or null - job location from posting",
  "company_size": "string or null - from web search, one of: '1-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10000+'",
  "annual_revenue": "string or null - from web search, e.g., '$1.2B' or '$500M'",
  "industry": "string - from web search, primary industry",
  "company_type": "string - from web search, one of: 'public', 'private', 'startup', 'nonprofit'",
  "stock_ticker": "string or null - from web search if public company"
}

Rules:
- Extract company name, job title, salary, location directly from the document text
- For company enrichment fields (company_summary, company_size, annual_revenue, industry, company_type, stock_ticker), use your training data knowledge
- For salary, convert ranges like "$300,000 - $400,000" to integers (300000, 400000)
- If you don't have information about a company field, use null
- Be accurate - only provide information you're confident about`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { documentText, fileId, fileName, isDocx }: ParseRequest = await req.json()

    if (!documentText) {
      return new Response(
        JSON.stringify({ error: 'documentText is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let extractedText = documentText

    // If it's a .docx file (base64), extract text using mammoth
    if (isDocx) {
      try {
        // Convert base64 to buffer
        const binaryString = atob(documentText)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }

        // Extract text from .docx
        const result = await mammoth.extractRawText({ buffer: bytes.buffer })
        extractedText = result.value
        console.log('Extracted text from .docx:', extractedText.substring(0, 200))
      } catch (docxError) {
        console.error('Error extracting text from .docx:', docxError)
        return new Response(
          JSON.stringify({ error: 'Failed to extract text from .docx file', details: docxError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Prepare message content for Claude
    const messageContent = `${extractionPrompt}

Job Description Document:
---
${extractedText}
---`

    // Call Claude API with extended thinking for web search
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096, // Haiku max output tokens
        messages: [
          {
            role: 'user',
            content: messageContent,
          },
        ],
      }),
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      console.error('Claude API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to parse job description', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const claudeData = await claudeResponse.json()
    console.log('Claude response structure:', JSON.stringify(claudeData, null, 2).substring(0, 500))

    // Find the text content block (not thinking blocks)
    const textBlock = claudeData.content.find((block: any) => block.type === 'text')
    if (!textBlock) {
      console.error('No text content in Claude response:', JSON.stringify(claudeData))
      return new Response(
        JSON.stringify({ error: 'No text content in AI response', claudeResponse: claudeData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let content = textBlock.text
    console.log('Raw Claude response text:', content.substring(0, 300))

    // Sanitize the Claude response before parsing
    content = sanitizeText(content)

    // Parse the JSON response from Claude
    let parsedData
    try {
      parsedData = JSON.parse(content)
    } catch (e) {
      console.error('Failed to parse Claude response as JSON:', content)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON response from AI', rawResponse: content }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize all string fields in the parsed data
    parsedData = sanitizeObject(parsedData)

    // Add metadata
    const result = {
      ...parsedData,
      job_description_text: sanitizeText(extractedText),
      google_drive_file_id: fileId || null,
      parsed_at: new Date().toISOString(),
      source_file: fileName || null,
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in parse-jd function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
