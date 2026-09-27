import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';

import { Palette } from '@/constants/design';
import { useAuth } from '@/contexts/auth-context';

type AppleProfile = {
  fullName?: string;
  givenName?: string;
  familyName?: string;
};

type AppleAuthResult = {
  error?: string;
  needsOnboarding?: boolean;
};

type AuthWithApple = ReturnType<typeof useAuth> & {
  signInWithApple: (identityToken: string, profile?: AppleProfile) => Promise<AppleAuthResult>;
};

type AppleSignInButtonProps = {
  intent?: 'sign-in' | 'sign-up';
};

function optionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function AppleSignInButtonIOS({ intent = 'sign-in' }: AppleSignInButtonProps) {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();
  const { signInWithApple } = useAuth() as AuthWithApple;

  useEffect(() => {
    let isMounted = true;

    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (isMounted) setIsAvailable(available);
      })
      .catch(() => {
        if (isMounted) setIsAvailable(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAppleSignIn = async () => {
    if (isLoading) return;

    setErrorMessage(undefined);
    setIsLoading(true);

    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        setErrorMessage('تعذر التحقق من حساب Apple. حاول مرة أخرى.');
        return;
      }

      const givenName = optionalText(credential.fullName?.givenName);
      const familyName = optionalText(credential.fullName?.familyName);
      const formattedName = credential.fullName
        ? optionalText(AppleAuthentication.formatFullName(credential.fullName))
        : undefined;
      const fullName = formattedName ?? optionalText([givenName, familyName].filter(Boolean).join(' '));
      const profile = fullName || givenName || familyName
        ? { fullName, givenName, familyName }
        : undefined;

      const result = await signInWithApple(credential.identityToken, profile);

      if (result.error) {
        setErrorMessage(result.error);
        return;
      }

      router.replace(result.needsOnboarding ? '/onboarding' : '/home');
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String(error.code)
          : undefined;

      if (code !== 'ERR_REQUEST_CANCELED') {
        setErrorMessage('لم يكتمل تسجيل الدخول بحساب Apple. حاول مرة أخرى.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAvailable) return null;

  return (
    <View style={styles.container}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={
          intent === 'sign-up'
            ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
            : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
        }
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={14}
        style={styles.appleButton}
        onPress={handleAppleSignIn}
      />

      {isLoading && (
        <View style={styles.statusRow} accessibilityLiveRegion="polite">
          <ActivityIndicator color={Palette.primary} size="small" />
          <Text style={styles.statusText}>جاري تسجيل الدخول بحساب Apple...</Text>
        </View>
      )}

      {!!errorMessage && (
        <Text accessibilityLiveRegion="polite" style={styles.errorText}>
          {errorMessage}
        </Text>
      )}
    </View>
  );
}

export function AppleSignInButton(props: AppleSignInButtonProps) {
  if (Platform.OS !== 'ios') return null;
  return <AppleSignInButtonIOS {...props} />;
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    width: '100%',
  },
  appleButton: {
    width: '100%',
    height: 54,
  },
  statusRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  statusText: {
    color: Palette.inkMuted,
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  errorText: {
    color: Palette.danger,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
});
