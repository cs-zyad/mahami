import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { makeStyles } from '@/contexts/theme-context';
import { FormScreen } from '@/components/ui/form-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';

import { useAuth } from '@/contexts/auth-context';

export default function EditProfileScreen() {
  const styles = useStyles();
  const { session, updateProfileName } = useAuth();
  const [name, setName] = useState(String(session?.user.user_metadata.full_name ?? ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const accountContact = session?.user.email || session?.user.phone || '';

  const handleSave = async () => {
    const trimmed = name.trim();
    setError(undefined);

    if (trimmed.length < 2) {
      setError('اكتب اسمًا من حرفين على الأقل.');
      return;
    }

    setLoading(true);
    const result = await updateProfileName(trimmed);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.back();
  };

  return (
    <FormScreen title="تعديل الملف الشخصي" subtitle="حدّث اسمك الظاهر في مهامي.">
      <TextField
        label="الاسم"
        value={name}
        onChangeText={setName}
        placeholder="اسمك الكامل"
        autoCapitalize="words"
        maxLength={60}
        error={error}
      />

      {!!accountContact && (
        <Text style={styles.contact}>الحساب: {accountContact}</Text>
      )}

      <PrimaryButton
        label={loading ? 'جاري الحفظ...' : 'حفظ التعديلات'}
        disabled={loading}
        onPress={() => void handleSave()}
      />
    </FormScreen>
  );
}

const useStyles = makeStyles((P) => ({
  contact: {
    color: P.inkMuted,
    fontSize: 13,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
}));
