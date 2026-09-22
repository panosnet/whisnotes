import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import * as https from 'https'
import * as http from 'http'
import Store from 'electron-store'

const store = new Store()

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', el: 'Greek', cs: 'Czech', de: 'German', fr: 'French',
  es: 'Spanish', it: 'Italian', pt: 'Portuguese', nl: 'Dutch', ru: 'Russian',
  zh: 'Chinese', ja: 'Japanese', ko: 'Korean', ar: 'Arabic', auto: 'the original language',
}

function langName(code: string): string {
  return LANGUAGE_NAMES[code] || code
}

function makePrompt(text: string, sourceLang: string, targetLang: string): string {
  const target = langName(targetLang)
  return `Translate the following text to ${target}. Output ONLY the translated text, nothing else:\n\n${text}`
}

// ── Provider implementations ──────────────────────────────────────────────────

async function translateWithOllama(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const baseUrl = (store.get('ollamaUrl', 'http://localhost:11434') as string).replace(/\/$/, '')
  const model = store.get('ollamaModel', '') as string
  if (!model) throw new Error('No Ollama model selected. Go to Settings → AI Providers → Ollama and pick a model.')

  const body = JSON.stringify({ model, prompt: makePrompt(text, sourceLang, targetLang), stream: false })

  return new Promise((resolve, reject) => {
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
      res.on('data', (c: any) => data += c)
      res.on('end', () => {
        try { resolve(JSON.parse(data).response?.trim() || text) }
        catch { reject(new Error('Ollama returned invalid response')) }
      })
    })
    req.on('error', (e: Error) => reject(new Error(`Cannot reach Ollama at ${baseUrl}: ${e.message}`)))
    req.on('timeout', () => { req.destroy(); reject(new Error('Ollama translation timed out')) })
    req.write(body)
    req.end()
  })
}

async function translateWithAnthropic(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const apiKey = store.get('anthropicApiKey', '') as string
  if (!apiKey) throw new Error('Anthropic API key not set. Go to Settings → API Keys.')
  const client = new Anthropic({ apiKey })
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',  // fast + cheap for translation
    max_tokens: 1024,
    messages: [{ role: 'user', content: makePrompt(text, sourceLang, targetLang) }],
  })
  const content = response.content[0]
  return content.type === 'text' ? content.text.trim() : text
}

async function translateWithOpenAI(text: string, sourceLang: string, targetLang: string): Promise<string> {
  const apiKey = store.get('openaiApiKey', '') as string
  if (!apiKey) throw new Error('OpenAI API key not set. Go to Settings → API Keys.')
  const client = new OpenAI({ apiKey })
  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',  // fast + cheap for translation
    messages: [{ role: 'user', content: makePrompt(text, sourceLang, targetLang) }],
    temperature: 0.2,
  })
  return response.choices[0]?.message?.content?.trim() || text
}

// ── Main service ──────────────────────────────────────────────────────────────

export class TranslationService {
  async translate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    // Use the same provider as analysis so no extra API key is needed
    const provider = store.get('analysisProvider', 'none') as string

    switch (provider) {
      case 'ollama':    return translateWithOllama(text, sourceLang, targetLang)
      case 'anthropic': return translateWithAnthropic(text, sourceLang, targetLang)
      case 'openai':    return translateWithOpenAI(text, sourceLang, targetLang)
      default:
        throw new Error(
          'No AI provider configured for translation.\n\n' +
          'Go to Settings → AI Providers and select Ollama, Claude, or GPT-4.\n' +
          'Ollama is free and runs 100% locally!'
        )
    }
  }

  async translateBatch(texts: string[], sourceLang: string, targetLang: string): Promise<string[]> {
    return Promise.all(texts.map(t => this.translate(t, sourceLang, targetLang)))
  }
}
