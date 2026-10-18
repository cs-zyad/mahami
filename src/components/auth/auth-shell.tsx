import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View,  } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SaduBand } from '@/components/ui/sadu-band';
import { makeStyles } from '@/contexts/theme-context';
import { BackButton } from '@/components/ui/back-button';
import { BrandMark } from '@/components/ui/brand-mark';

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function AuthShell({ title, subtitle, children }: AuthShellProps) {
  const styles = useStyles();
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <BackButton />
            <BrandMark compact />
          </View>
          <View style={styles.heading}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <View style={styles.headingBand}><SaduBand /></View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((P) => ({
  safeArea: { flex: 1, backgroundColor: P.canvas },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 18, paddingBottom: 32 },
  topBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 58,
  },
  heading: { alignItems: 'flex-end', marginBottom: 14 },
  headingBand: { marginBottom: 24 },
  title: {
    color: P.ink,
    fontSize: 34,
    lineHeight: 45,
    fontWeight: '900',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  subtitle: {
    color: P.inkMuted,
    fontSize: 15,
    lineHeight: 25,
    textAlign: 'right',
    writingDirection: 'rtl',
    marginTop: 8,
    maxWidth: 330,
  },
}));
