import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppIcon } from '@/components/ui/app-icon';
import { DueDateTimeField } from '@/components/ui/due-date-time-field';
import { FormScreen } from '@/components/ui/form-screen';
import { PrimaryButton } from '@/components/ui/primary-button';
import { TextField } from '@/components/ui/text-field';
import { Palette, Radius } from '@/constants/design';
import { useAuth } from '@/contexts/auth-context';
import { useTasks } from '@/contexts/tasks-context';
import { defaultTaskCategories, TaskCategoryOption } from '@/lib/task-categories';

const categoryStorageKey = (userId: string) => `@mahami/task-categories/${userId}`;

const reminderOptions = [
  { value: 0, label: 'وقت الموعد' },
  { value: 10, label: 'قبل ١٠ دقائق' },
  { value: 30, label: 'قبل ٣٠ دقيقة' },
  { value: 60, label: 'قبل ساعة' },
  { value: 1440, label: 'قبل يوم' },
] as const;

type PriorityValue = 'important_urgent' | 'important' | 'later';

const priorityOptions: Array<{
  value: PriorityValue;
  label: string;
  hint: string;
  color: string;
  softColor: string;
}> = [
  {
    value: 'important_urgent',
    label: 'مهم وعاجل',
    hint: 'نفّذها الآن',
    color: '#A84F46',
    softColor: '#F6E3E0',
  },
  {
    value: 'important',
    label: 'مهم غير عاجل',
    hint: 'خطّط لها',
    color: '#A66A32',
    softColor: '#F6E8D6',
  },
  {
    value: 'later',
    label: 'غير مهم وغير عاجل',
    hint: 'لاحقًا',
    color: '#766B62',
    softColor: '#EEE9E2',
  },
];

function PriorityChoice({
  option,
  selected,
  onPress,
}: {
  option: (typeof priorityOptions)[number];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={option.label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.priorityChoice,
        { backgroundColor: option.softColor },
        selected && { borderColor: option.color, borderWidth: 2 },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.priorityMark, { borderColor: option.color }, selected && { backgroundColor: option.color }]}>
        {selected && (
          <AppIcon
            name={{ ios: 'checkmark', android: 'check', web: 'check' }}
            size={11}
            tintColor={Palette.white}
            fallback="✓"
          />
        )}
      </View>
      <Text style={[styles.priorityTitle, { color: option.color }]}>{option.label}</Text>
      <Text style={[styles.priorityHint, { color: option.color }]}>{option.hint}</Text>
    </Pressable>
  );
}

function BrandSwitch({ value, onValueChange }: { value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel="تفعيل تذكير المهمة"
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange(!value)}
      style={({ pressed }) => [
        styles.switchTrack,
        value && styles.switchTrackActive,
        pressed && styles.switchPressed,
      ]}>
      <View style={[styles.switchThumb, value && styles.switchThumbActive]} />
    </Pressable>
  );
}

export default function AddTaskScreen() {
  const { session } = useAuth();
  const { addTask, updateTask, tasks } = useTasks();
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const editedTask = taskId ? tasks.find((task) => task.id === taskId) : undefined;
  const prefilledRef = useRef(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityValue>('later');
  const [category, setCategory] = useState('غير مصنف');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [categoryError, setCategoryError] = useState<string>();
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [dueAt, setDueAt] = useState<Date | null>(null);
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const userId = session?.user.id;
  const categories = useMemo<TaskCategoryOption[]>(() => {
    const defaults = new Set(defaultTaskCategories.map((item) => item.label));
    const taskCategories = tasks
      .map((task) => task.category.trim())
      .filter((item) => item && !defaults.has(item));
    const uniqueCustomCategories = [...new Set([...customCategories, ...taskCategories])];
    return [
      ...defaultTaskCategories,
      ...uniqueCustomCategories.map((label) => ({ label, icon: 'folder.fill', fallback: '□' })),
    ];
  }, [customCategories, tasks]);
  const selectedCategory = categories.find((item) => item.label === category) ?? categories[0];

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void AsyncStorage.getItem(categoryStorageKey(userId)).then((storedValue) => {
      if (!active || !storedValue) return;
      try {
        const parsed: unknown = JSON.parse(storedValue);
        if (Array.isArray(parsed)) {
          setCustomCategories(parsed.filter((item): item is string => typeof item === 'string'));
        }
      } catch {
        // Ignore malformed local category data and start with the defaults.
      }
    });
    return () => {
      active = false;
    };
  }, [userId]);

  // Tasks arrive from cache asynchronously, so prefill on the first render that has the task.
  useEffect(() => {
    if (!editedTask || prefilledRef.current) return;
    prefilledRef.current = true;
    setTitle(editedTask.title);
    setDescription(editedTask.description);
    setPriority(editedTask.urgent ? 'important_urgent' : editedTask.important ? 'important' : 'later');
    setCategory(editedTask.category);
    setDueAt(editedTask.due_at ? new Date(editedTask.due_at) : null);
    setReminderMinutes(editedTask.reminder_minutes);
  }, [editedTask]);

  const handleAddCategory = async () => {
    const name = newCategory.trim().replace(/\s+/g, ' ');
    setCategoryError(undefined);
    if (!name) {
      setCategoryError('اكتب اسم التصنيف أولًا.');
      return;
    }
    if (name.length > 40) {
      setCategoryError('اسم التصنيف طويل؛ استخدم ٤٠ حرفًا أو أقل.');
      return;
    }

    const existing = categories.find((item) => item.label.toLocaleLowerCase('ar') === name.toLocaleLowerCase('ar'));
    if (existing) {
      setCategory(existing.label);
      setNewCategory('');
      setAddingCategory(false);
      setCategoryOpen(false);
      return;
    }

    const nextCategories = [...customCategories, name];
    setCustomCategories(nextCategories);
    setCategory(name);
    setNewCategory('');
    setAddingCategory(false);
    setCategoryOpen(false);
    if (userId) await AsyncStorage.setItem(categoryStorageKey(userId), JSON.stringify(nextCategories));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError(undefined);

    const input = {
      title,
      description,
      important: priority !== 'later',
      urgent: priority === 'important_urgent',
      category,
      dueAt: dueAt?.toISOString() ?? null,
      reminderMinutes,
    };
    const result = taskId ? await updateTask(taskId, input) : await addTask(input);

    setSaving(false);
    if (!result.saved) {
      setSaveError(result.error ?? 'تعذر حفظ المهمة. حاول مرة أخرى.');
      return;
    }

    router.back();
  };

  return (
    <FormScreen
      title={taskId ? 'تعديل المهمة' : 'مهمة جديدة'}
      subtitle={taskId ? 'عدّل تفاصيل مهمتك واحفظ التغييرات.' : 'اكتبها الآن، وخلي مهامي يرتبها.'}>
      <View style={styles.form}>
        <TextField label="عنوان المهمة" placeholder="وش تحتاج تنجز؟" value={title} onChangeText={setTitle} autoFocus={!taskId} />
        <TextField label="الوصف — اختياري" placeholder="أضف أي تفاصيل تساعدك" value={description} onChangeText={setDescription} multiline style={styles.description} />

        <Text style={styles.label}>الأولوية</Text>
        <View accessibilityRole="radiogroup" style={styles.priorityChoices}>
          {priorityOptions.map((option) => (
            <PriorityChoice
              key={option.value}
              option={option}
              selected={priority === option.value}
              onPress={() => setPriority(option.value)}
            />
          ))}
        </View>

        <Text style={styles.label}>التصنيف</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`اختيار التصنيف، المحدد حاليًا ${category}`}
          onPress={() => setCategoryOpen((current) => !current)}
          style={({ pressed }) => [styles.categoryField, categoryOpen && styles.categoryFieldOpen, pressed && styles.pressed]}>
          <View style={styles.categoryIcon}>
            <AppIcon name={selectedCategory.icon} size={17} tintColor={Palette.primary} fallback={selectedCategory.fallback} />
          </View>
          <View style={styles.categoryCopy}>
            <Text style={styles.categoryHint}>اضغط لاختيار التصنيف</Text>
            <Text style={styles.categoryValue}>{category}</Text>
          </View>
          <AppIcon
            name={{ ios: categoryOpen ? 'chevron.up' : 'chevron.down', android: categoryOpen ? 'expand_less' : 'expand_more' }}
            size={14}
            tintColor={Palette.inkMuted}
            fallback={categoryOpen ? '⌃' : '⌄'}
          />
        </Pressable>
        {categoryOpen && (
          <View style={styles.categoryMenu}>
            {categories.map((item) => {
              const selected = category === item.label;
              return (
                <Pressable
                  key={item.label}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setCategory(item.label);
                    setAddingCategory(false);
                    setCategoryError(undefined);
                    setCategoryOpen(false);
                  }}
                  style={({ pressed }) => [styles.categoryOption, selected && styles.categoryOptionSelected, pressed && styles.pressed]}>
                  <View style={styles.categoryOptionIcon}>
                    <AppIcon name={item.icon} size={16} tintColor={Palette.primary} fallback={item.fallback} />
                  </View>
                  <Text style={[styles.categoryOptionText, selected && styles.categoryOptionTextSelected]}>{item.label}</Text>
                  {selected && (
                    <AppIcon name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={14} tintColor={Palette.primary} fallback="✓" />
                  )}
                </Pressable>
              );
            })}

            {!addingCategory ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="إضافة تصنيف جديد"
                onPress={() => {
                  setAddingCategory(true);
                  setCategoryError(undefined);
                }}
                style={({ pressed }) => [styles.addCategoryButton, pressed && styles.pressed]}>
                <View style={styles.addCategoryIcon}>
                  <AppIcon
                    name={{ ios: 'plus', android: 'add', web: 'add' }}
                    size={16}
                    tintColor={Palette.primary}
                    fallback="+"
                  />
                </View>
                <Text style={styles.addCategoryText}>إضافة تصنيف جديد</Text>
              </Pressable>
            ) : (
              <View style={styles.categoryCreator}>
                <Text style={styles.categoryCreatorLabel}>اسم التصنيف الجديد</Text>
                <View style={styles.categoryCreatorRow}>
                  <TextInput
                    accessibilityLabel="اسم التصنيف الجديد"
                    autoFocus
                    value={newCategory}
                    onChangeText={(value) => {
                      setNewCategory(value);
                      setCategoryError(undefined);
                    }}
                    onSubmitEditing={() => void handleAddCategory()}
                    placeholder="مثال: مشروع التخرج"
                    placeholderTextColor={Palette.inkMuted}
                    maxLength={40}
                    returnKeyType="done"
                    style={styles.categoryInput}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="حفظ التصنيف"
                    disabled={!newCategory.trim()}
                    onPress={() => void handleAddCategory()}
                    style={({ pressed }) => [
                      styles.saveCategoryButton,
                      !newCategory.trim() && styles.saveCategoryButtonDisabled,
                      pressed && styles.pressed,
                    ]}>
                    <AppIcon
                      name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                      size={16}
                      tintColor={Palette.white}
                      fallback="✓"
                    />
                  </Pressable>
                </View>
                {!!categoryError && <Text style={styles.categoryError}>{categoryError}</Text>}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setAddingCategory(false);
                    setNewCategory('');
                    setCategoryError(undefined);
                  }}
                  style={styles.cancelCategoryButton}>
                  <Text style={styles.cancelCategoryText}>إلغاء</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}

        <Text style={styles.label}>الموعد</Text>
        <DueDateTimeField
          value={dueAt}
          onChange={(value) => {
            setDueAt(value);
            setSaveError(undefined);
            if (!value) setReminderMinutes(null);
          }}
        />

        <View style={styles.reminderRow}>
          <BrandSwitch
            value={reminderMinutes !== null}
            onValueChange={(value) => {
              setSaveError(undefined);
              if (value && !dueAt) {
                setSaveError('حدد التاريخ والوقت أولًا لتفعيل التذكير.');
                return;
              }
              setReminderMinutes(value ? 10 : null);
            }}
          />
          <View style={styles.reminderCopy}>
            <Text style={styles.reminderTitle}>ذكّرني قبل الموعد</Text>
            <Text style={styles.reminderText}>
              {reminderMinutes === null
                ? 'غير مفعّل'
                : reminderOptions.find((option) => option.value === reminderMinutes)?.label}
            </Text>
          </View>
          <View style={styles.reminderIcon}>
            <AppIcon
              name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
              size={18}
              tintColor={Palette.primary}
              fallback="•"
            />
          </View>
        </View>

        {reminderMinutes !== null && (
          <View style={styles.reminderOptions}>
            {reminderOptions.map((option) => {
              const selected = reminderMinutes === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setReminderMinutes(option.value)}
                  style={({ pressed }) => [
                    styles.reminderOption,
                    selected && styles.reminderOptionSelected,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.reminderOptionText, selected && styles.reminderOptionTextSelected]}>{option.label}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {!!saveError && <Text style={styles.error}>{saveError}</Text>}
        <PrimaryButton label={saving ? 'جاري الحفظ...' : taskId ? 'حفظ التغييرات' : 'حفظ المهمة'} disabled={!title.trim() || saving} onPress={handleSave} style={styles.save} />
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 17 },
  description: { minHeight: 88, paddingTop: 15, textAlignVertical: 'top' },
  label: { color: Palette.ink, fontSize: 14, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl', marginTop: 3 },
  priorityChoices: { flexDirection: 'row', gap: 8 },
  priorityChoice: { flex: 1, minWidth: 0, minHeight: 96, borderRadius: Radius.medium, borderWidth: 1, borderColor: 'transparent', paddingHorizontal: 7, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', gap: 4 },
  priorityMark: { width: 22, height: 22, borderRadius: 8, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.42)', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  priorityTitle: { minHeight: 31, fontSize: 11, lineHeight: 15, fontWeight: '900', textAlign: 'center', writingDirection: 'rtl' },
  priorityHint: { fontSize: 9, fontWeight: '700', opacity: 0.78, writingDirection: 'rtl' },
  categoryField: { minHeight: 74, borderRadius: Radius.medium, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.line, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  categoryFieldOpen: { borderColor: Palette.primary, backgroundColor: '#FBF6F0' },
  categoryIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  categoryCopy: { flex: 1, alignItems: 'flex-start', gap: 3 },
  categoryHint: { color: Palette.inkMuted, fontSize: 10, writingDirection: 'rtl' },
  categoryValue: { color: Palette.ink, fontSize: 14, fontWeight: '900', writingDirection: 'rtl' },
  categoryMenu: { marginTop: -8, borderRadius: Radius.medium, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surface, overflow: 'hidden' },
  categoryOption: { minHeight: 52, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Palette.line },
  categoryOptionSelected: { backgroundColor: Palette.accentSoft },
  categoryOptionIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: Palette.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  categoryOptionText: { flex: 1, color: Palette.inkMuted, fontSize: 13, fontWeight: '800', textAlign: 'right', writingDirection: 'rtl' },
  categoryOptionTextSelected: { color: Palette.primary, fontWeight: '900' },
  addCategoryButton: { minHeight: 58, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FBF6F0' },
  addCategoryIcon: { width: 30, height: 30, borderRadius: 10, borderWidth: 1, borderColor: Palette.accent, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  addCategoryText: { flex: 1, color: Palette.primary, fontSize: 12, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  categoryCreator: { padding: 13, backgroundColor: '#FBF6F0', gap: 8 },
  categoryCreatorLabel: { color: Palette.ink, fontSize: 11, fontWeight: '900', textAlign: 'right', writingDirection: 'rtl' },
  categoryCreatorRow: { minHeight: 48, flexDirection: 'row', gap: 8 },
  categoryInput: { flex: 1, borderRadius: Radius.small, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surface, paddingHorizontal: 12, color: Palette.ink, fontSize: 13, fontWeight: '700', textAlign: 'right', writingDirection: 'rtl' },
  saveCategoryButton: { width: 48, borderRadius: Radius.small, backgroundColor: Palette.primary, alignItems: 'center', justifyContent: 'center' },
  saveCategoryButtonDisabled: { opacity: 0.4 },
  categoryError: { color: Palette.danger, fontSize: 10, textAlign: 'right', writingDirection: 'rtl' },
  cancelCategoryButton: { minHeight: 30, alignSelf: 'flex-end', justifyContent: 'center', paddingHorizontal: 4 },
  cancelCategoryText: { color: Palette.inkMuted, fontSize: 10, fontWeight: '800', writingDirection: 'rtl' },
  reminderRow: { minHeight: 78, borderRadius: Radius.medium, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surface, paddingHorizontal: 13, flexDirection: 'row-reverse', alignItems: 'center', gap: 13 },
  reminderCopy: { flex: 1, alignItems: 'flex-start' },
  reminderIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: Palette.accentSoft, alignItems: 'center', justifyContent: 'center' },
  reminderTitle: { color: Palette.ink, fontSize: 14, fontWeight: '800', writingDirection: 'rtl' },
  reminderText: { color: Palette.inkMuted, fontSize: 10, marginTop: 4, writingDirection: 'rtl' },
  switchTrack: { width: 54, height: 32, borderRadius: Radius.pill, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surfaceMuted, padding: 3, justifyContent: 'center', alignItems: 'flex-end' },
  switchTrackActive: { borderColor: Palette.primary, backgroundColor: Palette.primary, alignItems: 'flex-start' },
  switchThumb: { width: 24, height: 24, borderRadius: 12, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.line },
  switchThumbActive: { borderColor: '#E7D5C4', backgroundColor: Palette.canvas },
  switchPressed: { opacity: 0.8 },
  reminderOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: -8 },
  reminderOption: { minHeight: 38, borderRadius: Radius.pill, borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.surface, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  reminderOptionSelected: { borderColor: Palette.primary, backgroundColor: Palette.accentSoft },
  reminderOptionText: { color: Palette.inkMuted, fontSize: 10, fontWeight: '800', writingDirection: 'rtl' },
  reminderOptionTextSelected: { color: Palette.primary, fontWeight: '900' },
  error: { color: Palette.danger, fontSize: 12, lineHeight: 19, textAlign: 'right', writingDirection: 'rtl' },
  save: { marginTop: 5 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
});
