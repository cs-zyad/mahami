import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { cancelRoutineNotifications, scheduleRoutineNotifications } from '@/lib/routine-notifications';
import { localDateKey, shiftDate } from '@/lib/routine-utils';
import { supabase } from '@/lib/supabase';
import { NewRoutineInput, Routine, RoutineCompletion } from '@/types/routine';

type PendingRoutineOperation =
  | { kind: 'upsertRoutine'; routine: Routine }
  | { kind: 'deleteRoutine'; id: string }
  | { kind: 'upsertCompletion'; completion: RoutineCompletion }
  | { kind: 'deleteCompletion'; id: string };

type RoutineMutationResult = {
  saved: boolean;
  synced: boolean;
  error?: string;
};

type RoutineStore = {
  routines: Routine[];
  completions: RoutineCompletion[];
};

type RoutinesContextValue = RoutineStore & {
  loading: boolean;
  syncing: boolean;
  lastError?: string;
  addRoutine: (input: NewRoutineInput) => Promise<RoutineMutationResult>;
  updateRoutine: (routineId: string, input: NewRoutineInput) => Promise<RoutineMutationResult>;
  toggleRoutineToday: (routineId: string) => Promise<RoutineMutationResult>;
  deleteRoutine: (routineId: string) => Promise<RoutineMutationResult>;
  refresh: () => Promise<void>;
  clearError: () => void;
};

const RoutinesContext = createContext<RoutinesContextValue | null>(null);
const emptyStore: RoutineStore = { routines: [], completions: [] };

const routineCacheKey = (userId: string) => `@mahami/routines/${userId}`;
const routineQueueKey = (userId: string) => `@mahami/routine-queue/${userId}`;

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const value = await AsyncStorage.getItem(key);
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function saveQueue(userId: string, operations: PendingRoutineOperation[]) {
  await AsyncStorage.setItem(routineQueueKey(userId), JSON.stringify(operations));
}

async function enqueueOperation(userId: string, operation: PendingRoutineOperation) {
  const operations = await readJson<PendingRoutineOperation[]>(routineQueueKey(userId), []);
  const operationId = operation.kind === 'upsertRoutine'
    ? operation.routine.id
    : operation.kind === 'deleteRoutine'
      ? operation.id
    : operation.kind === 'upsertCompletion'
      ? operation.completion.id
      : operation.id;

  const nextOperations = operations.filter((item) => {
    const itemId = item.kind === 'upsertRoutine'
      ? item.routine.id
      : item.kind === 'deleteRoutine'
        ? item.id
      : item.kind === 'upsertCompletion'
        ? item.completion.id
        : item.id;
    return itemId !== operationId;
  });

  await saveQueue(userId, [...nextOperations, operation]);
}

function syncErrorMessage(message?: string) {
  const normalized = message?.toLowerCase() ?? '';
  if (normalized.includes('relation') || normalized.includes('schema cache')) {
    return 'روتينك محفوظ على الجهاز. بقي إنشاء جداول الروتين في Supabase لإكمال المزامنة.';
  }
  return 'تعذرت المزامنة الآن. روتينك محفوظ على الجهاز وسنحاول مجددًا.';
}

export function RoutinesProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const activeUserRef = useRef<string | null>(userId ?? null);
  const storeRef = useRef<RoutineStore>(emptyStore);
  const [store, setStore] = useState<RoutineStore>(emptyStore);
  const [loading, setLoading] = useState(!!userId);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string>();

  const commitStore = useCallback(async (ownerId: string, nextStore: RoutineStore) => {
    const sortedStore = {
      routines: [...nextStore.routines].sort((first, second) => first.created_at.localeCompare(second.created_at)),
      completions: [...nextStore.completions].sort((first, second) => second.completed_on.localeCompare(first.completed_on)),
    };
    await AsyncStorage.setItem(routineCacheKey(ownerId), JSON.stringify(sortedStore));

    if (activeUserRef.current === ownerId) {
      storeRef.current = sortedStore;
      setStore(sortedStore);
    }
  }, []);

  const syncPendingOperations = useCallback(async (ownerId: string) => {
    if (!supabase) return { error: 'Supabase is not configured.' };

    const operations = await readJson<PendingRoutineOperation[]>(routineQueueKey(ownerId), []);
    let remaining = [...operations];

    for (const operation of operations) {
      const response = operation.kind === 'upsertRoutine'
        ? await supabase.from('routines').upsert(operation.routine, { onConflict: 'id' })
        : operation.kind === 'deleteRoutine'
          ? await supabase.from('routines').delete().eq('id', operation.id).eq('user_id', ownerId)
          : operation.kind === 'upsertCompletion'
            ? await supabase.from('routine_completions').upsert(operation.completion, { onConflict: 'id' })
            : await supabase
              .from('routine_completions')
              .delete()
              .eq('id', operation.id)
              .eq('user_id', ownerId);

      if (response.error) {
        await saveQueue(ownerId, remaining);
        return { error: response.error.message };
      }

      remaining = remaining.slice(1);
      await saveQueue(ownerId, remaining);
    }

    return {};
  }, []);

  const refresh = useCallback(async () => {
    if (!userId || !supabase) return;

    setSyncing(true);
    const syncResult = await syncPendingOperations(userId);
    const oldestCompletion = localDateKey(shiftDate(new Date(), -370));
    const [routinesResponse, completionsResponse] = await Promise.all([
      supabase
        .from('routines')
        .select('*')
        .eq('user_id', userId)
        .eq('active', true)
        .order('created_at', { ascending: true }),
      supabase
        .from('routine_completions')
        .select('*')
        .eq('user_id', userId)
        .gte('completed_on', oldestCompletion),
    ]);

    if (!routinesResponse.error && !completionsResponse.error) {
      const pendingOperations = await readJson<PendingRoutineOperation[]>(routineQueueKey(userId), []);
      const routines = new Map<string, Routine>(
        ((routinesResponse.data ?? []) as Routine[]).map((routine) => [routine.id, routine]),
      );
      const completions = new Map<string, RoutineCompletion>(
        ((completionsResponse.data ?? []) as RoutineCompletion[]).map((completion) => [completion.id, completion]),
      );

      for (const operation of pendingOperations) {
        if (operation.kind === 'upsertRoutine') routines.set(operation.routine.id, operation.routine);
        if (operation.kind === 'deleteRoutine') routines.delete(operation.id);
        if (operation.kind === 'upsertCompletion') completions.set(operation.completion.id, operation.completion);
        if (operation.kind === 'deleteCompletion') completions.delete(operation.id);
      }

      await commitStore(userId, {
        routines: [...routines.values()].filter((routine) => routine.active),
        completions: [...completions.values()],
      });
      setLastError(syncResult.error ? syncErrorMessage(syncResult.error) : undefined);
    } else {
      setLastError(syncErrorMessage(
        routinesResponse.error?.message ?? completionsResponse.error?.message ?? syncResult.error,
      ));
    }

    setSyncing(false);
  }, [commitStore, syncPendingOperations, userId]);

  useEffect(() => {
    activeUserRef.current = userId ?? null;

    if (!userId) {
      storeRef.current = emptyStore;
      setStore(emptyStore);
      setLoading(false);
      setSyncing(false);
      setLastError(undefined);
      return;
    }

    const ownerId = userId;
    storeRef.current = emptyStore;
    setStore(emptyStore);
    setLoading(true);

    void (async () => {
      const cachedStore = await readJson<RoutineStore>(routineCacheKey(ownerId), emptyStore);
      if (activeUserRef.current === ownerId) {
        storeRef.current = cachedStore;
        setStore(cachedStore);
      }

      await refresh();
      if (activeUserRef.current === ownerId) setLoading(false);
    })();
  }, [refresh, userId]);

  const addRoutine = useCallback(async (input: NewRoutineInput): Promise<RoutineMutationResult> => {
    if (!userId) return { saved: false, synced: false, error: 'سجّل الدخول أولًا لحفظ الروتين.' };
    const title = input.title.trim();
    if (!title) return { saved: false, synced: false, error: 'اكتب اسم الروتين أولًا.' };
    const repeatDays = [...new Set(input.repeatDays)].sort((first, second) => first - second);
    if (repeatDays.length === 0) {
      return { saved: false, synced: false, error: 'اختر يومًا واحدًا على الأقل.' };
    }

    const timestamp = new Date().toISOString();
    const routineId = createId('routine');
    let notificationIds: string[] = [];

    if (input.reminderEnabled && input.reminderTime) {
      const notificationResult = await scheduleRoutineNotifications({
        routineId,
        title,
        time: input.reminderTime,
        repeatDays,
      });
      if (notificationResult.error) {
        return { saved: false, synced: false, error: notificationResult.error };
      }
      notificationIds = notificationResult.ids;
    }

    const routine: Routine = {
      id: routineId,
      user_id: userId,
      title,
      icon: input.icon || 'sparkles',
      reminder_time: input.reminderTime ?? null,
      reminder_enabled: input.reminderEnabled ?? false,
      repeat_days: repeatDays,
      notification_ids: notificationIds,
      active: true,
      created_at: timestamp,
      updated_at: timestamp,
    };

    try {
      await commitStore(userId, {
        routines: [...storeRef.current.routines, routine],
        completions: storeRef.current.completions,
      });
      await enqueueOperation(userId, { kind: 'upsertRoutine', routine });
      const result = await syncPendingOperations(userId);
      const synced = !result.error;
      setLastError(synced ? undefined : syncErrorMessage(result.error));
      return { saved: true, synced };
    } catch {
      return { saved: false, synced: false, error: 'تعذر حفظ الروتين على الجهاز. حاول مرة أخرى.' };
    }
  }, [commitStore, syncPendingOperations, userId]);

  const toggleRoutineToday = useCallback(async (routineId: string): Promise<RoutineMutationResult> => {
    if (!userId) return { saved: false, synced: false, error: 'سجّل الدخول أولًا.' };
    const today = localDateKey();
    const existing = storeRef.current.completions.find(
      (completion) => completion.routine_id === routineId && completion.completed_on === today,
    );

    if (existing) {
      await commitStore(userId, {
        routines: storeRef.current.routines,
        completions: storeRef.current.completions.filter((completion) => completion.id !== existing.id),
      });
      await enqueueOperation(userId, { kind: 'deleteCompletion', id: existing.id });
    } else {
      const completion: RoutineCompletion = {
        id: `${routineId}_${today}`,
        routine_id: routineId,
        user_id: userId,
        completed_on: today,
        completed_at: new Date().toISOString(),
      };
      await commitStore(userId, {
        routines: storeRef.current.routines,
        completions: [...storeRef.current.completions, completion],
      });
      await enqueueOperation(userId, { kind: 'upsertCompletion', completion });
    }

    const result = await syncPendingOperations(userId);
    const synced = !result.error;
    setLastError(synced ? undefined : syncErrorMessage(result.error));
    return { saved: true, synced };
  }, [commitStore, syncPendingOperations, userId]);

  const updateRoutine = useCallback(async (
    routineId: string,
    input: NewRoutineInput,
  ): Promise<RoutineMutationResult> => {
    if (!userId) return { saved: false, synced: false, error: 'سجّل الدخول أولًا.' };
    const currentRoutine = storeRef.current.routines.find((item) => item.id === routineId);
    if (!currentRoutine) return { saved: false, synced: false, error: 'لم يتم العثور على الروتين.' };

    const title = input.title.trim();
    if (!title) return { saved: false, synced: false, error: 'اكتب اسم الروتين أولًا.' };
    const repeatDays = [...new Set(input.repeatDays)].sort((first, second) => first - second);
    if (repeatDays.length === 0) {
      return { saved: false, synced: false, error: 'اختر يومًا واحدًا على الأقل.' };
    }

    let notificationIds: string[] = [];
    if (input.reminderEnabled && input.reminderTime) {
      const notificationResult = await scheduleRoutineNotifications({
        routineId,
        title,
        time: input.reminderTime,
        repeatDays,
      });
      if (notificationResult.error) {
        return { saved: false, synced: false, error: notificationResult.error };
      }
      notificationIds = notificationResult.ids;
    }

    try {
      await cancelRoutineNotifications(currentRoutine.notification_ids ?? []);
      const updatedRoutine: Routine = {
        ...currentRoutine,
        title,
        icon: input.icon || 'sparkles',
        reminder_time: input.reminderEnabled ? input.reminderTime ?? null : null,
        reminder_enabled: input.reminderEnabled ?? false,
        repeat_days: repeatDays,
        notification_ids: notificationIds,
        updated_at: new Date().toISOString(),
      };

      await commitStore(userId, {
        routines: storeRef.current.routines.map((item) => item.id === routineId ? updatedRoutine : item),
        completions: storeRef.current.completions,
      });
      await enqueueOperation(userId, { kind: 'upsertRoutine', routine: updatedRoutine });
      const result = await syncPendingOperations(userId);
      const synced = !result.error;
      setLastError(synced ? undefined : syncErrorMessage(result.error));
      return { saved: true, synced };
    } catch {
      await cancelRoutineNotifications(notificationIds);
      return { saved: false, synced: false, error: 'تعذر حفظ تعديلات الروتين. حاول مرة أخرى.' };
    }
  }, [commitStore, syncPendingOperations, userId]);

  const deleteRoutine = useCallback(async (routineId: string): Promise<RoutineMutationResult> => {
    if (!userId) return { saved: false, synced: false, error: 'سجّل الدخول أولًا.' };
    const routine = storeRef.current.routines.find((item) => item.id === routineId);
    if (!routine) return { saved: false, synced: false, error: 'لم يتم العثور على الروتين.' };

    try {
      await cancelRoutineNotifications(routine.notification_ids ?? []);
      await commitStore(userId, {
        routines: storeRef.current.routines.filter((item) => item.id !== routineId),
        completions: storeRef.current.completions.filter((item) => item.routine_id !== routineId),
      });

      const queuedOperations = await readJson<PendingRoutineOperation[]>(routineQueueKey(userId), []);
      const remainingOperations = queuedOperations.filter((operation) => {
        if (operation.kind === 'upsertRoutine') return operation.routine.id !== routineId;
        if (operation.kind === 'deleteRoutine') return operation.id !== routineId;
        if (operation.kind === 'upsertCompletion') return operation.completion.routine_id !== routineId;
        return !operation.id.startsWith(`${routineId}_`);
      });
      await saveQueue(userId, [...remainingOperations, { kind: 'deleteRoutine', id: routineId }]);

      const result = await syncPendingOperations(userId);
      const synced = !result.error;
      setLastError(synced ? undefined : syncErrorMessage(result.error));
      return { saved: true, synced };
    } catch {
      return { saved: false, synced: false, error: 'تعذر حذف الروتين. حاول مرة أخرى.' };
    }
  }, [commitStore, syncPendingOperations, userId]);

  const value = useMemo<RoutinesContextValue>(() => ({
    routines: store.routines,
    completions: store.completions,
    loading,
    syncing,
    lastError,
    addRoutine,
    updateRoutine,
    toggleRoutineToday,
    deleteRoutine,
    refresh,
    clearError: () => setLastError(undefined),
  }), [addRoutine, deleteRoutine, lastError, loading, refresh, store, syncing, toggleRoutineToday, updateRoutine]);

  return <RoutinesContext.Provider value={value}>{children}</RoutinesContext.Provider>;
}

export function useRoutines() {
  const context = useContext(RoutinesContext);
  if (!context) throw new Error('useRoutines must be used inside RoutinesProvider');
  return context;
}
