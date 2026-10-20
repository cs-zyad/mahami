import type { Palette } from '@/constants/design';
import { localDateKey, routineStreak } from '@/lib/routine-utils';
import type { Routine, RoutineCompletion } from '@/types/routine';
import type { Task } from '@/types/task';

// Everything the widget draws arrives as props: it runs in its own process and
// cannot read the app's state, its storage or the network. That includes the
// colours, so the widget follows whichever theme is active in the app.

// No field may be null or undefined: the props are stored in the app group's
// UserDefaults, which only accepts property-list values, so a null anywhere in
// the tree can make the whole write fail silently and leave the widget empty.
export type WidgetTask = {
  id: string;
  title: string;
  /** Empty when the task has no due time. */
  time: string;
  done: boolean;
  tone: 'urgent' | 'important' | 'later';
};

export type WidgetRoutine = {
  id: string;
  title: string;
  done: boolean;
  streak: number;
};

export type WidgetColors = {
  canvas: string;
  surface: string;
  ink: string;
  muted: string;
  primary: string;
  accent: string;
  success: string;
  urgent: string;
  important: string;
  later: string;
};

export type MahamiWidgetProps = {
  signedIn: boolean;
  link: string;
  tasks: WidgetTask[];
  routines: WidgetRoutine[];
  completed: number;
  total: number;
  /**
   * Task ids finished from the widget that the app has not written to Supabase
   * yet. The widget appends to it; the app drains it on its next run.
   */
  pendingDone: string[];
  colors: WidgetColors;
  /** When the app last pushed, shown in the widget so stale data is visible. */
  updatedAt: string;
};

const MAX_TASKS = 5;
const MAX_ROUTINES = 3;

function sameLocalDay(value: string | null, date: Date) {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime())
    && parsed.getFullYear() === date.getFullYear()
    && parsed.getMonth() === date.getMonth()
    && parsed.getDate() === date.getDate();
}

function clockLabel(date: Date) {
  return new Intl.DateTimeFormat('ar-SA', { hour: 'numeric', minute: '2-digit' }).format(date);
}

function timeLabel(dueAt: string | null) {
  if (!dueAt) return '';
  const parsed = new Date(dueAt);
  if (Number.isNaN(parsed.getTime())) return '';
  return clockLabel(parsed);
}

function toneOf(task: Task): WidgetTask['tone'] {
  if (task.important && task.urgent) return 'urgent';
  if (task.important) return 'important';
  return 'later';
}

export function widgetColors(palette: Palette): WidgetColors {
  return {
    canvas: palette.canvas,
    surface: palette.surface,
    ink: palette.ink,
    muted: palette.inkMuted,
    primary: palette.primary,
    accent: palette.accent,
    success: palette.success,
    urgent: palette.urgent,
    important: palette.important,
    later: palette.later,
  };
}

/**
 * The same "today" the home screen shows: pending tasks due today or undated,
 * plus tasks completed today — so the widget and the app never disagree.
 */
export function buildWidgetProps({
  signedIn,
  link,
  tasks,
  routines,
  completions,
  palette,
  pendingDone = [],
  now = new Date(),
}: {
  signedIn: boolean;
  link: string;
  tasks: Task[];
  routines: Routine[];
  completions: RoutineCompletion[];
  palette: Palette;
  pendingDone?: string[];
  now?: Date;
}): MahamiWidgetProps {
  const pending = new Set(pendingDone);

  const todayPending = tasks.filter(
    (task) => task.status === 'pending' && (!task.due_at || sameLocalDay(task.due_at, now)),
  );
  const todayDone = tasks.filter(
    (task) => task.status === 'completed' && sameLocalDay(task.completed_at, now),
  );

  // A task finished from the widget but not yet synced still counts as done,
  // otherwise it would pop back the moment the app refreshes the widget.
  const isDone = (task: Task) => task.status === 'completed' || pending.has(task.id);
  const listed = [...todayPending, ...todayDone].slice(0, MAX_TASKS);

  const today = localDateKey(now);
  const doneRoutines = new Set(
    completions.filter((entry) => entry.completed_on === today).map((entry) => entry.routine_id),
  );
  const todayRoutines = routines
    .filter((routine) => routine.active && routine.repeat_days.includes(now.getDay()))
    .slice(0, MAX_ROUTINES);

  const total = todayPending.length + todayDone.length;
  const completed = todayDone.length + todayPending.filter((task) => pending.has(task.id)).length;

  return {
    signedIn,
    link,
    tasks: listed.map((task) => ({
      id: task.id,
      title: task.title || 'مهمة',
      time: timeLabel(task.due_at),
      done: isDone(task),
      tone: toneOf(task),
    })),
    routines: todayRoutines.map((routine) => ({
      id: routine.id,
      title: routine.title || 'روتين',
      done: doneRoutines.has(routine.id),
      streak: routineStreak(routine.id, completions, routine.repeat_days, now),
    })),
    completed,
    total,
    pendingDone: [...pending],
    colors: widgetColors(palette),
    updatedAt: clockLabel(now),
  };
}
