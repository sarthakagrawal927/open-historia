import { describe, expect, it } from 'vitest';
import { resolveWorkersAiModel } from '../workers-ai-model';

describe('Workers AI model compatibility', () => {
  it('repairs the retired model in saved games and operator defaults', () => {
    const retired = '@cf/meta/llama-3.1-8b-instruct';
    expect(resolveWorkersAiModel(retired)).toBe(`${retired}-fast`);
    expect(resolveWorkersAiModel('auto', ` ${retired} `)).toBe(`${retired}-fast`);
    expect(resolveWorkersAiModel()).toBe(`${retired}-fast`);
  });
  it('preserves explicit model selection and request precedence', () => {
    expect(resolveWorkersAiModel(' @cf/custom/request ', '@cf/custom/operator')).toBe(
      '@cf/custom/request'
    );
  });
  it('ignores non-Workers model names when using the Workers binding', () => {
    expect(resolveWorkersAiModel('auto', '@cf/custom/operator')).toBe('@cf/custom/operator');
    expect(resolveWorkersAiModel('gpt-example', 'gemini-example')).toBe(
      '@cf/meta/llama-3.1-8b-instruct-fast'
    );
  });
});
