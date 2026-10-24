import { FormScreen } from '@/components/ui/form-screen';
import { ThemePicker } from '@/components/ui/theme-picker';

export default function AppearanceScreen() {
  return (
    <FormScreen title="المظهر" subtitle="اختر الثيم اللي يريح عينك.">
      <ThemePicker />
    </FormScreen>
  );
}
