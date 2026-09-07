// Cloudflare retired the original model on 2026-05-30; its fast variant remains active.
// https://developers.cloudflare.com/changelog/post/2026-05-08-planned-model-deprecations/
const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const RETIRED_MODEL = '@cf/meta/llama-3.1-8b-instruct';

export function resolveWorkersAiModel(requested?: string, configured?: string): string {
  const model = [requested, configured]
    .map((value) => value?.trim())
    .find((value) => value?.startsWith('@cf/'));
  // Old saves and operator defaults must not keep sending the retired identifier.
  return !model || model === RETIRED_MODEL ? DEFAULT_MODEL : model;
}
