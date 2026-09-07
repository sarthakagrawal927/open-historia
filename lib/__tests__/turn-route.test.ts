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
        updatedStorySoFar: 'A humanitarian agreement is in place.',
      }),
    });
    const response = await app.request('/turn', request, { AI: { run } });
    expect(response.status).toBe(200);
    expect(run).toHaveBeenCalledOnce();
    expect(run.mock.calls[0][0]).toBe('@cf/meta/llama-3.1-8b-instruct-fast');
    expect(JSON.stringify(run.mock.calls[0][1].messages)).toContain('United Kingdom');
    expect(await response.json()).toMatchObject({
      message: 'The agreement is accepted.',
      updates: [{ type: 'time', amount: 1 }],
    });
  });

  it('does not return state updates when model output is malformed', async () => {
    const run = vi.fn().mockResolvedValue({ response: 'An unfinished response {' });
    const response = await app.request('/turn', request, { AI: { run } });
    expect(response.status).toBe(502);
    expect((await response.json()).updates).toEqual([]);
  });
});
