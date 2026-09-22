import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { TranscriptRepository } from '../database/repositories/transcripts.js'
import type { AnalysisResult, ActionItem, Topic } from '../../types/index.js'
import { randomUUID } from 'crypto'
import Store from 'electron-store'
import * as https from 'https'
import * as http from 'http'

const store = new Store()

const ANALYSIS_PROMPT = (transcript: string) => `Analyze the following meeting transcript and provide:
1. A concise summary (2-3 sentences)
2. Key points discussed (3-5 bullet points)
3. Action items with priority levels (if any)
4. Main topics covered

Transcript:
${transcript}

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "summary": "...",
  "keyPoints": ["...", "..."],
  "actionItems": [{"text": "...", "priority": "high|medium|low"}],
  "topics": [{"name": "...", "relevance": 0.0}]
}`

function parseResult(meetingId: string, raw: string): AnalysisResult {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('Could not parse AI response as JSON')
  const parsed = JSON.parse(match[0])
  return {
    id: randomUUID(),
    meetingId,
    summary: parsed.summary || '',
    keyPoints: parsed.keyPoints || [],
    actionItems: (parsed.actionItems || []).map((item: any) => ({
      text: item.text,
      priority: item.priority || 'medium',
    })),
    topics: (parsed.topics || []).map((t: any) => ({
      name: t.name,
      segments: [],
      relevance: t.relevance ?? 0.5,
    })),
    createdAt: new Date(),
  }
}

// ── Provider implementations ──────────────────────────────────────────────────

async function analyzeWithAnthropic(meetingId: string, transcript: string): Promise<AnalysisResult> {
  const apiKey = store.get('anthropicApiKey', '') as string
  if (!apiKey) throw new Error('Anthropic API key not set. Go to Settings → API Keys.')
  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    messages: [{ role: 'user', content: ANALYSIS_PROMPT(transcript) }],
  })
  const content = response.content[0]
  if (content.type !== 'text') throw new Error('Unexpected response from Claude')
  return parseResult(meetingId, content.text)
}

async function analyzeWithOpenAI(meetingId: string, transcript: string): Promise<AnalysisResult> {
  const apiKey = store.get('openaiApiKey', '') as string
  if (!apiKey) throw new Error('OpenAI API key not set. Go to Settings → API Keys.')
  const client = new OpenAI({ apiKey })
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_tokens: 2048,
    messages: [{ role: 'user', content: ANALYSIS_PROMPT(transcript) }],
  })
  const text = response.choices[0]?.message?.content || ''
  return parseResult(meetingId, text)
}

async function analyzeWithOllama(meetingId: string, transcript: string): Promise<AnalysisResult> {
  const baseUrl = (store.get('ollamaUrl', 'http://localhost:11434') as string).replace(/\/$/, '')
  const model = store.get('ollamaModel', '') as string
  if (!model) throw new Error('No Ollama model selected. Go to Settings → AI Providers → Ollama and pick a model.')

  const body = JSON.stringify({
    model,
    prompt: ANALYSIS_PROMPT(transcript),
    stream: false,
  })

  const text = await new Promise<string>((resolve, reject) => {
    const url = new URL(`${baseUrl}/api/generate`)
    const lib = url.protocol === 'https:' ? https : http
    const req = lib.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 11434),
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 30000,
    }, (res: any) => {
      let data = ''
      res.on('data', (chunk: any) => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve(json.response || '')
        } catch {
          reject(new Error(`Ollama returned invalid JSON: ${data.slice(0, 200)}`))
        }
      })
    })
    req.on('error', (e: Error) => reject(new Error(`Cannot connect to Ollama at ${baseUrl}: ${e.message}`)))
    req.on('timeout', () => { req.destroy(); reject(new Error('Ollama request timed out after 30s')) })
    req.write(body)
    req.end()
  })

  return parseResult(meetingId, text)
}

// ── Main service ──────────────────────────────────────────────────────────────

export class AIAnalysisService {
  private transcriptRepo = new TranscriptRepository()

  async analyzeMeeting(meetingId: string): Promise<AnalysisResult> {
    const segments = this.transcriptRepo.getByMeetingId(meetingId)
    if (segments.length === 0) throw new Error('No transcript segments found for this meeting')

    const transcript = segments.map(s => s.text).join('\n')
    const provider = (store.get('analysisProvider', 'none') as string)

    console.log(`[Analysis] Using provider: ${provider}`)

    switch (provider) {
      case 'anthropic': return analyzeWithAnthropic(meetingId, transcript)
      case 'openai':    return analyzeWithOpenAI(meetingId, transcript)
      case 'ollama':    return analyzeWithOllama(meetingId, transcript)
      default:
        throw new Error(
          'No AI analysis provider selected.\n\nGo to Settings → AI Providers and choose Ollama, Claude, or GPT-4.'
        )
    }
  }
}
