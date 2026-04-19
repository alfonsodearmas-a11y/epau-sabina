import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error('ANTHROPIC_API_KEY not set');
    client = new Anthropic({ apiKey: key });
  }
  return client;
}

export function modelName(): string {
  return process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5';
}

export function composerModelName(): string {
  // Haiku trial regressed Q3 — the composer invented derived figures not
  // in the brief (e.g. 2.6B+0.14B-1.6B = 1.1B) and the audit correctly
  // flagged them. Default to the main model; expose the env var so this
  // can be revisited when Haiku follow-the-brief reliability improves.
  return process.env.COMMENTARY_MODEL ?? modelName();
}
