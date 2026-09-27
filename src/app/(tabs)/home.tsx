import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/app-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { FloatingAddButton } from '@/components/ui/floating-add-button';
import { RoutineIcon } from '@/components/ui/routine-icon';
import { Palette, Radius, Shadow } from '@/constants/design';
import { useAuth } from '@/contexts/auth-context';
import { useRoutines } from '@/contexts/routines-context';
import { useTasks } from '@/contexts/tasks-context';
import { localDateKey, routineStreak } from '@/lib/routine-utils';
import { taskCategoryOption } from '@/lib/task-categories';
import { isTaskOverdue, taskDescriptionPreview, taskTimingLabel } from '@/lib/task-utils';

function sameLocalDay(value: string | null, date = new Date()) {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime())
    && parsed.getFullYear() === date.getFullYear()
    && parsed.getMonth() === date.getMonth()
    && parsed.getDate() === date.getDate();
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      {!!action && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={action}
          hitSlop={10}
          onPress={onAction}
          style={({ pressed }) => pressed && styles.actionPressed}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      )}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { session } = useAuth();
  const { tasks, toggleTask } = useTasks();
  const { routines, completions, toggleRoutineToday } = useRoutines();
  const [addOpen, setAddOpen] = useState(false);
  const now = new Date();
  const today = localDateKey(now);
  const pendingTasks = tasks.filter((task) => task.status === 'pending');
  const todayPendingTasks = pendingTasks.filter((task) => !task.due_at || sameLocalDay(task.due_at, now));
  const completedTodayTasks = tasks.filter(
    (task) => task.status === 'completed' && sameLocalDay(task.completed_at, now),
  );
  const todayTasks = [...todayPendingTasks, ...completedTodayTasks].slice(0, 5);
  const remaining = todayPendingTasks.length;
  const completed = completedTodayTasks.length;
  const todayTotal = remaining + completed;
  const progress = `${todayTotal ? Math.round((completed / todayTotal) * 100) : 0}%` as `${number}%`;
  const overdueCount = pendingTasks.filter((task) => isTaskOverdue(task, now)).length;
  const categoryFolders = useMemo(() => {
    const folders = new Map<string, { name: string; total: number; pending: number }>();

    tasks.forEach((task) => {
      const name = task.category.trim() || 'غير مصنف';
      const current = folders.get(name) ?? { name, total: 0, pending: 0 };
      current.total += 1;
      if (task.status === 'pending') current.pending += 1;
      folders.set(name, current);
    });

    return [...folders.values()];
  }, [tasks]);
  const priorityItems = [
    {
      key: 'important_urgent',
      label: 'مهم وعاجل',
      count: pendingTasks.filter((task) => task.important && task.urgent).length,
      color: '#A84F46',
      tint: '#F6E3E0',
    },
    {
      key: 'important',
      label: 'مهم غير عاجل',
      count: pendingTasks.filter((task) => task.important && !task.urgent).length,
      color: '#A66A32',
      tint: '#F6E8D6',
    },
    {
      key: 'later',
      label: 'غير مهم وغير عاجل',
      count: pendingTasks.filter((task) => !task.important && !task.urgent).length,
      color: '#766B62',
      tint: '#EEE9E2',
    },
    {
      key: 'completed',
      label: 'المنتهية',
      count: tasks.filter((task) => task.status === 'completed').length,
      color: Palette.success,
      tint: Palette.successSoft,
    },
  ];
  const todayRoutines = routines.filter((routine) => routine.repeat_days.includes(now.getDay()));
  const completionKeys = useMemo(
    () => new Set(completions.map((completion) => `${completion.routine_id}:${completion.completed_on}`)),
    [completions],
  );
  const displayName = session?.user.user_metadata.full_name?.trim().split(' ')[0] || 'صديقنا';
  const userInitial = displayName.charAt(0);

  const dateLabel = useMemo(
    () => new Intl.DateTimeFormat('ar-SA', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()),
    [],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="فتح الحساب"
            onPress={() => router.push('/profile')}
            style={({ pressed }) => [styles.avatar, pressed && styles.actionPressed]}>
            <Text style={styles.avatarText}>{userInitial}</Text>
          </Pressable>
          <View style={styles.greeting}>
            <Text style={styles.hello}>صباح الخير، {displayName} 👋</Text>
            <Text style={styles.date}>{dateLabel}</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="فتح مهام اليوم"
          onPress={() => router.push({ pathname: '/tasks', params: { view: 'today' } })}
          style={({ pressed }) => [styles.dayCard, pressed && styles.dayCardPressed]}>
          <View style={styles.dayCardTop}>
            <View style={styles.remainingPill}><Text style={styles.remainingPillText}>{remaining} متبقية</Text></View>
            <View style={styles.dayCopy}>
              <Text style={styles.dayEyebrow}>مساحتك لليوم</Text>
              <Text style={styles.dayTitle}>{todayTotal ? 'خطوة واضحة في كل مرة.' : 'مساحتك جاهزة لأول مهمة.'}</Text>
            </View>
          </View>
          <View style={styles.progressMeta}>
            <Text style={styles.progressCount}>{todayTotal ? `أنجزت ${completed} من ${todayTotal}` : 'ابدأ بإضافة مهمتك الأولى'}</Text>
            <Text style={styles.progressPercent}>{progress}</Text>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: progress }]} /></View>
          <View style={styles.dayCardAction}>
            <AppIcon
              name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
              size={15}
              tintColor="#EEDFD3"
              fallback="‹"
            />
            <Text style={styles.dayCardActionText}>فتح مهام اليوم</Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="إضافة مهام بالصوت أو الصورة"
          onPress={() => router.push('/ai-tasks')}
          style={({ pressed }) => [styles.smartCaptureCard, pressed && styles.cardPressed]}>
          <View style={styles.smartCaptureArrow}>
            <AppIcon
              name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
              size={16}
              tintColor={Palette.primary}
              fallback="‹"
            />
          </View>
          <View style={styles.smartCaptureCopy}>
            <View style={styles.smartCaptureTitleRow}>
              <Text style={styles.smartCaptureBadge}>جديد</Text>
              <Text style={styles.smartCaptureTitle}>التقاط مهامي</Text>
            </View>
            <Text style={styles.smartCaptureText}>قل مهمتك بصوتك أو حوّل صورة إلى مهام مرتبة.</Text>
          </View>
          <View style={styles.smartCaptureIcon}>
            <AppIcon
              name={{ ios: 'text.viewfinder', android: 'document_scanner', web: 'document_scanner' }}
              size={23}
              tintColor={Palette.primary}
              fallback="▣"
            />
          </View>
        </Pressable>

        {overdueCount > 0 && <Pressable onPress={() => router.push({ pathname: '/tasks', params: { view: 'overdue' } })} style={styles.overdueBanner}>
          <AppIcon
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            size={18}
            tintColor={Palette.danger}
            fallback="‹"
          />
          <View style={styles.overdueCopy}>
            <Text style={styles.overdueTitle}>لديك مهمة متأخرة</Text>
            <Text style={styles.overdueText}>راجعها الآن أو حدّد لها موعدًا جديدًا.</Text>
          </View>
          <View style={styles.overdueIcon}>
            <AppIcon
              name={{ ios: 'clock.badge.exclamationmark.fill', android: 'alarm_on', web: 'alarm_on' }}
              size={21}
              tintColor={Palette.danger}
              fallback="!"
            />
          </View>
        </Pressable>}

        <SectionHeader
          title="الأولوية"
          action="عرض كل المهام"
          onAction={() => router.push({ pathname: '/tasks', params: { view: 'all' } })}
        />
        <View style={styles.priorityGrid}>
          {priorityItems.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}، ${item.count} مهام`}
              onPress={() => router.push({ pathname: '/tasks', params: { view: item.key } })}
              style={({ pressed }) => [
                styles.priorityCard,
                { backgroundColor: item.tint, borderColor: `${item.color}30` },
                pressed && styles.cardPressed,
              ]}>
              <View style={[styles.priorityDot, { backgroundColor: 'rgba(255,255,255,0.48)' }]}>
                <View style={[styles.priorityDotInner, { backgroundColor: item.color }]} />
              </View>
              <Text style={styles.priorityCount}>{item.count}</Text>
              <Text style={[styles.priorityLabel, { color: item.color }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        <SectionHeader
          title="مهام اليوم"
          action="عرض كل المهام"
          onAction={() => router.push({ pathname: '/tasks', params: { view: 'all' } })}
        />
        {todayTasks.length > 0 ? <View style={styles.listCard}>
          {todayTasks.map((task, index) => {
            const taskCompleted = task.status === 'completed';
            const taskOverdue = isTaskOverdue(task, now);
            const description = taskDescriptionPreview(task.description);
            return (
              <Pressable
                key={task.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: taskCompleted }}
                onPress={() => void toggleTask(task.id)}
                style={[styles.taskRow, index < todayTasks.length - 1 && styles.rowBorder]}>
                <View style={styles.taskCopy}>
                  <Text style={[styles.taskTitle, taskCompleted && styles.completedText]}>{task.title}</Text>
                  {!!description && (
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.taskDescription}>
                      {description}
                    </Text>
                  )}
                  <Text style={[styles.taskMeta, taskOverdue && styles.overdueMeta]}>{taskTimingLabel(task, now)}</Text>
                </View>
                <View style={[styles.checkbox, taskCompleted && styles.checkboxCompleted]}>
                  {taskCompleted && <Text style={styles.checkText}>✓</Text>}
                </View>
              </Pressable>
            );
          })}
        </View> : (
          <EmptyState
            compact
            symbol="✓"
            title="ما عندك مهام حتى الآن"
            description="أضف أول مهمة، وستظهر هنا بياناتك أنت فقط بدون أمثلة أو بيانات جاهزة."
            actionLabel="إضافة أول مهمة"
            onAction={() => router.push('/add-task')}
          />
        )}

        <SectionHeader
          title="روتين اليوم"
          action="عرض كل الروتين"
          onAction={() => router.push('/routine')}
        />
        {todayRoutines.length > 0 ? <View style={styles.listCard}>
          {todayRoutines.map((item, index) => {
            const routineCompleted = completionKeys.has(`${item.id}:${today}`);
            return (
              <Pressable
                key={item.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: routineCompleted }}
                onPress={() => void toggleRoutineToday(item.id)}
                style={[styles.routineRow, index < todayRoutines.length - 1 && styles.rowBorder]}>
                <View style={styles.streakPill}>
                  <AppIcon
                    name={{ ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' }}
                    size={12}
                    tintColor={Palette.primary}
                    fallback="♢"
                  />
                  <Text style={styles.streakText}>{routineStreak(item.id, completions, item.repeat_days)}</Text>
                </View>
                <Text style={[styles.routineTitle, routineCompleted && styles.completedText]}>{item.title}</Text>
                <View style={styles.homeRoutineIcon}>
                  <RoutineIcon icon={item.icon} size={17} />
                </View>
                <View style={[styles.checkbox, routineCompleted && styles.checkboxCompleted]}>
                  {routineCompleted && <Text style={styles.checkText}>✓</Text>}
                </View>
              </Pressable>
            );
          })}
        </View> : (
          <EmptyState
            compact
            symbol="↻"
            title="لا يوجد روتين بعد"
            description="ابدأ بعادة يومية بسيطة وابنِ أول سلسلة إنجاز."
            actionLabel="إضافة أول روتين"
            onAction={() => router.push('/add-routine')}
          />
        )}

        <SectionHeader
          title="الأقسام"
          action="إضافة مهمة"
          onAction={() => router.push('/add-task')}
        />
        {categoryFolders.length > 0 ? (
          <View style={styles.categoryGrid}>
            {categoryFolders.map((folder, index) => (
              <Pressable
                key={folder.name}
                accessibilityRole="button"
                accessibilityLabel={`قسم ${folder.name}، ${folder.total} مهام`}
                onPress={() => router.push({ pathname: '/tasks', params: { category: folder.name } })}
                style={({ pressed }) => [
                  styles.categoryFolder,
                  index % 3 === 1 && styles.categoryFolderWarm,
                  index % 3 === 2 && styles.categoryFolderMuted,
                  pressed && styles.cardPressed,
                ]}>
                <View style={styles.categoryFolderTop}>
                  <Text style={styles.categoryFolderCount}>{folder.total}</Text>
                  <View style={styles.categoryFolderIcon}>
                    <AppIcon
                      name={taskCategoryOption(folder.name).icon}
                      size={24}
                      tintColor={Palette.primary}
                      fallback={taskCategoryOption(folder.name).fallback}
                    />
                  </View>
                </View>
                <Text numberOfLines={1} style={styles.categoryFolderName}>{folder.name}</Text>
                <Text style={styles.categoryFolderMeta}>
                  {folder.pending ? `${folder.pending} متبقية` : 'تم إنجاز جميع المهام'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Pressable
            onPress={() => router.push('/add-task')}
            style={({ pressed }) => [styles.emptyCategories, pressed && styles.cardPressed]}>
            <View style={styles.emptyCategoryIcon}>
              <AppIcon
                name={{ ios: 'folder.badge.plus', android: 'create_new_folder', web: 'create_new_folder' }}
                size={24}
                tintColor={Palette.primary}
                fallback="+"
              />
            </View>
            <View style={styles.emptyCategoryCopy}>
              <Text style={styles.emptyCategoryTitle}>أنشئ أول قسم مع مهمتك</Text>
              <Text style={styles.emptyCategoryText}>اختر تصنيفًا أو أضف تصنيفك الخاص عند إنشاء المهمة.</Text>
            </View>
          </Pressable>
        )}
      </ScrollView>

      <FloatingAddButton
        label="إضافة جديدة"
        accessibilityLabel="إضافة مهمة أو روتين"
        onPress={() => setAddOpen(true)}
      />

      <Modal transparent visible={addOpen} animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setAddOpen(false)}>
          <Pressable style={styles.addSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>وش حاب تضيف؟</Text>
            <Text style={styles.sheetSubtitle}>اختر النوع، وخلك على نفس تركيزك.</Text>
            <View style={styles.addChoices}>
              <Pressable
                style={styles.addChoice}
                onPress={() => {
                  setAddOpen(false);
                  router.push('/add-task');
                }}>
                <View style={styles.addChoiceIcon}><Text style={styles.addChoiceIconText}>✓</Text></View>
                <View style={styles.addChoiceCopy}>
                  <Text style={styles.addChoiceTitle}>مهمة جديدة</Text>
                  <Text style={styles.addChoiceText}>موعد، أولوية وتذكير</Text>
                </View>
              </Pressable>
              <Pressable
                style={styles.addChoice}
                onPress={() => {
                  setAddOpen(false);
                  router.push('/add-routine');
                }}>
                <View style={styles.addChoiceIcon}><Text style={styles.addChoiceIconText}>↻</Text></View>
                <View style={styles.addChoiceCopy}>
                  <Text style={styles.addChoiceTitle}>روتين يومي</Text>
                  <Text style={styles.addChoiceText}>عادة متكررة مع Streak</Text>
                </View>
              </Pressable>
              <Pressable
                style={[styles.addChoice, styles.smartAddChoice]}
                onPress={() => {
                  setAddOpen(false);
                  router.push('/ai-tasks');
                }}>
                <View style={styles.addChoiceIcon}>
                  <AppIcon
                    name={{ ios: 'text.viewfinder', android: 'document_scanner', web: 'document_scanner' }}
                    size={22}
                    tintColor={Palette.primary}
                    fallback="▣"
                  />
                </View>
                <View style={styles.addChoiceCopy}>
                  <View style={styles.addChoiceTitleLine}>
                    <Text style={styles.miniPlusBadge}>بلس</Text>
                    <Text style={styles.addChoiceTitle}>مهمة بالصوت أو الصورة</Text>
                  </View>
                  <Text style={styles.addChoiceText}>استخرج عدة مهام دفعة واحدة</Text>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.canvas },
  content: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 126 },
  topBar: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  avatar: { width: 44, height: 44, borderRadius: 16, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Palette.primary, fontSize: 17, fontWeight: '900' },
  greeting: { alignItems: 'flex-start' },
  hello: { color: Palette.ink, fontSize: 20, fontWeight: '900', writingDirection: 'rtl' },
  date: { color: Palette.inkMuted, fontSize: 12, marginTop: 4, writingDirection: 'rtl' },
  dayCard: { backgroundColor: Palette.primary, borderRadius: Radius.large, padding: 20, ...Shadow.card },
  dayCardPressed: { backgroundColor: Palette.primaryPressed, transform: [{ scale: 0.99 }] },
  dayCardTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  dayCopy: { alignItems: 'flex-start', flex: 1 },
  dayEyebrow: { color: '#D9C7B7', fontSize: 12, fontWeight: '700', writingDirection: 'rtl' },
  dayTitle: { color: Palette.white, fontSize: 19, fontWeight: '900', marginTop: 5, textAlign: 'right', writingDirection: 'rtl' },
  remainingPill: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 11, paddingVertical: 7, borderRadius: Radius.pill },
  remainingPillText: { color: Palette.white, fontSize: 11, fontWeight: '800', writingDirection: 'rtl' },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  progressCount: { color: '#E9DCD1', fontSize: 11, writingDirection: 'rtl' },
  progressPercent: { color: Palette.white, fontSize: 11, fontWeight: '900' },
  progressTrack: { height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.14)', marginTop: 9, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#E7B58F' },
  dayCardAction: { flexDirection: 'row-reverse', alignItems: 'center', alignSelf: 'flex-start', gap: 3, marginTop: 13 },
  dayCardActionText: { color: '#EEDFD3', fontSize: 10, fontWeight: '800', writingDirection: 'rtl' },
  smartCaptureCard: { minHeight: 92, borderRadius: Radius.medium, borderWidth: 1, borderColor: '#DCC4AF', backgroundColor: '#F0E2D3', padding: 14, marginTop: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 11, ...Shadow.card },
  smartCaptureArrow: { width: 31, height: 31, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
  smartCaptureCopy: { flex: 1, alignItems: 'flex-start' },
  smartCaptureTitleRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  smartCaptureTitle: { color: Palette.ink, fontSize: 16, fontWeight: '900', writingDirection: 'rtl' },
  smartCaptureBadge: { color: Palette.white, fontSize: 8, fontWeight: '900', backgroundColor: Palette.primary, borderRadius: Radius.pill, paddingHorizontal: 7, paddingVertical: 4, writingDirection: 'rtl' },
  smartCaptureText: { color: Palette.inkMuted, fontSize: 10, marginTop: 5, textAlign: 'right', writingDirection: 'rtl' },
  smartCaptureIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center' },
  overdueBanner: { minHeight: 78, backgroundColor: '#F6E5E0', borderRadius: Radius.medium, marginTop: 16, padding: 14, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  overdueCopy: { flex: 1, alignItems: 'flex-start' },
  overdueTitle: { color: Palette.danger, fontSize: 14, fontWeight: '900', writingDirection: 'rtl' },
  overdueText: { color: '#8A625D', fontSize: 11, marginTop: 4, textAlign: 'right', writingDirection: 'rtl' },
  overdueIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#F0CFC8', alignItems: 'center', justifyContent: 'center' },
  sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 13 },
  sectionTitle: { color: Palette.ink, fontSize: 19, fontWeight: '900', writingDirection: 'rtl' },
  sectionAction: { color: Palette.primary, fontSize: 12, fontWeight: '800', writingDirection: 'rtl' },
  actionPressed: { opacity: 0.55 },
  priorityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  priorityCard: { width: '48.5%', minHeight: 112, borderRadius: Radius.medium, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  priorityDot: { width: 25, height: 25, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  priorityDotInner: { width: 8, height: 8, borderRadius: 4 },
  priorityCount: { color: Palette.ink, fontSize: 24, fontWeight: '900', marginTop: 7 },
  priorityLabel: { minHeight: 30, fontSize: 10, lineHeight: 14, fontWeight: '900', textAlign: 'center', writingDirection: 'rtl' },
  cardPressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  listCard: { backgroundColor: Palette.surface, borderRadius: Radius.large, paddingHorizontal: 16, ...Shadow.card },
  taskRow: { minHeight: 75, flexDirection: 'row-reverse', alignItems: 'center', gap: 13 },
  taskCopy: { flex: 1, alignItems: 'flex-start' },
  taskTitle: { color: Palette.ink, fontSize: 14, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  taskDescription: { color: Palette.inkMuted, fontSize: 11, lineHeight: 16, marginTop: 4, textAlign: 'right', writingDirection: 'rtl' },
  taskMeta: { color: Palette.inkMuted, fontSize: 11, marginTop: 5, writingDirection: 'rtl' },
  overdueMeta: { color: Palette.danger, fontWeight: '800' },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Palette.line },
  checkbox: { width: 27, height: 27, borderRadius: 9, borderWidth: 1.5, borderColor: Palette.line, alignItems: 'center', justifyContent: 'center' },
  checkboxCompleted: { borderColor: Palette.success, backgroundColor: Palette.success },
  checkText: { color: Palette.white, fontSize: 15, fontWeight: '900' },
  completedText: { color: Palette.inkMuted, textDecorationLine: 'line-through' },
  routineRow: { minHeight: 68, flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  routineTitle: { flex: 1, color: Palette.ink, fontSize: 14, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  streakPill: { backgroundColor: '#F6E7D3', borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakText: { color: '#9B632F', fontSize: 10, fontWeight: '800', writingDirection: 'rtl' },
  homeRoutineIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: Palette.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryFolder: { width: '48.5%', minHeight: 128, borderRadius: Radius.medium, borderWidth: 1, borderColor: '#DEC8B4', backgroundColor: '#F2E4D5', padding: 14, justifyContent: 'space-between' },
  categoryFolderWarm: { borderColor: '#E7D2BA', backgroundColor: '#F8EDDE' },
  categoryFolderMuted: { borderColor: '#DCD5CB', backgroundColor: '#EEEAE4' },
  categoryFolderTop: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
  categoryFolderIcon: { width: 44, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' },
  categoryFolderCount: { minWidth: 27, height: 27, borderRadius: Radius.pill, backgroundColor: 'rgba(109,73,53,0.1)', color: Palette.primary, fontSize: 11, fontWeight: '900', textAlign: 'center', textAlignVertical: 'center', lineHeight: 27 },
  categoryFolderName: { color: Palette.ink, fontSize: 15, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl', marginTop: 12 },
  categoryFolderMeta: { color: Palette.inkMuted, fontSize: 10, textAlign: 'right', writingDirection: 'rtl', marginTop: 4 },
  emptyCategories: { minHeight: 92, borderRadius: Radius.medium, borderWidth: 1, borderStyle: 'dashed', borderColor: Palette.accent, backgroundColor: '#FAF4EC', padding: 15, flexDirection: 'row', alignItems: 'center', gap: 13 },
  emptyCategoryIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  emptyCategoryCopy: { flex: 1, alignItems: 'flex-start' },
  emptyCategoryTitle: { color: Palette.ink, fontSize: 14, fontWeight: '900', writingDirection: 'rtl' },
  emptyCategoryText: { color: Palette.inkMuted, fontSize: 10, lineHeight: 17, textAlign: 'right', writingDirection: 'rtl', marginTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(46,36,29,0.34)', justifyContent: 'flex-end' },
  addSheet: { backgroundColor: Palette.canvas, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 34 },
  sheetHandle: { width: 42, height: 5, borderRadius: 3, backgroundColor: Palette.line, alignSelf: 'center', marginBottom: 21 },
  sheetTitle: { color: Palette.ink, fontSize: 24, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  sheetSubtitle: { color: Palette.inkMuted, fontSize: 13, textAlign: 'right', writingDirection: 'rtl', marginTop: 5 },
  addChoices: { gap: 12, marginTop: 22 },
  addChoice: { minHeight: 84, backgroundColor: Palette.surface, borderRadius: Radius.medium, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 13 },
  smartAddChoice: { borderWidth: 1, borderColor: '#DCC4AF', backgroundColor: '#FBF4EC' },
  addChoiceIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  addChoiceIconText: { color: Palette.primary, fontSize: 22, fontWeight: '900' },
  addChoiceCopy: { alignItems: 'flex-start' },
  addChoiceTitleLine: { flexDirection: 'row-reverse', alignItems: 'center', gap: 7 },
  miniPlusBadge: { color: Palette.white, fontSize: 8, fontWeight: '900', backgroundColor: Palette.primary, borderRadius: Radius.pill, paddingHorizontal: 7, paddingVertical: 3, writingDirection: 'rtl' },
  addChoiceTitle: { color: Palette.ink, fontSize: 15, fontWeight: '900', writingDirection: 'rtl' },
  addChoiceText: { color: Palette.inkMuted, fontSize: 11, marginTop: 4, writingDirection: 'rtl' },
});
