export type Routine = {
  id: string;
  user_id: string;
  title: string;
  icon: string;
  reminder_time: string | null;
  reminder_enabled: boolean;
  repeat_days: number[];
  notification_ids: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type RoutineCompletion = {
  id: string;
  routine_id: string;
  user_id: string;
  completed_on: string;
  completed_at: string;
};

export type NewRoutineInput = {
  title: string;
  icon: string;
  reminderTime?: string | null;
  reminderEnabled?: boolean;
  repeatDays: number[];
};
