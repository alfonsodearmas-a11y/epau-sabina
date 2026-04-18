// Narrator prompt — drafts a ~150-word commentary paragraph in EPAU house style.
// Strict style constraints: no emdashes, no "this is not X, it is Y" constructions,
// technical-but-readable, numbers with units and period, acknowledge caveats, end with
// an analytical observation (not a summary), never invent figures.
import type Anthropic from '@anthropic-ai/sdk';

export const NARRATOR_PROMPT_VERSION = '2026.04.18-1';

export interface NarratorInput {
  originalQuery: string;
  indicators: Array<{
    id: string;
    name: string;
    unit: string;
    frequency: string;
    source: string;
    caveat?: string | null;
  }>;
  observations: Array<{
    indicatorId: string;
    periodLabel: string;
    value: number | null;
    scenario?: string;
  }>;
}

export function buildNarratorMessages(input: NarratorInput): { system: string; messages: Anthropic.Messages.MessageParam[] } {
  const system = [
    'You are drafting briefing commentary for the Economic Policy and Analysis Unit',
    '(EPAU) of the Guyana Ministry of Finance. Your reader is an economist preparing',
    'notes for the Minister.',
    '',
    'House style (enforce all):',
    '- No emdashes. Use commas, semicolons, or start new sentences.',
    '- Never use "this is not X, it is Y" constructions.',
    '- Technical but readable. The reader knows fiscal and macro vocabulary.',
    '- Numbers with units and period: "G$178 billion in 2023", not "178 billion".',
    '- Negatives in parentheses when tabular, otherwise prose ("a decline of 4.2 percent").',
    '- Years as plain four-digit numerals. Do not comma-format years.',
    '- Acknowledge data caveats whenever they are material to the statement.',
    '- Never invent a figure or introduce a series that was not provided.',
    '- End with an analytical observation, not a summary.',
    '- Target length 140-170 words. Single paragraph, no headings, no bullets.',
    '- Do NOT prefix with "Here is the commentary" or any framing text; return prose only.',
  ].join('\n');

  const dataText = input.indicators.map((ind) => {
    const caveat = ind.caveat ? ` (caveat: ${ind.caveat})` : '';
    const obs = input.observations
      .filter((o) => o.indicatorId === ind.id)
      .map((o) => `${o.periodLabel}${o.scenario && o.scenario !== 'actual' ? ` [${o.scenario}]` : ''}: ${o.value ?? 'n/a'}`)
      .join(', ');
    return `- ${ind.name} (${ind.unit}, ${ind.frequency}, ${ind.source})${caveat}\n  ${obs}`;
  }).join('\n');

  return {
    system,
    messages: [{
      role: 'user',
      content: `Original query: ${input.originalQuery}\n\nData:\n${dataText}\n\nDraft the commentary paragraph now.`,
    }],
  };
}
