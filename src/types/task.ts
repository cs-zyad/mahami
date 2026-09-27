export type TaskStatus = 'pending' | 'completed';

export type Task = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  important: boolean;
  urgent: boolean;
  category: string;
  due_at: string | null;
  reminder_minutes: number | null;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NewTaskInput = {
  title: string;
  description?: string;
  important?: boolean;
  urgent?: boolean;
  category?: string;
  dueAt?: string | null;
  reminderMinutes?: number | null;
};
