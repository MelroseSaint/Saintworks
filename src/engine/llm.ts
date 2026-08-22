import type { Project } from '../model/types'
import type { AIPlan } from './ai'
import { buildNode } from '../model/factories'
import { pad } from '../model/factories'
import { uid } from '../model/factories'

export interface LLMConfig {
  apiKey: string
  baseUrl: string
  model: string
}

const SYSTEM_PROMPT = `You are a website development assistant for SaintWorks, a visual web IDE.
You receive a JSON-serialized project and a natural language request.
You MUST respond with ONLY a JSON object (no markdown, no explanation) matching this schema:

{
  "summary": ["string - human-readable description of each change"],
  "ops": [
    {
      "type": "create-page" | "cinematic-hero" | "simplify-mobile-nav" | "accent-buttons" | "testimonials-section" | "fix-mobile-spacing" | "optimize-load",
      ...type-specific fields...
    }
  ],
  "conflicts": ["string - warnings about brand violations or safety concerns"]
}

Available op types:
- create-page: {"type":"create-page","name":"About","route":"/about","heading":"About Us","body":"Description text"}
- cinematic-hero: {"type":"cinematic-hero"}
- simplify-mobile-nav: {"type":"simplify-mobile-nav"}
- accent-buttons: {"type":"accent-buttons"}
- testimonials-section: {"type":"testimonials-section"}
- fix-mobile-spacing: {"type":"fix-mobile-spacing"}
- optimize-load: {"type":"optimize-load"}

Rules:
- NEVER change brand colors, tokens, or design system without explicit user request
- NEVER add arbitrary visual styles not in the brand system
- If the user requests something unsafe, add it to conflicts instead
- Always produce at least one meaningful change
- Keep ops realistic and scoped to what the system supports`

export async function callLLM(
  config: LLMConfig,
  project: Project,
  userRequest: string,
): Promise<AIPlan> {
  const projectContext = JSON.stringify({
    brand: project.brand,
    tokens: { colors: Object.keys(project.tokens.colors), textStyles: Object.keys(project.tokens.textStyles) },
    pages: Object.values(project.pages).map((p) => ({ name: p.name, route: p.route })),
    components: Object.values(project.components).map((c) => ({ name: c.name, category: c.category })),
    collections: Object.values(project.collections).map((c) => ({ name: c.name, fields: c.fields.map((f) => f.key) })),
    navigation: project.navigation.map((l) => ({ label: l.label })),
  }, null, 2)

  const userMsg = `Project context:\n${projectContext}\n\nUser request: ${userRequest}`

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    throw new Error(`LLM API error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content ?? ''

  // Extract JSON from the response (handle markdown code blocks)
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/)
  const jsonStr = jsonMatch ? jsonMatch[1] : content

  try {
    const parsed = JSON.parse(jsonStr.trim())
    return {
      summary: Array.isArray(parsed.summary) ? parsed.summary : ['Applied LLM-suggested changes'],
      ops: Array.isArray(parsed.ops) ? parsed.ops : [],
      conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
    }
  } catch {
    return {
      summary: ['LLM returned an invalid response. Try rephrasing your request.'],
      ops: [],
      conflicts: ['The AI assistant could not parse the response.'],
    }
  }
}
