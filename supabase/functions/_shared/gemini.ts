export type GeminiMediaInput = {
  type: 'audio' | 'image';
  data: string;
  mime_type: string;
};

export class GeminiRequestError extends Error {
  code: string;
  status: number;

  constructor(code: string, status = 502) {
    super(code);
    this.name = 'GeminiRequestError';
    this.code = code;
    this.status = status;
  }
}

type GeminiPayload = {
  output_text?: unknown;
  steps?: unknown;
  status?: unknown;
  error?: {
    code?: unknown;
    message?: unknown;
    status?: unknown;
  };
};

function outputText(payload: GeminiPayload) {
  if (typeof payload.output_text === 'string') return payload.output_text;
  if (!Array.isArray(payload.steps)) return '';

  for (let stepIndex = payload.steps.length - 1; stepIndex >= 0; stepIndex -= 1) {
    const step = payload.steps[stepIndex];
    if (!step || typeof step !== 'object') continue;
    const content = (step as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;

    const textParts: string[] = [];
    for (const part of content) {
      if (!part || typeof part !== 'object') continue;
      const text = (part as { text?: unknown }).text;
      if (typeof text === 'string') textParts.push(text);
    }
    if (textParts.length) return textParts.join('');
  }

  return '';
}

function errorCode(status: number, payload: GeminiPayload) {
  const googleStatus = typeof payload.error?.status === 'string' ? payload.error.status : '';
  const message = typeof payload.error?.message === 'string' ? payload.error.message : '';

  console.error('Gemini request failed', status, googleStatus || 'unknown');

  if (/api key not valid|api_key_invalid/i.test(`${googleStatus} ${message}`)) return 'gemini_key_invalid';
  if (status === 401) return 'gemini_key_invalid';
  if (status === 403) return 'gemini_access_denied';
  if (status === 404 || /model.+not found|not found.+model/i.test(message)) return 'gemini_model_unavailable';
  if (status === 429 || googleStatus === 'RESOURCE_EXHAUSTED') return 'gemini_rate_limited';
  if (status === 503 || googleStatus === 'UNAVAILABLE') return 'gemini_unavailable';
  if (status === 400 || googleStatus === 'INVALID_ARGUMENT') return 'gemini_invalid_request';
  if (googleStatus === 'FAILED_PRECONDITION') return 'gemini_project_not_ready';
  return 'analysis_failed';
}

export function taskResponseSchema(maxTasks: number, includeTranscript = false) {
  const properties: Record<string, unknown> = {
    tasks: {
      type: 'array',
      minItems: 0,
      maxItems: maxTasks,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'title',
          'description',
          'priority',
          'category',
          'due_at',
          'reminder_minutes',
          'confidence',
        ],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 300 },
          description: { type: 'string', maxLength: 5000 },
          priority: { type: 'string', enum: ['important_urgent', 'important', 'later'] },
          category: { type: 'string', minLength: 1, maxLength: 80 },
          due_at: { type: ['string', 'null'] },
          reminder_minutes: { type: ['integer', 'null'], minimum: 0, maximum: 10080 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
        },
      },
    },
  };

  const required = ['tasks'];
  if (includeTranscript) {
    properties.transcript = { type: 'string', maxLength: 10000 };
    required.unshift('transcript');
  }

  return {
    type: 'object',
    additionalProperties: false,
    required,
    properties,
  };
}

export async function analyzeMediaWithGemini(input: {
  media: GeminiMediaInput;
  prompt: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
}) {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) throw new GeminiRequestError('analysis_not_configured', 503);

  const model = Deno.env.get('GEMINI_MODEL') || 'gemini-3.7-flash';
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      model,
      store: false,
      generation_config: {
        max_output_tokens: input.maxOutputTokens,
        thinking_level: 'low',
      },
      input: [
        { type: 'text', text: input.prompt },
        input.media,
      ],
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: input.schema,
      },
    }),
  });

  const payload = await response.json().catch(() => ({})) as GeminiPayload;
  if (!response.ok) throw new GeminiRequestError(errorCode(response.status, payload), 502);

  if (payload.status === 'failed') {
    throw new GeminiRequestError(errorCode(502, payload), 502);
  }

  const text = outputText(payload).trim();
  if (!text) {
    const code = payload.status === 'incomplete' ? 'gemini_incomplete_response' : 'gemini_empty_response';
    throw new GeminiRequestError(code, 502);
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new GeminiRequestError('gemini_invalid_response', 502);
  }
}

export function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}
