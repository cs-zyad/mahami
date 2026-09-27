import { Palette } from '@/constants/design';
import { Task } from '@/types/task';

function taskDate(task: Task) {
  if (!task.due_at) return null;
  const date = new Date(task.due_at);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sameLocalDay(first: Date, second: Date) {
  return first.getFullYear() === second.getFullYear()
    && first.getMonth() === second.getMonth()
    && first.getDate() === second.getDate();
}

export function isTaskOverdue(task: Task, now = new Date()) {
  const dueDate = taskDate(task);
  return task.status !== 'completed' && !!dueDate && dueDate.getTime() < now.getTime();
}

export function isTaskInTodayList(task: Task, now = new Date()) {
  if (task.status === 'completed') return false;
  const dueDate = taskDate(task);
  return !dueDate || sameLocalDay(dueDate, now);
}

export function isTaskUpcoming(task: Task, now = new Date()) {
  const dueDate = taskDate(task);
  return task.status !== 'completed' && !!dueDate && dueDate.getTime() > now.getTime() && !sameLocalDay(dueDate, now);
}

export function taskTimeLabel(task: Task) {
  const dueDate = taskDate(task);
  if (!dueDate) return 'بدون وقت';
  return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(dueDate);
}

export function taskDescriptionPreview(description: string) {
  return description.replace(/\s+/g, ' ').trim();
}

export function taskTimingLabel(task: Task, now = new Date()) {
  if (task.status === 'completed') return 'مكتملة';
  const dueDate = taskDate(task);
  if (!dueDate) return 'بدون موعد';

  const difference = dueDate.getTime() - now.getTime();
  const absoluteMinutes = Math.max(1, Math.round(Math.abs(difference) / 60000));
  const hours = Math.floor(absoluteMinutes / 60);
  const days = Math.floor(hours / 24);
  const value = days > 0 ? `${days} يوم` : hours > 0 ? `${hours} ساعة` : `${absoluteMinutes} دقيقة`;

  return difference < 0 ? `متأخرة ${value}` : `متبقي ${value}`;
}

// Arabic marks singular, dual, and two plural ranges differently — "٢ يوم" reads wrong.
function arabicCount(count: number, one: string, two: string, few: string, many: string) {
  if (count === 1) return one;
  if (count === 2) return two;
  if (count <= 10) return `${count} ${few}`;
  return `${count} ${many}`;
}

export type TaskCountdown = {
  label: string;
  state: 'completed' | 'none' | 'overdue' | 'soon' | 'upcoming';
};

export function taskCountdown(task: Task, now = new Date()): TaskCountdown {
  if (task.status === 'completed') return { label: 'تم', state: 'completed' };

  const dueDate = taskDate(task);
  if (!dueDate) return { label: 'بدون موعد', state: 'none' };

  const difference = dueDate.getTime() - now.getTime();
  if (difference < 0) return { label: 'متأخرة', state: 'overdue' };

  const minutes = Math.max(1, Math.round(difference / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const label = days > 0
    ? arabicCount(days, 'يوم', 'يومان', 'أيام', 'يومًا')
    : hours > 0
      ? arabicCount(hours, 'ساعة', 'ساعتان', 'ساعات', 'ساعة')
      : arabicCount(minutes, 'دقيقة', 'دقيقتان', 'دقائق', 'دقيقة');

  return { label, state: hours < 24 ? 'soon' : 'upcoming' };
}

export function taskPriorityColor(task: Task) {
  if (task.important && task.urgent) return Palette.urgent;
  if (task.important) return Palette.important;
  if (task.urgent) return '#B89238';
  return Palette.later;
}
