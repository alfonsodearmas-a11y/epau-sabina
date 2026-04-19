import type Anthropic from '@anthropic-ai/sdk';
import { COMMENTARY_COMPOSER_PROMPT } from './prompts/commentary';
import type { CommentaryComposer } from './tools/render';

export function makeCommentaryComposer(
  anthropic: Anthropic,
  modelId: string,
): CommentaryComposer {
  return async ({ brief, word_count_target }) => {
    const figuresBlock = brief.figures
      .map((f) => `- ${f.label}: ${f.value} ${f.unit}, ${f.period} (source: ${f.indicator_id})`)
      .join('\n');

    const user = [
      `Analytical point: ${brief.analytical_point}`,
      '',
      'Figures:',
      figuresBlock,
      '',
      `Word count target: ${word_count_target} (±15 percent).`,
      '',
      'Write the paragraph.',
    ].join('\n');

    const msg = await anthropic.messages.create({
      model: modelId,
      max_tokens: 1024,
      system: [{ type: 'text', text: COMMENTARY_COMPOSER_PROMPT }],
      messages: [{ role: 'user', content: user }],
    });

    const out = msg.content
      .filter((b): b is Extract<typeof b, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    return out;
  };
}
