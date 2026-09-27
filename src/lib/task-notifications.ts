import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const notificationKey = (userId: string, taskId: string) => `@mahami/task-notification/${userId}/${taskId}`;

type TaskNotificationResult = {
  id?: string;
  error?: string;
};

export async function scheduleTaskNotification({
  userId,
  taskId,
  title,
  dueAt,
  reminderMinutes,
}: {
  userId: string;
  taskId: string;
  title: string;
  dueAt: string;
  reminderMinutes: number;
}): Promise<TaskNotificationResult> {
  if (Platform.OS === 'web') return { error: 'تذكيرات المهام متاحة على الجوال فقط.' };

  const reminderDate = new Date(new Date(dueAt).getTime() - reminderMinutes * 60_000);
  if (Number.isNaN(reminderDate.getTime()) || reminderDate.getTime() <= Date.now()) {
    return { error: 'وقت التذكير المختار مضى. اختر موعدًا لاحقًا.' };
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  let permissionStatus = currentPermissions.status;
  if (permissionStatus !== 'granted') {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    permissionStatus = requestedPermissions.status;
  }
  if (permissionStatus !== 'granted') {
    return { error: 'اسمح بالإشعارات من إعدادات الآيفون، أو أوقف التذكير ثم احفظ المهمة.' };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('task-reminders', {
      name: 'تذكيرات المهام',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: reminderMinutes === 0 ? 'حان موعد مهمتك' : 'اقترب موعد مهمتك',
        body: title,
        sound: 'default',
        data: { url: '/tasks', taskId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
        channelId: Platform.OS === 'android' ? 'task-reminders' : undefined,
      },
    });
    await AsyncStorage.setItem(notificationKey(userId, taskId), id);
    return { id };
  } catch {
    return { error: 'تعذر جدولة التذكير. جرّب اختيار موعد آخر.' };
  }
}

export async function cancelTaskNotification(userId: string, taskId: string) {
  if (Platform.OS === 'web') return;
  const key = notificationKey(userId, taskId);
  const id = await AsyncStorage.getItem(key);
  if (!id) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // The operating system may have already delivered or removed it.
  }
  await AsyncStorage.removeItem(key);
}
