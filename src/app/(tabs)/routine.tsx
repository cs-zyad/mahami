import { router } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/app-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { FloatingAddButton } from '@/components/ui/floating-add-button';
import { RoutineIcon } from '@/components/ui/routine-icon';
import { Palette, Radius, Shadow } from '@/constants/design';
import { useRoutines } from '@/contexts/routines-context';
import { localDateKey, routineStreak, shiftDate } from '@/lib/routine-utils';
import { Routine } from '@/types/routine';

const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

function toArabicDigits(value: string | number) {
  return String(value).replace(/\d/g, (digit) => arabicDigits[Number(digit)]);
}

function formatTime(time: string | null) {
  if (!time) return 'بدون وقت';
  const [hoursText, minutes = '00'] = time.split(':');
  const hours = Number(hoursText);
  const period = hours >= 12 ? 'م' : 'ص';
  const displayHours = hours % 12 || 12;
  return `${toArabicDigits(displayHours)}:${toArabicDigits(minutes)} ${period}`;
}

function RoutineCard({
  routine,
  completed,
  streak,
  onToggle,
  onEdit,
}: {
  routine: Routine;
  completed: boolean;
  streak: number;
  onToggle: () => void;
  onEdit: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: completed }}
      accessibilityLabel={`${routine.title}، ${completed ? 'مكتمل اليوم' : 'غير مكتمل اليوم'}`}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.routineCard,
        completed && styles.routineCardCompleted,
        pressed && styles.pressed,
      ]}>
      <View style={styles.iconTile}>
        <RoutineIcon icon={routine.icon} size={23} />
        {completed && (
          <View style={styles.completedBadge}>
            <AppIcon
              name={{ ios: 'checkmark', android: 'check', web: 'check' }}
              size={10}
              tintColor={Palette.white}
              fallback="✓"
            />
          </View>
        )}
      </View>

      <View style={styles.routineCopy}>
        <Text style={[styles.routineTitle, completed && styles.routineTitleCompleted]} numberOfLines={2}>
          {routine.title}
        </Text>
        <View style={styles.routineMeta}>
          {routine.reminder_enabled && (
            <AppIcon
              name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
              size={13}
              tintColor={Palette.inkMuted}
              fallback="•"
            />
          )}
          <Text style={styles.routineMetaText}>{formatTime(routine.reminder_time)}</Text>
          <View style={styles.metaDot} />
          <Text style={styles.routineMetaText}>
            {routine.repeat_days.length === 7
              ? 'يوميًا'
              : `${toArabicDigits(routine.repeat_days.length)} أيام أسبوعيًا`}
          </Text>
        </View>
      </View>

      <View style={styles.routineActions}>
        <View style={styles.streakBadge}>
          <AppIcon
            name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
            size={13}
            tintColor={Palette.primary}
            fallback="♢"
          />
          <Text style={styles.streakBadgeText}>{toArabicDigits(streak)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`تعديل روتين ${routine.title}`}
          hitSlop={6}
          onPress={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          style={({ pressed }) => [styles.editButton, pressed && styles.editButtonPressed]}>
          <AppIcon
            name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
            size={17}
            tintColor={Palette.primary}
            fallback="✎"
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function RoutineScreen() {
  const {
    routines,
    completions,
    loading,
    syncing,
    lastError,
    toggleRoutineToday,
    refresh,
  } = useRoutines();
  const today = localDateKey();
  const todayWeekday = new Date().getDay();
  const todayRoutines = routines.filter((routine) => routine.repeat_days.includes(todayWeekday));
  const completionKeys = useMemo(
    () => new Set(completions.map((completion) => `${completion.routine_id}:${completion.completed_on}`)),
    [completions],
  );
  const completedToday = todayRoutines.filter((routine) => completionKeys.has(`${routine.id}:${today}`)).length;
  const progress = todayRoutines.length ? Math.round((completedToday / todayRoutines.length) * 100) : 0;
  const bestStreak = routines.reduce(
    (best, routine) => Math.max(best, routineStreak(routine.id, completions, routine.repeat_days)),
    0,
  );
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => shiftDate(new Date(), index - 6)),
    [],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingState}>
          <ActivityIndicator color={Palette.primary} />
          <Text style={styles.loadingText}>جاري تجهيز روتينك...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={(
          <RefreshControl
            refreshing={syncing}
            onRefresh={refresh}
            tintColor={Palette.primary}
            colors={[Palette.primary]}
          />
        )}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>روتيني</Text>
            <Text style={styles.subtitle}>خطوات صغيرة تصنع فرقًا كبيرًا</Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressTop}>
            <View style={styles.progressCopy}>
              <Text style={styles.progressEyebrow}>إنجاز اليوم</Text>
              <Text style={styles.progressTitle}>
                {todayRoutines.length
                  ? completedToday === todayRoutines.length
                    ? 'أنجزت روتينك كاملًا'
                    : `باقي ${toArabicDigits(todayRoutines.length - completedToday)} لتكمل يومك`
                  : routines.length
                    ? 'يوم خفيف بدون روتين'
                    : 'ابدأ بروتين واحد بسيط'}
              </Text>
            </View>
            <View style={styles.progressCircle}>
              <Text style={styles.progressPercent}>{toArabicDigits(progress)}٪</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{toArabicDigits(completedToday)}/{toArabicDigits(todayRoutines.length)}</Text>
              <Text style={styles.statLabel}>مكتمل اليوم</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>🔥 {toArabicDigits(bestStreak)}</Text>
              <Text style={styles.statLabel}>أفضل سلسلة</Text>
            </View>
          </View>
        </View>

        <View style={styles.weekSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHint}>آخر ٧ أيام</Text>
            <Text style={styles.sectionTitle}>استمراريتك</Text>
          </View>
          <View style={styles.weekCard}>
            {weekDays.map((date) => {
              const dateKey = localDateKey(date);
              const isToday = dateKey === today;
              const scheduledRoutines = routines.filter((routine) => routine.repeat_days.includes(date.getDay()));
              const completionCount = scheduledRoutines.filter((routine) =>
                completionKeys.has(`${routine.id}:${dateKey}`),
              ).length;
              const fullyCompleted = scheduledRoutines.length > 0 && completionCount === scheduledRoutines.length;
              const weekday = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { weekday: 'short' })
                .format(date)
                .replace('،', '');

              return (
                <View key={dateKey} style={styles.dayColumn}>
                  <Text style={[styles.dayName, isToday && styles.dayNameToday]}>{weekday}</Text>
                  <View style={[
                    styles.dayBubble,
                    isToday && styles.dayBubbleToday,
                    fullyCompleted && styles.dayBubbleCompleted,
                  ]}>
                    {fullyCompleted ? (
                      <AppIcon
                        name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                        size={14}
                        tintColor={Palette.white}
                        fallback="✓"
                      />
                    ) : (
                      <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
                        {toArabicDigits(date.getDate())}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {!!lastError && (
          <View style={styles.syncBanner}>
            <AppIcon
              name={{ ios: 'icloud.slash', android: 'cloud_off', web: 'cloud_off' }}
              size={18}
              tintColor={Palette.danger}
              fallback="!"
            />
            <Text style={styles.syncBannerText}>{lastError}</Text>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHint}>{toArabicDigits(completedToday)} من {toArabicDigits(todayRoutines.length)}</Text>
          <Text style={styles.sectionTitle}>روتين اليوم</Text>
        </View>

        {routines.length === 0 ? (
          <>
            <EmptyState
              symbol="↻"
              title="ابدأ بعادة واحدة"
              description="اختر شيئًا صغيرًا تقدر تكرره كل يوم، وسنحسب استمراريتك من أول إنجاز."
              actionLabel="إضافة أول روتين"
              onAction={() => router.push('/add-routine')}
            />
            <View style={styles.tipCard}>
              <View style={styles.tipIcon}>
                <AppIcon
                  name={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                  size={19}
                  tintColor={Palette.primary}
                  fallback="✦"
                />
              </View>
              <View style={styles.tipCopy}>
                <Text style={styles.tipTitle}>ابدأ بشيء سهل جدًا</Text>
                <Text style={styles.tipText}>خمس دقائق يوميًا أفضل من هدف كبير يصعب الاستمرار عليه.</Text>
              </View>
            </View>
          </>
        ) : todayRoutines.length === 0 ? (
          <EmptyState
            symbol="✓"
            title="لا يوجد روتين اليوم"
            description="اليوم متاح لك. يمكنك إضافة روتين جديد أو العودة غدًا."
            actionLabel="إضافة روتين"
            onAction={() => router.push('/add-routine')}
            compact
          />
        ) : (
          <View style={styles.routinesList}>
            {todayRoutines.map((routine) => (
              <RoutineCard
                key={routine.id}
                routine={routine}
                completed={completionKeys.has(`${routine.id}:${today}`)}
                streak={routineStreak(routine.id, completions, routine.repeat_days)}
                onToggle={() => void toggleRoutineToday(routine.id)}
                onEdit={() => router.push({ pathname: '/add-routine', params: { routineId: routine.id } })}
              />
            ))}
          </View>
        )}
      </ScrollView>
      <FloatingAddButton
        label="روتين جديد"
        accessibilityLabel="إضافة روتين جديد"
        onPress={() => router.push('/add-routine')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.canvas },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 150 },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Palette.inkMuted, fontSize: 13, writingDirection: 'rtl' },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  headerCopy: { alignItems: 'flex-end' },
  title: { color: Palette.ink, fontSize: 30, fontWeight: '900', writingDirection: 'rtl' },
  subtitle: { color: Palette.inkMuted, fontSize: 12, marginTop: 3, writingDirection: 'rtl' },
  progressCard: {
    marginTop: 24,
    borderRadius: Radius.large,
    backgroundColor: Palette.primary,
    padding: 20,
    ...Shadow.card,
  },
  progressTop: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  progressCopy: { flex: 1, alignItems: 'flex-end' },
  progressEyebrow: { color: '#DCCABC', fontSize: 11, fontWeight: '800', writingDirection: 'rtl' },
  progressTitle: { color: Palette.white, fontSize: 19, fontWeight: '900', marginTop: 5, textAlign: 'right', writingDirection: 'rtl' },
  progressCircle: {
    width: 68,
    height: 68,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.11)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: { color: Palette.white, fontSize: 19, fontWeight: '900', writingDirection: 'rtl' },
  progressTrack: { height: 7, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.15)', marginTop: 20, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: Radius.pill, backgroundColor: '#F1D2B5' },
  statsRow: { minHeight: 53, marginTop: 15, flexDirection: 'row-reverse', alignItems: 'center' },
  statItem: { flex: 1, alignItems: 'center', gap: 3 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 31, backgroundColor: 'rgba(255,255,255,0.2)' },
  statValue: { color: Palette.white, fontSize: 14, fontWeight: '900', writingDirection: 'rtl' },
  statLabel: { color: '#DCCABC', fontSize: 10, fontWeight: '700', writingDirection: 'rtl' },
  weekSection: { marginTop: 27 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 26, marginBottom: 12 },
  sectionTitle: { color: Palette.ink, fontSize: 19, fontWeight: '900', writingDirection: 'rtl' },
  sectionHint: { color: Palette.inkMuted, fontSize: 11, fontWeight: '700', writingDirection: 'rtl' },
  weekCard: {
    minHeight: 96,
    borderRadius: Radius.large,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    paddingHorizontal: 11,
    paddingVertical: 14,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  dayColumn: { alignItems: 'center', gap: 8 },
  dayName: { color: Palette.inkMuted, fontSize: 9, fontWeight: '700' },
  dayNameToday: { color: Palette.primary, fontWeight: '900' },
  dayBubble: { width: 35, height: 35, borderRadius: 13, backgroundColor: Palette.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  dayBubbleToday: { borderWidth: 1.5, borderColor: Palette.primary, backgroundColor: Palette.surface },
  dayBubbleCompleted: { borderColor: Palette.success, backgroundColor: Palette.success },
  dayNumber: { color: Palette.inkMuted, fontSize: 11, fontWeight: '800' },
  dayNumberToday: { color: Palette.primary },
  syncBanner: {
    minHeight: 58,
    marginTop: 18,
    borderRadius: Radius.medium,
    backgroundColor: '#F4E5E1',
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  syncBannerText: { flex: 1, color: Palette.danger, fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  routinesList: { gap: 11 },
  routineCard: {
    minHeight: 86,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surface,
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  routineCardCompleted: { borderColor: '#C8D9CB', backgroundColor: '#F5F8F4' },
  iconTile: {
    width: 50,
    height: 50,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Palette.line,
    backgroundColor: Palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadge: {
    position: 'absolute',
    left: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Palette.surface,
    backgroundColor: Palette.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineCopy: { flex: 1, alignItems: 'flex-end', gap: 7 },
  routineTitle: { color: Palette.ink, fontSize: 15, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  routineTitleCompleted: { color: Palette.success, textDecorationLine: 'line-through' },
  routineMeta: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  routineMetaText: { color: Palette.inkMuted, fontSize: 10, fontWeight: '700', writingDirection: 'rtl' },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Palette.line },
  routineActions: { alignItems: 'center', gap: 7 },
  streakBadge: { minWidth: 49, height: 30, borderRadius: 11, backgroundColor: '#F5E7D4', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 8 },
  streakBadgeText: { color: Palette.primary, fontSize: 11, fontWeight: '900', writingDirection: 'rtl' },
  editButton: {
    width: 38,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E4D2BD',
    backgroundColor: Palette.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonPressed: { opacity: 0.65, transform: [{ scale: 0.94 }] },
  tipCard: { minHeight: 76, marginTop: 14, borderRadius: Radius.medium, backgroundColor: Palette.accentSoft, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  tipIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.52)', alignItems: 'center', justifyContent: 'center' },
  tipCopy: { flex: 1, alignItems: 'flex-end', gap: 4 },
  tipTitle: { color: Palette.primary, fontSize: 13, fontWeight: '900', writingDirection: 'rtl' },
  tipText: { color: Palette.inkMuted, fontSize: 10, lineHeight: 17, textAlign: 'right', writingDirection: 'rtl' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
