import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

type AuthLinkParams = Record<string, string>;

function decode(value: string) {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

function addParams(target: AuthLinkParams, value?: string) {
  if (!value) return;

  value.split('&').forEach((entry) => {
    if (!entry) return;
    const separator = entry.indexOf('=');
    const key = separator >= 0 ? entry.slice(0, separator) : entry;
    const content = separator >= 0 ? entry.slice(separator + 1) : '';
    target[decode(key)] = decode(content);
  });
}

export function getAuthRedirectUrl() {
  return Linking.createURL('auth/callback');
}

export function readAuthLinkParams(url: string) {
  const params: AuthLinkParams = {};
  const queryStart = url.indexOf('?');
  const fragmentStart = url.indexOf('#');

  if (queryStart >= 0) {
    const queryEnd = fragmentStart > queryStart ? fragmentStart : url.length;
    addParams(params, url.slice(queryStart + 1, queryEnd));
  }

  if (fragmentStart >= 0) {
    addParams(params, url.slice(fragmentStart + 1));
  }

  return params;
}

export async function createSessionFromAuthUrl(url: string) {
  if (!supabase) {
    return { error: 'تعذر الاتصال بخدمة الحسابات. أعد تشغيل التطبيق وحاول مرة أخرى.' };
  }

  const params = readAuthLinkParams(url);
  const callbackError = params.error_description || params.error;

  if (callbackError) {
    return { error: callbackError, type: params.type };
  }

  if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    return {
      session: data.session,
      type: params.type,
      error: error?.message,
    };
  }

  if (params.access_token && params.refresh_token) {
    const { data, error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });

    return {
      session: data.session,
      type: params.type,
      error: error?.message,
    };
  }

  return {
    type: params.type,
    error: 'الرابط غير مكتمل أو انتهت صلاحيته. اطلب رابطًا جديدًا وحاول مرة أخرى.',
  };
}
