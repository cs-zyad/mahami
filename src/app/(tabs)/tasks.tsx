import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppIcon } from '@/components/ui/app-icon';
import { EmptyState } from '@/components/ui/empty-state';
import { FloatingAddButton } from '@/components/ui/floating-add-button';
import { Palette, Radius, Shadow } from '@/constants/design';
import { useTasks } from '@/contexts/tasks-context';
import { isTaskInTodayList, isTaskOverdue, isTaskUpcoming, taskCountdown, TaskCountdown, taskDescriptionPreview, taskPriorityColor, taskTimeLabel } from '@/lib/task-utils';

type TaskFilter =
  | 'الكل'
  | 'اليوم'
  | 'القادمة'
  | 'المتأخرة'
  | 'مهم وعاجل'
  | 'مهم غير عاجل'
  | 'غير مهم وغير عاجل'
  | 'المنتهية';

const primaryFilters: TaskFilter[] = [
  'اليوم',
  'القادمة',
  'المتأخرة',
  'الكل',
];

const detailedFilters: TaskFilter[] = [
  'مهم وعاجل',
  'مهم غير عاجل',
  'غير مهم وغير عاجل',
  'المنتهية',
];

const homeViewFilters: Record<string, TaskFilter> = {
  all: 'الكل',
  today: 'اليوم',
  overdue: 'المتأخرة',
  important_urgent: 'مهم وعاجل',
  important: 'مهم غير عاجل',
  later: 'غير مهم وغير عاجل',
  completed: 'المنتهية',
};

export default function TasksScreen() {
  const params = useLocalSearchParams<{ view?: string | string[]; category?: string | string[] }>();
  const requestedView = Array.isArray(params.view) ? params.view[0] : params.view;
  const requestedCategory = Array.isArray(params.category) ? params.category[0] : params.category;
  const { tasks, loading, syncing, lastError, refresh, toggleTask } = useTasks();
  const [filter, setFilter] = useState<TaskFilter>('اليوم');
  const [activeCategory, setActiveCategory] = useState<string>();
  const [selectedDay, setSelectedDay] = useState<string>();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [filterOpen, setFilterOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    setActiveCategory(requestedCategory || undefined);
    const requestedFilter = requestedView ? homeViewFilters[requestedView] : undefined;
    if (requestedFilter) setFilter(requestedFilter);
    void refresh();
  }, [refresh, requestedCategory, requestedView]));

  // Countdown boxes go stale on their own; a minute is the finest unit they show.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const query = searchQuery.trim().toLocaleLowerCase('ar');
    if (query) {
      return tasks.filter((task) => task.title.toLocaleLowerCase('ar').includes(query));
    }
    if (selectedDay) {
      return tasks.filter((task) => task.due_at?.slice(0, 10) === selectedDay);
    }
    if (activeCategory) return tasks.filter((task) => task.category === activeCategory);
    if (filter === 'الكل') return tasks;
    if (filter === 'المنتهية') return tasks.filter((task) => task.status === 'completed');
    if (filter === 'المتأخرة') return tasks.filter((task) => isTaskOverdue(task, now));
    if (filter === 'القادمة') return tasks.filter((task) => isTaskUpcoming(task, now));
    if (filter === 'مهم وعاجل') {
      return tasks.filter((task) => task.status === 'pending' && task.important && task.urgent);
    }
    if (filter === 'مهم غير عاجل') {
      return tasks.filter((task) => task.status === 'pending' && task.important && !task.urgent);
    }
    if (filter === 'غير مهم وغير عاجل') {
      return tasks.filter((task) => task.status === 'pending' && !task.important && !task.urgent);
    }
    return tasks.filter((task) => isTaskInTodayList(task, now));
  }, [activeCategory, filter, searchQuery, selectedDay, tasks]);

  const taskCategories = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.category).filter(Boolean))).sort((first, second) => first.localeCompare(second, 'ar')),
    [tasks],
  );
  const activeDetailedFilter = activeCategory || (detailedFilters.includes(filter) ? filter : undefined);

  const selectFilter = (nextFilter: TaskFilter) => {
    setActiveCategory(undefined);
    setFilter(nextFilter);
    router.setParams({ category: '', view: '' });
  };

  const { days, monthLabel } = useMemo(() => {
    const today = new Date();
    const dateFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { day: 'numeric' });
    const dayFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { weekday: 'narrow' });
    const monthFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-gregory', { month: 'long', year: 'numeric' });

    return {
      monthLabel: monthFormatter.format(today),
      days: Array.from({ length: 5 }, (_, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() + index - 2);
        return {
          day: dayFormatter.format(date),
          date: dateFormatter.format(date),
          // Local calendar day, so a task due tonight doesn't land on tomorrow via UTC.
          key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        };
      }),
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={syncing} onRefresh={() => void refresh()} tintColor={Palette.primary} />}>
        <View style={styles.header}>
          <Pressable
            style={styles.searchButton}
            accessibilityRole="button"
            accessibilityLabel={searchOpen ? 'إغلاق البحث' : 'بحث في المهام'}
            onPress={() => {
              setSearchOpen((open) => !open);
              if (searchOpen) setSearchQuery('');
            }}>
            <AppIcon
              name={searchOpen
                ? { ios: 'xmark', android: 'close', web: 'close' }
                : { ios: 'magnifyingglass', android: 'search', web: 'search' }}
              size={20}
              tintColor={Palette.primary}
              fallback={searchOpen ? '×' : '⌕'}
            />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>مهامي</Text>
            <Text style={styles.subtitle}>كل شيء في موعده</Text>
          </View>
        </View>

        {searchOpen && (
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="ابحث في عناوين مهامك"
            placeholderTextColor={Palette.inkMuted}
            autoFocus
            style={styles.searchField}
          />
        )}

        <View style={styles.calendarCard}>
          <View style={styles.calendarHeader}>
            <Text style={styles.month}>{monthLabel}</Text>
            {!!selectedDay && (
              <Pressable style={styles.calendarLink} onPress={() => setSelectedDay(undefined)}>
                <AppIcon name={{ ios: 'xmark', android: 'close', web: 'close' }} size={14} tintColor={Palette.primary} fallback="×" />
                <Text style={styles.calendarLinkText}>إلغاء تحديد اليوم</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.daysRow}>
            {days.map((item) => {
              const selected = selectedDay === item.key;
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`عرض مهام ${item.day} ${item.date}`}
                  onPress={() => setSelectedDay(selected ? undefined : item.key)}
                  style={[styles.day, selected && styles.daySelected]}>
                  <Text style={[styles.dayName, selected && styles.dayTextSelected]}>{item.day}</Text>
                  <Text style={[styles.dayDate, selected && styles.dayTextSelected]}>{item.date}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.filterSection}>
          <View style={styles.primaryFilters}>
          {primaryFilters.map((item) => (
            <Pressable
              key={item}
              onPress={() => selectFilter(item)}
              style={({ pressed }) => [
                styles.primaryFilter,
                !activeCategory && filter === item && styles.primaryFilterSelected,
                pressed && styles.pressed,
              ]}>
              <Text
                numberOfLines={1}
                style={[styles.primaryFilterText, !activeCategory && filter === item && styles.primaryFilterTextSelected]}>
                {item}
              </Text>
            </Pressable>
          ))}
          </View>
          <View style={styles.moreFilterRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="فتح خيارات تصفية المهام"
              onPress={() => setFilterOpen(true)}
              style={({ pressed }) => [
                styles.moreFilterButton,
                !!activeDetailedFilter && styles.moreFilterButtonActive,
                pressed && styles.pressed,
              ]}>
              {!!activeDetailedFilter && <View style={styles.activeFilterDot} />}
              <Text style={[styles.moreFilterText, !!activeDetailedFilter && styles.moreFilterTextActive]}>تصفية</Text>
            </Pressable>
            <Text numberOfLines={1} style={styles.filterSummary}>
              {activeDetailedFilter ? `العرض الحالي: ${activeDetailedFilter}` : 'الأولوية، الحالة والتصنيف'}
            </Text>
          </View>
        </View>

        {!!lastError && (
          <View style={styles.syncNotice}>
            <Text style={styles.syncNoticeText}>{lastError}</Text>
          </View>
        )}

        <View style={styles.listHeading}>
          <Text style={styles.count}>{filteredTasks.length} مهام</Text>
          <View style={styles.listTitleRow}>
            <Text style={styles.listTitle}>{activeCategory || filter}</Text>
            {!!activeCategory && (
              <AppIcon
                name={{ ios: 'folder.fill', android: 'folder', web: 'folder' }}
                size={18}
                tintColor={Palette.primary}
                fallback="□"
              />
            )}
          </View>
        </View>

        {loading && !tasks.length ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={Palette.primary} />
            <Text style={styles.loadingText}>جاري تجهيز مهامك...</Text>
          </View>
        ) : filteredTasks.length ? (
          <View style={styles.taskList}>
            {filteredTasks.map((task) => {
              const completed = task.status === 'completed';
              const description = taskDescriptionPreview(task.description);
              const countdown = taskCountdown(task, now);
              return (
              <Pressable
                key={task.id}
                accessibilityRole="button"
                accessibilityLabel={`تعديل مهمة ${task.title}`}
                onPress={() => router.push({ pathname: '/add-task', params: { taskId: task.id } })}
                style={({ pressed }) => [styles.taskCard, pressed && styles.pressed]}>
                <View style={styles.timeColumn}>
                  <View style={[styles.countdownBox, countdownBoxStyle[countdown.state]]}>
                    <Text numberOfLines={2} style={styles.countdownText}>{countdown.label}</Text>
                  </View>
                  <View style={[styles.priorityLine, { backgroundColor: taskPriorityColor(task) }]} />
                </View>
                <View style={styles.taskCopy}>
                  <Text style={[styles.taskTitle, completed && styles.completedText]}>{task.title}</Text>
                  {!!description && (
                    <Text
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={[styles.taskDescription, completed && styles.completedDescription]}>
                      {description}
                    </Text>
                  )}
                  <View style={styles.taskMetaRow}>
                    <Text style={styles.category}>{task.category}</Text>
                    {!!task.due_at && (
                      <>
                        <Text style={styles.separator}>•</Text>
                        <Text style={[styles.remain, isTaskOverdue(task, now) && styles.overdueText]}>{taskTimeLabel(task)}</Text>
                      </>
                    )}
                  </View>
                </View>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: completed }}
                  accessibilityLabel={completed ? 'إلغاء إكمال المهمة' : 'إكمال المهمة'}
                  hitSlop={10}
                  onPress={() => void toggleTask(task.id)}
                  style={[styles.checkbox, completed && styles.checkboxCompleted]}>
                  {completed && <Text style={styles.checkText}>✓</Text>}
                </Pressable>
              </Pressable>
            );})}
          </View>
        ) : (
          <EmptyState
            symbol="✓"
            title={`لا توجد مهام في «${activeCategory || filter}»`}
            description="حسابك يبدأ فارغًا. عندما تضيف مهمة ستظهر هنا وفي الصفحة الرئيسية."
            actionLabel="إضافة أول مهمة"
            onAction={() => router.push('/add-task')}
          />
        )}
      </ScrollView>

      <Modal transparent visible={filterOpen} animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFilterOpen(false)}>
          <Pressable style={styles.filterSheet} onPress={(event) => event.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>تصفية المهام</Text>
              <Text style={styles.sheetSubtitle}>اختر العرض الذي تحتاجه الآن</Text>
            </View>

            <Text style={styles.sheetSectionTitle}>الأولوية والحالة</Text>
            <View style={styles.detailedFilterGrid}>
              {detailedFilters.map((item) => {
                const selected = !activeCategory && filter === item;
                return (
                  <Pressable
                    key={item}
                    onPress={() => {
                      selectFilter(item);
                      setFilterOpen(false);
                    }}
                    style={({ pressed }) => [
                      styles.detailedFilter,
                      selected && styles.detailedFilterSelected,
                      pressed && styles.pressed,
                    ]}>
                    <Text numberOfLines={1} style={[styles.detailedFilterText, selected && styles.detailedFilterTextSelected]}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>

            {!!taskCategories.length && (
              <>
                <Text style={styles.sheetSectionTitle}>التصنيف</Text>
                <View style={styles.categoryFilters}>
                  {taskCategories.map((category) => {
                    const selected = activeCategory === category;
                    return (
                      <Pressable
                        key={category}
                        onPress={() => {
                          setActiveCategory(category);
                          setFilter('الكل');
                          router.setParams({ category, view: '' });
                          setFilterOpen(false);
                        }}
                        style={({ pressed }) => [styles.categoryFilter, selected && styles.categoryFilterSelected, pressed && styles.pressed]}>
                        <Text numberOfLines={1} style={[styles.categoryFilterText, selected && styles.categoryFilterTextSelected]}>{category}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {!!activeDetailedFilter && (
              <Pressable
                onPress={() => {
                  selectFilter('اليوم');
                  setFilterOpen(false);
                }}
                style={({ pressed }) => [styles.resetFilterButton, pressed && styles.pressed]}>
                <Text style={styles.resetFilterText}>إزالة التصفية والعودة لليوم</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <FloatingAddButton
        label="مهمة جديدة"
        accessibilityLabel="إضافة مهمة جديدة"
        onPress={() => router.push('/add-task')}
      />
    </SafeAreaView>
  );
}

const countdownBoxStyle: Record<TaskCountdown['state'], { backgroundColor: string }> = {
  completed: { backgroundColor: Palette.line },
  none: { backgroundColor: Palette.inkMuted },
  overdue: { backgroundColor: Palette.danger },
  soon: { backgroundColor: Palette.accent },
  upcoming: { backgroundColor: Palette.primary },
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Palette.canvas },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 150 },
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  headerCopy: { alignItems: 'flex-start' },
  title: { color: Palette.ink, fontSize: 30, fontWeight: '900', writingDirection: 'rtl' },
  subtitle: { color: Palette.inkMuted, fontSize: 12, marginTop: 3, writingDirection: 'rtl' },
  searchButton: { width: 46, height: 46, borderRadius: 16, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center' },
  searchField: { minHeight: 48, borderRadius: Radius.medium, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surface, paddingHorizontal: 16, color: Palette.ink, fontSize: 15, textAlign: 'right', writingDirection: 'rtl' },
  calendarCard: { backgroundColor: Palette.surface, borderRadius: Radius.large, marginTop: 24, padding: 17, ...Shadow.card },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  month: { color: Palette.ink, fontSize: 15, fontWeight: '900', writingDirection: 'rtl' },
  calendarLink: { flexDirection: 'row-reverse', gap: 5, alignItems: 'center' },
  calendarLinkText: { color: Palette.primary, fontSize: 10, fontWeight: '800', writingDirection: 'rtl' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  day: { width: 48, minHeight: 66, borderRadius: 17, alignItems: 'center', justifyContent: 'center', gap: 6 },
  daySelected: { backgroundColor: Palette.primary },
  dayName: { color: Palette.inkMuted, fontSize: 11, fontWeight: '700' },
  dayDate: { color: Palette.ink, fontSize: 16, fontWeight: '900' },
  dayTextSelected: { color: Palette.white },
  filterSection: { paddingVertical: 24, gap: 11 },
  primaryFilters: { minHeight: 48, padding: 4, borderRadius: Radius.medium, backgroundColor: Palette.surface, flexDirection: 'row', ...Shadow.card },
  primaryFilter: { flex: 1, minWidth: 0, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  primaryFilterSelected: { backgroundColor: Palette.primary },
  primaryFilterText: { color: Palette.inkMuted, fontSize: 11, fontWeight: '800', writingDirection: 'rtl' },
  primaryFilterTextSelected: { color: Palette.white },
  moreFilterRow: { minHeight: 34, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  moreFilterButton: { minHeight: 34, borderRadius: Radius.pill, paddingHorizontal: 14, borderWidth: 1, borderColor: Palette.line, backgroundColor: 'rgba(255,253,252,0.7)', flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7 },
  moreFilterButtonActive: { borderColor: Palette.primary, backgroundColor: Palette.accentSoft },
  moreFilterText: { color: Palette.inkMuted, fontSize: 11, fontWeight: '900', writingDirection: 'rtl' },
  moreFilterTextActive: { color: Palette.primary },
  activeFilterDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Palette.primary },
  filterSummary: { flex: 1, color: Palette.inkMuted, fontSize: 10, textAlign: 'right', writingDirection: 'rtl' },
  syncNotice: { backgroundColor: Palette.successSoft, borderRadius: Radius.small, padding: 12, marginBottom: 16 },
  syncNoticeText: { color: Palette.primary, fontSize: 11, lineHeight: 18, textAlign: 'right', writingDirection: 'rtl' },
  listHeading: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 },
  count: { color: Palette.inkMuted, fontSize: 12, writingDirection: 'rtl' },
  listTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  listTitle: { color: Palette.ink, fontSize: 19, fontWeight: '900', writingDirection: 'rtl' },
  taskList: { gap: 11 },
  taskCard: { minHeight: 92, backgroundColor: Palette.surface, borderRadius: Radius.medium, padding: 15, flexDirection: 'row-reverse', alignItems: 'center', gap: 12, ...Shadow.card },
  timeColumn: { alignItems: 'center', gap: 7 },
  countdownBox: { width: 58, minHeight: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  countdownText: { color: Palette.white, fontSize: 11, fontWeight: '900', textAlign: 'center', writingDirection: 'rtl' },
  priorityLine: { width: 35, height: 4, borderRadius: 2 },
  taskCopy: { flex: 1, alignItems: 'flex-start' },
  taskTitle: { color: Palette.ink, fontSize: 14, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  taskDescription: { color: Palette.inkMuted, fontSize: 11, lineHeight: 17, marginTop: 5, textAlign: 'right', writingDirection: 'rtl' },
  completedDescription: { opacity: 0.62 },
  taskMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  category: { color: Palette.primary, fontSize: 10, fontWeight: '800', writingDirection: 'rtl' },
  separator: { color: Palette.line },
  remain: { color: Palette.inkMuted, fontSize: 10, writingDirection: 'rtl' },
  overdueText: { color: Palette.danger, fontWeight: '800' },
  checkbox: { width: 27, height: 27, borderRadius: 9, borderWidth: 1.5, borderColor: Palette.line, alignItems: 'center', justifyContent: 'center' },
  checkboxCompleted: { borderColor: Palette.success, backgroundColor: Palette.success },
  checkText: { color: Palette.white, fontSize: 15, fontWeight: '900' },
  completedText: { color: Palette.inkMuted, textDecorationLine: 'line-through' },
  loadingCard: { minHeight: 180, borderRadius: Radius.large, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Palette.inkMuted, fontSize: 12, writingDirection: 'rtl' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(46,36,29,0.36)' },
  filterSheet: { backgroundColor: Palette.canvas, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 38 },
  sheetHandle: { width: 42, height: 4, borderRadius: 2, backgroundColor: Palette.line, alignSelf: 'center', marginBottom: 20 },
  sheetHeader: { alignItems: 'flex-start', marginBottom: 24 },
  sheetTitle: { color: Palette.ink, fontSize: 22, fontWeight: '900', writingDirection: 'rtl' },
  sheetSubtitle: { color: Palette.inkMuted, fontSize: 11, marginTop: 4, writingDirection: 'rtl' },
  sheetSectionTitle: { color: Palette.ink, fontSize: 13, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl', marginBottom: 10, marginTop: 4 },
  detailedFilterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 20 },
  detailedFilter: { flexGrow: 1, flexBasis: '46%', minHeight: 46, borderRadius: 15, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  detailedFilterSelected: { borderColor: Palette.primary, backgroundColor: Palette.primary },
  detailedFilterText: { color: Palette.ink, fontSize: 11, fontWeight: '800', writingDirection: 'rtl' },
  detailedFilterTextSelected: { color: Palette.white },
  categoryFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  categoryFilter: { maxWidth: '100%', minHeight: 38, borderRadius: Radius.pill, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surface, justifyContent: 'center', paddingHorizontal: 15 },
  categoryFilterSelected: { borderColor: Palette.primary, backgroundColor: Palette.accentSoft },
  categoryFilterText: { color: Palette.inkMuted, fontSize: 11, fontWeight: '800', writingDirection: 'rtl' },
  categoryFilterTextSelected: { color: Palette.primary },
  resetFilterButton: { minHeight: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  resetFilterText: { color: Palette.danger, fontSize: 12, fontWeight: '800', writingDirection: 'rtl' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
});
