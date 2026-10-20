import { addUserInteractionListener } from 'expo-widgets';

import MahamiToday from './mahami-widget';
import type { MahamiWidgetProps } from './widget-props';

const WIDGET_NAME = 'MahamiToday';

export function pushWidget(props: MahamiWidgetProps) {
  try {
    MahamiToday.updateSnapshot(props);
  } catch {
    // No widget extension in this binary (an older build) — nothing to update.
  }
}

/**
 * Task ids finished from the widget while the app was closed.
 *
 * The docs name no API for reading back what a button's onPress returned, but
 * the native intent (expo-widgets ios/Widgets/AppIntent.swift) merges those
 * props into the same `__expo_widgets_<name>_timeline` entry that getTimeline()
 * reads. Every entry is checked and their pendingDone lists merged.
 */
export async function readWidgetCompletions(): Promise<string[]> {
  try {
    const entries = await MahamiToday.getTimeline();
    const ids = new Set<string>();
    for (const entry of entries) {
      for (const id of entry.props?.pendingDone ?? []) ids.add(id);
    }
    return [...ids];
  } catch {
    return [];
  }
}

/** Taps on the widget while the app is running. Returns the unsubscribe. */
export function onWidgetCompletion(handler: (taskId: string) => void) {
  try {
    const subscription = addUserInteractionListener((event) => {
      if (event.source !== WIDGET_NAME || !event.target.startsWith('done:')) return;
      handler(event.target.slice('done:'.length));
    });
    return () => subscription.remove();
  } catch {
    return () => undefined;
  }
}
