export type SmartTaskPriority = 'important_urgent' | 'important' | 'later';

export type SmartTaskDraft = {
  id: string;
  selected: boolean;
  title: string;
  description: string;
  priority: SmartTaskPriority;
  category: string;
  dueAt: Date | null;
  reminderMinutes: number | null;
  confidence: number;
};

export type SmartScanStatus = {
  plan: 'free' | 'plus';
  subscriptionStatus: 'inactive' | 'trialing' | 'active' | 'past_due' | 'canceled';
  allowanceType: 'free' | 'monthly';
  usageLimit: number;
  used: number;
  remaining: number;
  periodEnd: string | null;
};

export type SmartScanResult = {
  tasks: SmartTaskDraft[];
  quota: Pick<SmartScanStatus, 'allowanceType' | 'usageLimit' | 'used' | 'remaining' | 'periodEnd'>;
};

export type SmartVoiceScanResult = SmartScanResult & {
  transcript: string;
};
