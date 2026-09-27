import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type ScheduleResult = {
  ids: string[];
  error?: string;
};

export async function scheduleRoutineNotifications({
  routineId,
  title,
  time,
  repeatDays,
}: {
  routineId: string;
  title: string;
  time: string;
  repeatDays: number[];
}): Promise<ScheduleResult> {
  if (Platform.OS === 'web') {
    return { ids: [], error: 'تذكيرات الروتين متاحة على الجوال فقط.' };
  }

  const currentPermissions = await Notifications.getPermissionsAsync();
  let permissionStatus = currentPermissions.status;
  if (permissionStatus !== 'granted') {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    permissionStatus = requestedPermissions.status;
  }

  if (permissionStatus !== 'granted') {
    return { ids: [], error: 'اسمح بالإشعارات من إعدادات الآيفون، أو أوقف التذكير ثم احفظ الروتين.' };
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('routine-reminders', {
      name: 'تذكيرات الروتين',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  const [hour, minute] = time.split(':').map(Number);
  const content: Notifications.NotificationContentInput = {
    title: 'موعد روتينك',
    body: title,
    sound: 'default',
    data: { url: '/routine', routineId },
  };

  try {
    if (repeatDays.length === 7) {
      const id = await Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: Platform.OS === 'android' ? 'routine-reminders' : undefined,
        },
      });
      return { ids: [id] };
    }

    const ids = await Promise.all(repeatDays.map((day) =>
      Notifications.scheduleNotificationAsync({
        content,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: day + 1,
          hour,
          minute,
          channelId: Platform.OS === 'android' ? 'routine-reminders' : undefined,
        },
      }),
    ));
    return { ids };
  } catch {
    return { ids: [], error: 'تعذر جدولة التذكير. جرّب اختيار وقت آخر.' };
  }
}

export async function cancelRoutineNotifications(ids: string[]) {
  if (Platform.OS === 'web' || ids.length === 0) return;

  await Promise.all(ids.map(async (id) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // The notification may already have been removed by the operating system.
    }
  }));
}
