import { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { getAuthRedirectUrl } from '@/lib/auth-links';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type AuthResult = {
  error?: string;
  needsEmailConfirmation?: boolean;
  needsOnboarding?: boolean;
};

export type AppleProfile = {
  fullName?: string;
  givenName?: string;
  familyName?: string;
};

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signInWithApple: (identityToken: string, profile?: AppleProfile) => Promise<AuthResult>;
  signInTestAccount: () => Promise<AuthResult>;
  sendPhoneOtp: (phone: string) => Promise<AuthResult>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<AuthResult>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  resendConfirmation: (email: string) => Promise<AuthResult>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  updateProfileName: (name: string) => Promise<AuthResult>;
  deleteAccount: () => Promise<AuthResult>;
  completeOnboarding: (name?: string) => Promise<AuthResult>;
  signOut: () => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function translateAuthError(message: string, code?: string) {
  const normalized = message.toLowerCase();
  const normalizedCode = code?.toLowerCase() ?? '';

  if (normalizedCode === 'invalid_credentials' || normalized.includes('invalid login credentials')) {
    return 'بيانات تسجيل الدخول غير صحيحة.';
  }
  if (normalizedCode === 'email_not_confirmed' || normalized.includes('email not confirmed')) {
    return 'أكد بريدك الإلكتروني أولًا، ثم حاول مرة أخرى.';
  }
  if (normalizedCode === 'user_already_exists' || normalized.includes('user already registered')) {
    return 'يوجد حساب مسجل بهذا البريد بالفعل.';
  }
  if (normalized.includes('password should be')) return 'كلمة المرور لا تحقق الحد الأدنى المطلوب.';
  if (normalized.includes('different from the old password')) return 'اختر كلمة مرور مختلفة عن كلمة المرور السابقة.';
  if ((normalizedCode === 'validation_failed' && normalized.includes('phone')) || normalized.includes('invalid phone')) {
    return 'تحقق من رقم الجوال ومفتاح الدولة.';
  }
  if (
    normalizedCode === 'otp_expired' ||
    (normalized.includes('otp') && (normalized.includes('expired') || normalized.includes('invalid')))
  ) {
    return 'رمز التحقق غير صحيح أو انتهت صلاحيته.';
  }
  if (
    normalizedCode === 'phone_provider_disabled' ||
    normalizedCode === 'sms_send_failed' ||
    normalized.includes('phone provider') ||
    normalized.includes('sms provider')
  ) {
    return 'تسجيل الجوال غير مفعّل بعد. نحتاج ربط مزود رسائل SMS في Supabase.';
  }
  if (
    normalizedCode === 'provider_disabled' ||
    normalizedCode === 'oauth_provider_not_supported' ||
    normalized.includes('provider is not enabled') ||
    normalized.includes('unsupported provider')
  ) {
    return 'تسجيل الدخول بهذه الطريقة غير مفعّل بعد في Supabase.';
  }
  if (
    normalizedCode === 'anonymous_provider_disabled' ||
    normalized.includes('anonymous sign-ins are disabled')
  ) {
    return 'فعّل خيار Allow anonymous sign-ins في Supabase لتشغيل الدخول التجريبي.';
  }
  if (normalized.includes('audience') || normalized.includes('identity token')) {
    return 'إعداد تسجيل Apple غير مكتمل بعد. تحقق من Client ID في Supabase.';
  }
  if (
    normalizedCode === 'over_email_send_rate_limit' ||
    normalizedCode === 'over_sms_send_rate_limit' ||
    normalizedCode === 'over_request_rate_limit' ||
    normalized.includes('rate limit')
  ) {
    return 'محاولات كثيرة خلال وقت قصير. انتظر قليلًا ثم حاول مجددًا.';
  }
  if (normalizedCode === 'captcha_failed') return 'تعذر التحقق الأمني. حاول مرة أخرى.';
  if (normalizedCode === 'signup_disabled') return 'إنشاء الحسابات الجديدة متوقف مؤقتًا.';
  if (normalizedCode === 'user_banned') return 'هذا الحساب موقوف. تواصل مع الدعم.';
  if (normalizedCode === 'request_timeout' || normalized.includes('network') || normalized.includes('fetch')) {
    return 'تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.';
  }

  return 'حدث خطأ غير متوقع. حاول مرة أخرى.';
}

const missingConfigurationError = 'لم يتم ربط مشروع Supabase بالتطبيق حتى الآن.';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    loading,
    configured: isSupabaseConfigured,
    signIn: async (email, password) => {
      if (!supabase) return { error: missingConfigurationError };

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) return { error: translateAuthError(error.message, error.code) };

      return {
        needsOnboarding: data.user.user_metadata.onboarding_completed !== true,
      };
    },
    signInWithApple: async (identityToken, profile) => {
      if (!supabase) return { error: missingConfigurationError };

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: identityToken,
      });

      if (error) return { error: translateAuthError(error.message, error.code) };

      const metadata: Record<string, string | boolean> = {};
      if (data.user.user_metadata.onboarding_completed === undefined) {
        metadata.onboarding_completed = false;
      }
      if (profile?.fullName && !data.user.user_metadata.full_name) {
        metadata.full_name = profile.fullName;
      }
      if (profile?.givenName && !data.user.user_metadata.given_name) {
        metadata.given_name = profile.givenName;
      }
      if (profile?.familyName && !data.user.user_metadata.family_name) {
        metadata.family_name = profile.familyName;
      }

      if (Object.keys(metadata).length > 0) {
        const { error: profileError } = await supabase.auth.updateUser({ data: metadata });
        if (profileError && __DEV__) {
          console.warn('Apple profile metadata could not be saved:', profileError.code);
        }
      }

      return {
        needsOnboarding: data.user.user_metadata.onboarding_completed !== true,
      };
    },
    signInTestAccount: async () => {
      if (!__DEV__) return { error: 'الدخول التجريبي غير متاح في نسخة الإنتاج.' };
      if (!supabase) return { error: missingConfigurationError };

      const { data, error } = await supabase.auth.signInAnonymously({
        options: {
          data: {
            phone_alias: '96651111111',
            is_test_account: true,
            onboarding_completed: false,
          },
        },
      });

      if (error) return { error: translateAuthError(error.message, error.code) };

      return {
        needsOnboarding: data.user?.user_metadata.onboarding_completed !== true,
      };
    },
    sendPhoneOtp: async (phone) => {
      if (!supabase) return { error: missingConfigurationError };

      const { error } = await supabase.auth.signInWithOtp({
        phone,
        options: {
          shouldCreateUser: true,
          data: { onboarding_completed: false },
        },
      });

      return error ? { error: translateAuthError(error.message, error.code) } : {};
    },
    verifyPhoneOtp: async (phone, token) => {
      if (!supabase) return { error: missingConfigurationError };

      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });

      if (error) return { error: translateAuthError(error.message, error.code) };

      return {
        needsOnboarding: data.user?.user_metadata.onboarding_completed !== true,
      };
    },
    signUp: async (name, email, password) => {
      if (!supabase) return { error: missingConfigurationError };

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          data: {
            full_name: name.trim(),
            onboarding_completed: false,
          },
        },
      });

      if (error) return { error: translateAuthError(error.message, error.code) };

      return { needsEmailConfirmation: !data.session };
    },
    resendConfirmation: async (email) => {
      if (!supabase) return { error: missingConfigurationError };

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: getAuthRedirectUrl() },
      });

      return error ? { error: translateAuthError(error.message, error.code) } : {};
    },
    sendPasswordReset: async (email) => {
      if (!supabase) return { error: missingConfigurationError };

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: getAuthRedirectUrl(),
      });

      return error ? { error: translateAuthError(error.message, error.code) } : {};
    },
    updatePassword: async (password) => {
      if (!supabase) return { error: missingConfigurationError };
      const { error } = await supabase.auth.updateUser({ password });
      return error ? { error: translateAuthError(error.message, error.code) } : {};
    },
    updateProfileName: async (name) => {
      if (!supabase) return { error: missingConfigurationError };

      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: name.trim() },
      });

      if (error) return { error: translateAuthError(error.message, error.code) };

      setSession((current) => current && data.user ? { ...current, user: data.user } : current);
      return {};
    },
    completeOnboarding: async (name?: string) => {
      if (!supabase) return { error: missingConfigurationError };

      // Apple only sends the name on the very first sign-in, and not at all
      // when the account hides it, so onboarding asks for it and saves it here.
      const trimmed = name?.trim();
      const data: Record<string, unknown> = { onboarding_completed: true };
      if (trimmed) {
        data.full_name = trimmed;
        data.given_name = trimmed.split(' ')[0];
      }

      const { error } = await supabase.auth.updateUser({ data });

      return error ? { error: translateAuthError(error.message, error.code) } : {};
    },
    signOut: async () => {
      if (!supabase) return { error: missingConfigurationError };
      const { error } = await supabase.auth.signOut();
      return error ? { error: translateAuthError(error.message, error.code) } : {};
    },
    deleteAccount: async () => {
      if (!supabase) return { error: missingConfigurationError };

      const { error } = await supabase.functions.invoke('delete-account');
      if (error) return { error: 'تعذر حذف الحساب الآن. تأكد من اتصالك وحاول مرة أخرى.' };

      await supabase.auth.signOut();
      return {};
    },
  }), [loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
