import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/ui/back-button';
import { Palette } from '@/constants/design';

export function FormScreen({
  title,
  subtitle,
  children,
  showBack = true,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  showBack?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {showBack && (
            <View style={styles.topBar}>
              <BackButton fallbackHref="/home" />
            </View>
          )}
          <View style={styles.headerCopy}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.canvas },
  keyboard: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 30 },
  topBar: { flexDirection: 'row', marginBottom: 24 },
  headerCopy: { alignItems: 'flex-start', marginBottom: 30 },
  title: { color: Palette.ink, fontSize: 29, fontWeight: '900', writingDirection: 'rtl' },
  subtitle: { color: Palette.inkMuted, fontSize: 12, marginTop: 4, writingDirection: 'rtl' },
});
