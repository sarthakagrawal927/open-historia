import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import llm from '../../src/worker/routes/llm';

const app = new Hono().route('/', llm);
const request = {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    command: 'Negotiate a humanitarian trade agreement.',
    gameState: { turn: 1939, players: { player: { name: 'United Kingdom' } } },
    config: {
      provider: 'free-ai',
      model: '@cf/meta/llama-3.1-8b-instruct',
      scenario: 'Synthetic campaign',
      difficulty: 'Realistic',
    },
  }),
};

describe('turn route through the real Workers AI adapter', () => {
  it('repairs a legacy selection and returns parsed turn consequences', async () => {
    const run = vi.fn().mockResolvedValue({
      response: JSON.stringify({
        message: 'The agreement is accepted.',
        updates: [{ type: 'time', amount: 1 }],
        storySoFar: 'A humanitarian agreement is in place.',
      }),
    });
    const response = await app.request('/turn', request, { AI: { run } });
    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0][0]).toBe('@cf/meta/llama-3.1-8b-instruct-fast');
    expect(run.mock.calls[0][1].max_tokens).toBe(2048);
    expect(run.mock.calls[0][1].response_format).toMatchObject({
      type: 'json_schema',
      json_schema: { type: 'object', required: ['message', 'updates', 'storySoFar'] },
    });
    expect(JSON.stringify(run.mock.calls[0][1].messages)).toContain('United Kingdom');
    expect(await response.json()).toMatchObject({
      message: 'The agreement is accepted.',
      updates: [{ type: 'time', amount: 1 }],
      storySoFar: 'A humanitarian agreement is in place.',
    });
  });

  it('accepts structured binding output and retains campaign memory', async () => {
    const run = vi.fn().mockResolvedValue({ response: {
      message: 'Relief ships depart.', updates: [], storySoFar: 'Shipping access agreed.',
    } });
    const response = await app.request('/turn', request, { AI: { run } });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ storySoFar: 'Shipping access agreed.' });
  });

  it.each([
    ['/chat', { message: 'Request aid.', playerNation: 'Britain', targetNation: 'France' },
      { message: 'Agreed.', tone: 'friendly', relationChange: null }, ['message', 'tone', 'relationChange']],
    ['/advisor', { question: 'How can we provide aid?', playerNation: 'Britain' },
      { advice: 'Negotiate shipping access.', category: 'diplomacy', suggestedActions: ['Request access.'] },
      ['advice', 'category', 'suggestedActions']],
  ])('sends the matching response schema for %s', async (path, input, output, required) => {
    const run = vi.fn().mockResolvedValue({ response: output });
    const response = await app.request(path, { ...request, body: JSON.stringify({
      ...input, config: { provider: 'free-ai', model: 'auto' },
    }) }, { AI: { run } });
    expect(response.status).toBe(200);
    expect(run.mock.calls[0][1].response_format.json_schema.required).toEqual(required);
  });

  it('does not expose provider errors containing campaign prompts', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const run = vi.fn().mockRejectedValue(new Error('PRIVATE_CAMPAIGN_SENTINEL'));
      const response = await app.request('/turn', request, { AI: { run } });
      expect(response.status).toBe(500);
      expect(await response.text()).not.toContain('PRIVATE_CAMPAIGN_SENTINEL');
      expect(JSON.stringify(log.mock.calls)).not.toContain('PRIVATE_CAMPAIGN_SENTINEL');
    } finally { log.mockRestore(); }
  });

  it('does not return state updates when model output is malformed', async () => {
    const run = vi.fn().mockResolvedValue({ response: 'An unfinished response {' });
    const response = await app.request('/turn', request, { AI: { run } });
    expect(response.status).toBe(502);
    expect((await response.json()).updates).toEqual([]);
  });
});
