import { File } from 'expo-file-system';

import { supabase } from '@/lib/supabase';
import { SmartScanResult, SmartScanStatus, SmartTaskDraft, SmartTaskPriority, SmartVoiceScanResult } from '@/types/smart-capture';

type StatusRow = {
  plan: SmartScanStatus['plan'];
  subscription_status: SmartScanStatus['subscriptionStatus'];
  allowance_type: SmartScanStatus['allowanceType'];
  usage_limit: number;
  used: number;
  remaining: number;
  period_end: string | null;
};

type AnalysisPayload = {
  tasks?: {
    title?: unknown;
    description?: unknown;
    priority?: unknown;
    category?: unknown;
    due_at?: unknown;
    reminder_minutes?: unknown;
    confidence?: unknown;
  }[];
  quota?: {
    allowance_type?: unknown;
    limit?: unknown;
    used?: unknown;
    remaining?: unknown;
    period_end?: unknown;
  };
  transcript?: unknown;
  error?: unknown;
};

export class SmartCaptureError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.name = 'SmartCaptureError';
    this.code = code;
  }
}

export function smartCaptureErrorMessage(code: string) {
  if (code === 'limit_reached') return 'انتهت عمليات التحويل المتاحة في حسابك.';
  if (code === 'no_tasks_found') return 'ما لقينا مهمة واضحة. جرّب صورة أوضح أو تسجيلًا صوتيًا أكثر وضوحًا.';
  if (code === 'image_too_large') return 'حجم الصورة كبير. اختر صورة أصغر أو التقط لقطة شاشة.';
  if (code === 'audio_too_large') return 'التسجيل طويل جدًا. جرّب تسجيل المهمة خلال دقيقة واحدة.';
  if (code === 'audio_too_short') return 'التسجيل قصير جدًا. اضغط المايك وقل تفاصيل مهمتك بوضوح.';
  if (code === 'audio_read_failed') return 'تعذر قراءة التسجيل من الجوال. سجّل المهمة مرة أخرى ثم اضغط إنهاء.';
  if (code === 'unsupported_audio') return 'صيغة التسجيل غير مدعومة. سجّل المهمة مرة أخرى من داخل التطبيق.';
  if (code === 'transcription_failed') return 'ما قدرنا نفهم التسجيل. جرّب مرة ثانية في مكان أهدأ.';
  if (code === 'openai_billing_required') return 'رصيد OpenAI غير متوفر. أضف رصيدًا لحساب API ثم جرّب مرة أخرى.';
  if (code === 'openai_key_invalid') return 'مفتاح OpenAI غير صالح. أنشئ مفتاحًا جديدًا واحفظه في Supabase.';
  if (code === 'openai_access_denied') return 'حساب OpenAI لا يملك صلاحية استخدام التحويل الصوتي.';
  if (code === 'openai_model_unavailable') return 'نموذج التحليل غير متاح لهذا الحساب حاليًا.';
  if (code === 'openai_rate_limited') return 'خدمة التحويل مشغولة الآن. انتظر قليلًا ثم جرّب مرة أخرى.';
  if (code === 'analysis_not_configured') return 'ميزة التحليل تحتاج إضافة مفتاح Gemini أو DeepSeek في إعدادات Supabase.';
  if (code === 'deepseek_key_invalid') return 'مفتاح DeepSeek غير صالح. أنشئ مفتاحًا جديدًا واحفظه في Supabase.';
  if (code === 'deepseek_billing_required') return 'رصيد DeepSeek غير متوفر. أضف رصيدًا لحسابك ثم جرّب مرة أخرى.';
  if (code === 'deepseek_access_denied') return 'حساب DeepSeek لا يملك صلاحية استخدام النموذج حاليًا.';
  if (code === 'deepseek_model_unavailable') return 'نموذج DeepSeek غير متاح لهذا الحساب حاليًا.';
  if (code === 'deepseek_rate_limited') return 'خدمة DeepSeek مشغولة الآن. انتظر قليلًا ثم جرّب مرة أخرى.';
  if (code === 'deepseek_unavailable') return 'خدمة DeepSeek غير متاحة مؤقتًا. جرّب مرة أخرى بعد قليل.';
  if (code === 'deepseek_invalid_request') return 'صيغة الصورة غير مقبولة لدى DeepSeek. جرّب صورة أخرى.';
  if (code === 'deepseek_empty_response' || code === 'deepseek_invalid_response') {
    return 'لم يكتمل تحليل DeepSeek. جرّب صورة أوضح مرة أخرى.';
  }
  if (code === 'gemini_key_invalid') return 'مفتاح Gemini غير صالح. أنشئ مفتاحًا جديدًا واحفظه في Supabase.';
  if (code === 'gemini_access_denied') return 'مشروع Gemini لا يملك صلاحية استخدام النموذج حاليًا.';
  if (code === 'gemini_model_unavailable') return 'نموذج Gemini غير متاح لهذا المشروع حاليًا.';
  if (code === 'gemini_rate_limited') return 'وصلت للحد المجاني المؤقت في Gemini. انتظر قليلًا ثم جرّب مرة أخرى.';
  if (code === 'gemini_unavailable') return 'خدمة Gemini غير متاحة مؤقتًا. جرّب مرة أخرى بعد قليل.';
  if (code === 'gemini_invalid_request') return 'صيغة الملف غير مقبولة لدى Gemini. جرّب صورة أو تسجيلًا آخر.';
  if (code === 'gemini_project_not_ready') return 'مشروع Gemini غير جاهز بعد. راجع إعدادات Google AI Studio.';
  if (code === 'gemini_incomplete_response' || code === 'gemini_empty_response' || code === 'gemini_invalid_response') {
    return 'لم يكتمل تحليل Gemini. جرّب التسجيل مرة أخرى بصوت واضح ومختصر.';
  }
  if (code === 'quota_unavailable') return 'تعذر التحقق من رصيدك الآن. تأكد من تشغيل تحديث قاعدة البيانات.';
  if (code === 'authentication_required') return 'سجّل الدخول أولًا لاستخدام التحويل الذكي.';
  return 'تعذر التحليل الآن. لم يتم خصم أي استخدام، حاول مرة أخرى.';
}

export async function getSmartScanStatus(): Promise<SmartScanStatus> {
  if (!supabase) throw new SmartCaptureError('not_configured');

  const { data, error } = await supabase.rpc('get_my_smart_scan_status');
  if (error) throw new SmartCaptureError('quota_unavailable');

  const row = (Array.isArray(data) ? data[0] : data) as StatusRow | undefined;
  if (!row) throw new SmartCaptureError('quota_unavailable');

  return {
    plan: row.plan,
    subscriptionStatus: row.subscription_status,
    allowanceType: row.allowance_type,
    usageLimit: row.usage_limit,
    used: row.used,
    remaining: row.remaining,
    periodEnd: row.period_end,
  };
}

async function edgeErrorCode(error: unknown) {
  const context = (error as { context?: unknown } | null)?.context;
  if (!(context instanceof Response)) return 'analysis_failed';

  try {
    const payload = await context.clone().json() as AnalysisPayload;
    return typeof payload.error === 'string' ? payload.error : 'analysis_failed';
  } catch {
    return 'analysis_failed';
  }
}

function priorityValue(value: unknown): SmartTaskPriority {
  return value === 'important_urgent' || value === 'important' || value === 'later' ? value : 'later';
}

function parseSmartScanResult(data: AnalysisPayload): SmartScanResult {
  if (!Array.isArray(data.tasks) || !data.quota) throw new SmartCaptureError('analysis_failed');

  const tasks = data.tasks.flatMap<SmartTaskDraft>((draft, index) => {
    const title = typeof draft.title === 'string' ? draft.title.trim() : '';
    if (!title) return [];
    const parsedDate = typeof draft.due_at === 'string' ? new Date(draft.due_at) : null;
    const dueAt = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

    return [{
      id: `draft_${Date.now().toString(36)}_${index}`,
      selected: true,
      title,
      description: typeof draft.description === 'string' ? draft.description : '',
      priority: priorityValue(draft.priority),
      category: typeof draft.category === 'string' && draft.category.trim() ? draft.category.trim() : 'غير مصنف',
      dueAt,
      reminderMinutes: dueAt && typeof draft.reminder_minutes === 'number' ? draft.reminder_minutes : null,
      confidence: typeof draft.confidence === 'number' ? draft.confidence : 0.5,
    }];
  });

  return {
    tasks,
    quota: {
      allowanceType: data.quota.allowance_type === 'monthly' ? 'monthly' : 'free',
      usageLimit: typeof data.quota.limit === 'number' ? data.quota.limit : 0,
      used: typeof data.quota.used === 'number' ? data.quota.used : 0,
      remaining: typeof data.quota.remaining === 'number' ? data.quota.remaining : 0,
      periodEnd: typeof data.quota.period_end === 'string' ? data.quota.period_end : null,
    },
  };
}

export async function analyzeTaskImage(input: {
  imageBase64: string;
  mediaType?: string | null;
}): Promise<SmartScanResult> {
  if (!supabase) throw new SmartCaptureError('not_configured');

  const { data, error } = await supabase.functions.invoke<AnalysisPayload>('analyze-task-image', {
    body: {
      image_base64: input.imageBase64,
      media_type: input.mediaType || 'image/jpeg',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Riyadh',
      local_date: new Date().toISOString(),
    },
  });

  if (error) throw new SmartCaptureError(await edgeErrorCode(error));
  if (!data) throw new SmartCaptureError('analysis_failed');
  return parseSmartScanResult(data);
}

function audioMediaType(uri: string) {
  const normalized = uri.toLowerCase();
  if (normalized.includes('.webm')) return { type: 'audio/webm', name: 'mahami-voice.webm' };
  if (normalized.includes('.3gp')) return { type: 'audio/3gpp', name: 'mahami-voice.3gp' };
  return { type: 'audio/m4a', name: 'mahami-voice.m4a' };
}

export async function analyzeTaskVoice(audioUri: string): Promise<SmartVoiceScanResult> {
  if (!supabase) throw new SmartCaptureError('not_configured');

  const audio = audioMediaType(audioUri);
  let audioBase64: string;
  try {
    audioBase64 = await new File(audioUri).base64();
  } catch {
    throw new SmartCaptureError('audio_read_failed');
  }

  if (!audioBase64) throw new SmartCaptureError('audio_read_failed');

  const { data, error } = await supabase.functions.invoke<AnalysisPayload>('analyze-task-voice', {
    body: {
      audio_base64: audioBase64,
      media_type: audio.type,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Riyadh',
      local_date: new Date().toISOString(),
    },
  });
  if (error) throw new SmartCaptureError(await edgeErrorCode(error));
  if (!data) throw new SmartCaptureError('analysis_failed');

  const result = parseSmartScanResult(data);
  return {
    ...result,
    transcript: typeof data.transcript === 'string' ? data.transcript.trim() : '',
  };
}
