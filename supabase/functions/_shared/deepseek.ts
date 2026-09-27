export class DeepSeekRequestError extends Error {
  code: string;
  status: number;

  constructor(code: string, status = 502) {
    super(code);
    this.name = 'DeepSeekRequestError';
    this.code = code;
    this.status = status;
  }
}

type DeepSeekPayload = {
  choices?: unknown;
  error?: {
    code?: unknown;
    message?: unknown;
    type?: unknown;
  };
};

function outputText(payload: DeepSeekPayload) {
  if (!Array.isArray(payload.choices)) return '';

  for (const choice of payload.choices) {
    if (!choice || typeof choice !== 'object') continue;
    const message = (choice as { message?: unknown }).message;
    if (!message || typeof message !== 'object') continue;
    const content = (message as { content?: unknown }).content;
    if (typeof content === 'string' && content.trim()) return content;
  }

  return '';
}

function errorCode(status: number, payload: DeepSeekPayload) {
  const message = typeof payload.error?.message === 'string' ? payload.error.message : '';
  const type = typeof payload.error?.type === 'string' ? payload.error.type : '';

  console.error('DeepSeek request failed', status, type || 'unknown');

  if (status === 401) return 'deepseek_key_invalid';
  if (status === 402 || /insufficient balance/i.test(message)) return 'deepseek_billing_required';
  if (status === 403) return 'deepseek_access_denied';
  if (status === 404 || /model.+not found|unknown model/i.test(message)) return 'deepseek_model_unavailable';
  if (status === 429) return 'deepseek_rate_limited';
  if (status === 503 || status === 502) return 'deepseek_unavailable';
  if (status === 400 || status === 422) return 'deepseek_invalid_request';
  return 'analysis_failed';
}

export function taskJsonExample(includeTranscript = false) {
  const task = [
    '{"title":"نص قصير","description":"وصف موجز",',
    '"priority":"important_urgent | important | later","category":"غير مصنف",',
    '"due_at":"2026-01-01T18:00:00+03:00 أو null",',
    '"reminder_minutes":30,"confidence":0.8}',
  ].join('');

  return includeTranscript
    ? `{"transcript":"نص ما قيل","tasks":[${task}]}`
    : `{"tasks":[${task}]}`;
}

export async function analyzeImageWithDeepSeek(input: {
  imageBase64: string;
  mediaType: string;
  prompt: string;
  maxOutputTokens: number;
}) {
  const apiKey = Deno.env.get('DEEPSEEK_API_KEY');
  if (!apiKey) throw new DeepSeekRequestError('analysis_not_configured', 503);

  const model = Deno.env.get('DEEPSEEK_MODEL') || 'deepseek-flash';
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: input.maxOutputTokens,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: input.prompt },
            {
              type: 'image_url',
              image_url: { url: `data:${input.mediaType};base64,${input.imageBase64}` },
            },
          ],
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({})) as DeepSeekPayload;
  if (!response.ok) throw new DeepSeekRequestError(errorCode(response.status, payload), 502);

  const text = outputText(payload).trim();
  if (!text) throw new DeepSeekRequestError('deepseek_empty_response', 502);

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new DeepSeekRequestError('deepseek_invalid_response', 502);
  }
}
