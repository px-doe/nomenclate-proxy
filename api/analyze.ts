import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import type { TextBlock } from '@anthropic-ai/sdk/resources/messages';
import { tailwind } from '../conventions/tailwind';
import { material3 } from '../conventions/material3';
import { atlassian } from '../conventions/atlassian';
import { polaris } from '../conventions/polaris';
import { atomic } from '../conventions/atomic';
import type { Convention } from '../lib/types';

export const config = {
  maxDuration: 60,
};

type ConventionKey = 'tailwind' | 'material3' | 'atlassian' | 'polaris' | 'atomic';
type ComponentType = 'COMPONENT' | 'COMPONENT_SET';

interface Component {
  id: string;
  name: string;
  type: ComponentType;
}

interface AnalyzeRequest {
  components: Component[];
  convention: ConventionKey;
}

interface AnalysisResult {
  id: string;
  currentName: string;
  status: 'conform' | 'non_conform' | 'ambiguous';
  suggestedName: string | null;
  justification: string;
}

const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const MAX_COMPONENTS = 50;
const RATE_MAP_MAX_SIZE = 1000;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const conventions: Record<ConventionKey, Convention> = { tailwind, material3, atlassian, polaris, atomic };
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getClientIp(req: VercelRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? 'unknown';
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count += 1;
  return true;
}

function cleanRateLimitMap(): void {
  if (rateLimitMap.size <= RATE_MAP_MAX_SIZE) return;
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}

function setCorsHeaders(res: VercelResponse,req: VercelRequest): void|VercelResponse {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
}

function buildSystemPrompt(): string {
  return `You are a design system naming convention auditor. Your job is to evaluate Figma component names against a provided naming convention and return structured JSON analysis.

For each component you receive, you must:
1. Determine if the name conforms to the convention rules ("conform"), violates them ("non_conform"), or is ambiguous ("ambiguous").
2. If non-conforming or ambiguous, suggest a corrected name that follows the rules exactly.
3. Provide a brief, specific justification (1 short sentence, max 15 words) explaining your decision.

Always return a JSON array — no markdown, no prose, no code blocks. Each element must have exactly these fields:
- "id": string (the component's original id)
- "currentName": string (the component's original name)
- "status": "conform" | "non_conform" | "ambiguous"
- "suggestedName": string | null (null if status is "conform")
- "justification": string`;
}

function buildUserPrompt(convention: Convention, components: Component[]): string {
  const examplesText = convention.examples
    .map((e) => `  Good: "${e.good}"\n  Bad: "${e.bad}"\n  Why: ${e.why}`)
    .join('\n\n');

  const componentList = components
    .map((c) => `- id: "${c.id}", name: "${c.name}", type: "${c.type}"`)
    .join('\n');

  return `## Convention: ${convention.name}

${convention.description}

### Rules
${convention.rules}

### Examples
${examplesText}

---

## Components to analyze

${componentList}

Return a JSON array with one object per component. No markdown, no code blocks — raw JSON only.`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res,req);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = getClientIp(req);
  cleanRateLimitMap();

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded. Max 5 requests per hour.' });
  }

  const body = req.body as Partial<AnalyzeRequest>;

  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Request body must be a JSON object.' });
  }

  const { components, convention } = body;

  if (!Array.isArray(components) || components.length === 0) {
    return res.status(400).json({ error: '"components" must be a non-empty array.' });
  }

  if (components.length > MAX_COMPONENTS) {
    return res.status(400).json({ error: `Too many components. Maximum is ${MAX_COMPONENTS}.` });
  }

  const validTypes: ComponentType[] = ['COMPONENT', 'COMPONENT_SET'];
  for (const c of components) {
    if (typeof c.id !== 'string' || !c.id) {
      return res.status(400).json({ error: 'Each component must have a non-empty string "id".' });
    }
    if (typeof c.name !== 'string' || !c.name) {
      return res.status(400).json({ error: 'Each component must have a non-empty string "name".' });
    }
    if (!validTypes.includes(c.type)) {
      return res.status(400).json({ error: `Component type must be "COMPONENT" or "COMPONENT_SET". Got: "${c.type}"` });
    }
  }

  const validConventions: ConventionKey[] = ['tailwind', 'material3', 'atlassian', 'polaris', 'atomic'];
  if (!convention || !validConventions.includes(convention)) {
    return res.status(400).json({ error: `"convention" must be one of: ${validConventions.join(', ')}.` });
  }

  const selectedConvention = conventions[convention];
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(selectedConvention, components);

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      temperature: 0.3,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((b): b is TextBlock => b.type === 'text');
    if (!textBlock) {
      return res.status(502).json({ error: 'No text response from Claude.' });
    }

    let jsonText = textBlock.text.trim();
    const codeBlockMatch = jsonText.match(/^```(?:json)?\n?([\s\S]*?)\n?```$/);
    if (codeBlockMatch) jsonText = codeBlockMatch[1];

    let results: AnalysisResult[];
    try {
      results = JSON.parse(jsonText) as AnalysisResult[];
    } catch {
      return res.status(502).json({ error: 'Claude returned malformed JSON.', raw: jsonText });
    }

    return res.status(200).json(results);
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return res.status(502).json({ error: `Claude API error: ${err.message}` });
    }
    throw err;
  }
}
