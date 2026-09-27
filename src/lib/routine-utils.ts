import { RoutineCompletion } from '@/types/routine';

export function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftDate(date: Date, days: number) {
  const shifted = new Date(date);
  shifted.setHours(12, 0, 0, 0);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

export function routineStreak(
  routineId: string,
  completions: RoutineCompletion[],
  repeatDays: number[],
  now = new Date(),
) {
  if (repeatDays.length === 0) return 0;

  const completedDates = new Set(
    completions
      .filter((completion) => completion.routine_id === routineId)
      .map((completion) => completion.completed_on),
  );

  let cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);

  while (!repeatDays.includes(cursor.getDay())) {
    cursor = shiftDate(cursor, -1);
  }

  if (!completedDates.has(localDateKey(cursor))) {
    do {
      cursor = shiftDate(cursor, -1);
    } while (!repeatDays.includes(cursor.getDay()));
  }

  let streak = 0;
  while (completedDates.has(localDateKey(cursor))) {
    streak += 1;
    do {
      cursor = shiftDate(cursor, -1);
    } while (!repeatDays.includes(cursor.getDay()));
  }

  return streak;
}
