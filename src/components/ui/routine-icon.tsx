import { ColorValue } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { Palette } from '@/constants/design';

export const routineIconOptions = [
  { key: 'sparkles', label: 'عام', ios: 'sparkles', android: 'auto_awesome', fallback: '✦' },
  { key: 'book', label: 'قراءة', ios: 'book.closed.fill', android: 'menu_book', fallback: '▤' },
  { key: 'faith', label: 'عبادة', ios: 'moon.stars.fill', android: 'nights_stay', fallback: '☾' },
  { key: 'water', label: 'ماء', ios: 'drop.fill', android: 'water_drop', fallback: '◆' },
  { key: 'walk', label: 'مشي', ios: 'figure.walk', android: 'directions_walk', fallback: '↗' },
  { key: 'sport', label: 'رياضة', ios: 'dumbbell.fill', android: 'fitness_center', fallback: '▬' },
  { key: 'calm', label: 'هدوء', ios: 'figure.mind.and.body', android: 'self_improvement', fallback: '○' },
  { key: 'medicine', label: 'دواء', ios: 'pills.fill', android: 'medication', fallback: '+' },
  { key: 'morning', label: 'صباح', ios: 'sun.max.fill', android: 'light_mode', fallback: '☼' },
  { key: 'night', label: 'مساء', ios: 'moon.fill', android: 'dark_mode', fallback: '◐' },
  { key: 'notes', label: 'كتابة', ios: 'note.text', android: 'edit_note', fallback: '≡' },
  { key: 'home', label: 'منزل', ios: 'house.fill', android: 'home', fallback: '⌂' },
] as const;

export type RoutineIconKey = typeof routineIconOptions[number]['key'];

export function RoutineIcon({
  icon,
  size = 22,
  color = Palette.primary,
}: {
  icon: string;
  size?: number;
  color?: ColorValue;
}) {
  const selectedIcon = routineIconOptions.find((option) => option.key === icon) ?? routineIconOptions[0];

  return (
    <AppIcon
      name={{ ios: selectedIcon.ios, android: selectedIcon.android, web: selectedIcon.android }}
      size={size}
      tintColor={color}
      fallback={selectedIcon.fallback}
    />
  );
}
