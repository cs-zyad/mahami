import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';
import { cancelTaskNotification, scheduleTaskNotification } from '@/lib/task-notifications';
import { NewTaskInput, Task } from '@/types/task';

type PendingTaskOperation =
  | { kind: 'upsert'; task: Task }
  | { kind: 'delete'; id: string };

type TaskMutationResult = {
  saved: boolean;
  synced: boolean;
  error?: string;
};

type TasksContextValue = {
  tasks: Task[];
  loading: boolean;
  syncing: boolean;
  lastError?: string;
  addTask: (input: NewTaskInput) => Promise<TaskMutationResult>;
  updateTask: (id: string, input: NewTaskInput) => Promise<TaskMutationResult>;
  toggleTask: (id: string) => Promise<TaskMutationResult>;
  deleteTask: (id: string) => Promise<TaskMutationResult>;
  refresh: () => Promise<void>;
  clearError: () => void;
};

const TasksContext = createContext<TasksContextValue | null>(null);

const taskCacheKey = (userId: string) => `@mahami/tasks/${userId}`;
const taskQueueKey = (userId: string) => `@mahami/task-queue/${userId}`;

// Nearest deadline first; tasks without a deadline sink to the bottom, newest of them first.
function sortTasks(tasks: Task[]) {
  return [...tasks].sort((first, second) => {
    if (first.due_at && second.due_at) return first.due_at.localeCompare(second.due_at);
    if (first.due_at) return -1;
    if (second.due_at) return 1;
    return second.created_at.localeCompare(first.created_at);
  });
}

function createTaskId() {
  return `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

async function readArray<T>(key: string): Promise<T[]> {
  const value = await AsyncStorage.getItem(key);
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed as T[] : [];
  } catch {
    return [];
  }
}

async function saveQueue(userId: string, operations: PendingTaskOperation[]) {
  await AsyncStorage.setItem(taskQueueKey(userId), JSON.stringify(operations));
}

async function enqueueOperation(userId: string, operation: PendingTaskOperation) {
  const operations = await readArray<PendingTaskOperation>(taskQueueKey(userId));
  const operationId = operation.kind === 'upsert' ? operation.task.id : operation.id;
  const withoutOlderVersion = operations.filter((item) => {
    const itemId = item.kind === 'upsert' ? item.task.id : item.id;
    return itemId !== operationId;
  });
  await saveQueue(userId, [...withoutOlderVersion, operation]);
}

function syncErrorMessage(message?: string) {
  const normalized = message?.toLowerCase() ?? '';
  if (normalized.includes('relation') || normalized.includes('schema cache')) {
    return 'المهام محفوظة على الجهاز. بقي تفعيل جدول المهام في Supabase لإكمال المزامنة.';
  }
  return 'تعذرت المزامنة الآن. بياناتك محفوظة على الجهاز وستتم المحاولة مجددًا.';
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const activeUserRef = useRef<string | null>(userId ?? null);
  const tasksRef = useRef<Task[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(!!userId);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string>();

  const commitTasks = useCallback(async (ownerId: string, nextTasks: Task[]) => {
    const sortedTasks = sortTasks(nextTasks);
    await AsyncStorage.setItem(taskCacheKey(ownerId), JSON.stringify(sortedTasks));

    if (activeUserRef.current === ownerId) {
      tasksRef.current = sortedTasks;
      setTasks(sortedTasks);
    }
  }, []);

  const syncPendingOperations = useCallback(async (ownerId: string) => {
    if (!supabase) return { error: 'Supabase is not configured.' };

    const operations = await readArray<PendingTaskOperation>(taskQueueKey(ownerId));
    let remaining = [...operations];

    for (const operation of operations) {
      const response = operation.kind === 'upsert'
        ? await supabase.from('tasks').upsert(operation.task, { onConflict: 'id' })
        : await supabase.from('tasks').delete().eq('id', operation.id).eq('user_id', ownerId);

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
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const pendingOperations = await readArray<PendingTaskOperation>(taskQueueKey(userId));
      const merged = new Map<string, Task>((data as Task[]).map((task) => [task.id, task]));

      for (const operation of pendingOperations) {
        if (operation.kind === 'upsert') merged.set(operation.task.id, operation.task);
        else merged.delete(operation.id);
      }

      await commitTasks(userId, [...merged.values()]);
      setLastError(syncResult.error ? syncErrorMessage(syncResult.error) : undefined);
    } else {
      setLastError(syncErrorMessage(error?.message ?? syncResult.error));
    }

    setSyncing(false);
  }, [commitTasks, syncPendingOperations, userId]);

  useEffect(() => {
    activeUserRef.current = userId ?? null;

    if (!userId) {
      tasksRef.current = [];
      setTasks([]);
      setLoading(false);
      setSyncing(false);
      setLastError(undefined);
      return;
    }

    const ownerId = userId;
    tasksRef.current = [];
    setTasks([]);
    setLoading(true);

    void (async () => {
      const cachedTasks = await readArray<Task>(taskCacheKey(ownerId));
      if (activeUserRef.current === ownerId) {
        tasksRef.current = sortTasks(cachedTasks);
        setTasks(tasksRef.current);
      }

      await refresh();
      if (activeUserRef.current === ownerId) setLoading(false);
    })();
  }, [refresh, userId]);

  const addTask = useCallback(async (input: NewTaskInput): Promise<TaskMutationResult> => {
    if (!userId) return { saved: false, synced: false, error: 'سجّل الدخول أولًا لحفظ المهمة.' };

    const title = input.title.trim();
    if (!title) return { saved: false, synced: false, error: 'اكتب عنوان المهمة أولًا.' };

    const timestamp = new Date().toISOString();
    const taskId = createTaskId();
    if (input.reminderMinutes !== null && input.reminderMinutes !== undefined) {
      if (!input.dueAt) {
        return { saved: false, synced: false, error: 'حدد موعد المهمة أولًا لتفعيل التذكير.' };
      }
      const notificationResult = await scheduleTaskNotification({
        userId,
        taskId,
        title,
        dueAt: input.dueAt,
        reminderMinutes: input.reminderMinutes,
      });
      if (notificationResult.error) {
        return { saved: false, synced: false, error: notificationResult.error };
      }
    }

    const task: Task = {
      id: taskId,
      user_id: userId,
      title,
      description: input.description?.trim() ?? '',
      important: input.important ?? false,
      urgent: input.urgent ?? false,
      category: input.category?.trim() || 'شخصي',
      due_at: input.dueAt ?? null,
      reminder_minutes: input.reminderMinutes ?? null,
      status: 'pending',
      completed_at: null,
      created_at: timestamp,
      updated_at: timestamp,
    };

    try {
      await commitTasks(userId, [task, ...tasksRef.current]);
      await enqueueOperation(userId, { kind: 'upsert', task });
      const result = await syncPendingOperations(userId);
      const synced = !result.error;
      setLastError(synced ? undefined : syncErrorMessage(result.error));
      return { saved: true, synced };
    } catch {
      await cancelTaskNotification(userId, taskId);
      return { saved: false, synced: false, error: 'تعذر حفظ المهمة على الجهاز. حاول مرة أخرى.' };
    }
  }, [commitTasks, syncPendingOperations, userId]);

  const updateTask = useCallback(async (id: string, input: NewTaskInput): Promise<TaskMutationResult> => {
    if (!userId) return { saved: false, synced: false, error: 'سجّل الدخول أولًا لحفظ المهمة.' };

    const currentTask = tasksRef.current.find((task) => task.id === id);
    if (!currentTask) return { saved: false, synced: false, error: 'لم يتم العثور على المهمة.' };

    const title = input.title.trim();
    if (!title) return { saved: false, synced: false, error: 'اكتب عنوان المهمة أولًا.' };

    const dueAt = input.dueAt ?? null;
    const reminderMinutes = input.reminderMinutes ?? null;
    if (reminderMinutes !== null && !dueAt) {
      return { saved: false, synced: false, error: 'حدد موعد المهمة أولًا لتفعيل التذكير.' };
    }

    await cancelTaskNotification(userId, id);
    if (reminderMinutes !== null && dueAt && currentTask.status !== 'completed') {
      const notificationResult = await scheduleTaskNotification({
        userId,
        taskId: id,
        title,
        dueAt,
        reminderMinutes,
      });
      if (notificationResult.error) {
        return { saved: false, synced: false, error: notificationResult.error };
      }
    }

    const updatedTask: Task = {
      ...currentTask,
      title,
      description: input.description?.trim() ?? '',
      important: input.important ?? false,
      urgent: input.urgent ?? false,
      category: input.category?.trim() || currentTask.category,
      due_at: dueAt,
      reminder_minutes: reminderMinutes,
      updated_at: new Date().toISOString(),
    };

    await commitTasks(userId, tasksRef.current.map((task) => task.id === id ? updatedTask : task));
    await enqueueOperation(userId, { kind: 'upsert', task: updatedTask });
    const result = await syncPendingOperations(userId);
    const synced = !result.error;
    setLastError(synced ? undefined : syncErrorMessage(result.error));
    return { saved: true, synced };
  }, [commitTasks, syncPendingOperations, userId]);

  const toggleTask = useCallback(async (id: string): Promise<TaskMutationResult> => {
    if (!userId) return { saved: false, synced: false, error: 'سجّل الدخول أولًا.' };
    const currentTask = tasksRef.current.find((task) => task.id === id);
    if (!currentTask) return { saved: false, synced: false, error: 'لم يتم العثور على المهمة.' };

    const completed = currentTask.status !== 'completed';
    const updatedTask: Task = {
      ...currentTask,
      status: completed ? 'completed' : 'pending',
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    };

    if (completed) {
      await cancelTaskNotification(userId, id);
    } else if (
      updatedTask.due_at
      && updatedTask.reminder_minutes !== null
      && new Date(updatedTask.due_at).getTime() > Date.now()
    ) {
      await scheduleTaskNotification({
        userId,
        taskId: id,
        title: updatedTask.title,
        dueAt: updatedTask.due_at,
        reminderMinutes: updatedTask.reminder_minutes,
      });
    }

    await commitTasks(userId, tasksRef.current.map((task) => task.id === id ? updatedTask : task));
    await enqueueOperation(userId, { kind: 'upsert', task: updatedTask });
    const result = await syncPendingOperations(userId);
    const synced = !result.error;
    setLastError(synced ? undefined : syncErrorMessage(result.error));
    return { saved: true, synced };
  }, [commitTasks, syncPendingOperations, userId]);

  const deleteTask = useCallback(async (id: string): Promise<TaskMutationResult> => {
    if (!userId) return { saved: false, synced: false, error: 'سجّل الدخول أولًا.' };

    await cancelTaskNotification(userId, id);
    await commitTasks(userId, tasksRef.current.filter((task) => task.id !== id));
    await enqueueOperation(userId, { kind: 'delete', id });
    const result = await syncPendingOperations(userId);
    const synced = !result.error;
    setLastError(synced ? undefined : syncErrorMessage(result.error));
    return { saved: true, synced };
  }, [commitTasks, syncPendingOperations, userId]);

  const value = useMemo<TasksContextValue>(() => ({
    tasks,
    loading,
    syncing,
    lastError,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,
    refresh,
    clearError: () => setLastError(undefined),
  }), [addTask, deleteTask, lastError, loading, refresh, syncing, tasks, toggleTask, updateTask]);

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (!context) throw new Error('useTasks must be used inside TasksProvider');
  return context;
}
