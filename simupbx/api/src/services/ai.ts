// The AI layer: Zuri (receptionist), call summaries, voicemail urgency.
// Powered by the Anthropic SDK. Every function degrades gracefully when
// ANTHROPIC_API_KEY is absent so the PBX keeps working without AI.

import Anthropic from '@anthropic-ai/sdk';
import { config, hasAnthropic } from '../config.js';
import { q } from '../db/index.js';

const client = hasAnthropic() ? new Anthropic({ apiKey: config.anthropic.apiKey }) : null;

function textOf(response: Anthropic.Message): string {
  for (const block of response.content) {
    if (block.type === 'text') return block.text;
  }
  return '';
}

async function knowledgeBase(): Promise<string> {
  const rows = await q<{ question: string; answer: string }>(
    'SELECT question, answer FROM kb_entries ORDER BY id',
  );
  return rows.map((r) => `Q: ${r.question}\nA: ${r.answer}`).join('\n\n') || '(knowledge base is empty)';
}

const ZURI_SYSTEM = `You are Zuri, the warm and efficient AI receptionist for a Kenyan business, answering a live phone call. You speak fluent English and Kiswahili — reply in whichever language the caller used, and code-switch naturally like Nairobians do.

Rules:
- Keep every reply short (1-3 sentences) — this is a phone call, not a chat.
- Answer questions ONLY from the knowledge base provided. If the answer isn't there, offer to take a message or transfer.
- When the caller wants a human, payment, or something you can't do, respond with EXACTLY one routing tag on its own final line: [ROUTE:sales], [ROUTE:support], [ROUTE:accounts], [ROUTE:mpesa], or [ROUTE:voicemail]. Say a short handover sentence before the tag.
- Never invent prices, dates, or commitments not in the knowledge base.`;

export interface ZuriReply {
  say: string;
  route: 'sales' | 'support' | 'accounts' | 'mpesa' | 'voicemail' | null;
}

export async function zuriReply(
  history: { role: 'user' | 'assistant'; content: string }[],
): Promise<ZuriReply> {
  if (!client) {
    return {
      say: 'Karibu! Our AI receptionist is offline right now — connecting you to the team.',
      route: 'sales',
    };
  }
  const kb = await knowledgeBase();
  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 300,
    thinking: { type: 'adaptive' },
    output_config: { effort: 'low' },
    system: `${ZURI_SYSTEM}\n\n<knowledge_base>\n${kb}\n</knowledge_base>`,
    messages: history,
  });
  const text = textOf(response);
  const routeMatch = text.match(/\[ROUTE:(sales|support|accounts|mpesa|voicemail)\]/);
  return {
    say: text.replace(/\[ROUTE:\w+\]/g, '').trim(),
    route: (routeMatch?.[1] as ZuriReply['route']) ?? null,
  };
}

export interface CallSummary {
  bullets: string[];
  action_items: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

export async function summarizeCall(
  transcript: { speaker: string; text: string }[],
): Promise<CallSummary | null> {
  if (!client || transcript.length === 0) return null;
  const convo = transcript.map((t) => `${t.speaker}: ${t.text}`).join('\n');
  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 600,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'low',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            bullets: { type: 'array', items: { type: 'string' } },
            action_items: { type: 'array', items: { type: 'string' } },
            sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
          },
          required: ['bullets', 'action_items', 'sentiment'],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: 'user',
        content: `Summarize this business phone call (may mix English and Kiswahili). 2-4 concise bullets, concrete action items, overall caller sentiment.\n\n${convo}`,
      },
    ],
  });
  try {
    return JSON.parse(textOf(response)) as CallSummary;
  } catch {
    return null;
  }
}

export interface VoicemailAnalysis {
  urgency: 'high' | 'normal' | 'low';
  reason: string;
}

export async function analyzeVoicemail(transcript: string): Promise<VoicemailAnalysis> {
  if (!client) return { urgency: 'normal', reason: '' };
  const response = await client.messages.create({
    model: config.anthropic.model,
    max_tokens: 200,
    thinking: { type: 'adaptive' },
    output_config: {
      effort: 'low',
      format: {
        type: 'json_schema',
        schema: {
          type: 'object',
          properties: {
            urgency: { type: 'string', enum: ['high', 'normal', 'low'] },
            reason: { type: 'string' },
          },
          required: ['urgency', 'reason'],
          additionalProperties: false,
        },
      },
    },
    messages: [
      {
        role: 'user',
        content: `Rate the urgency of this voicemail for a Kenyan business (time-sensitive requests, complaints, and hot leads are high). One-sentence reason.\n\nVoicemail: "${transcript}"`,
      },
    ],
  });
  try {
    return JSON.parse(textOf(response)) as VoicemailAnalysis;
  } catch {
    return { urgency: 'normal', reason: '' };
  }
}
