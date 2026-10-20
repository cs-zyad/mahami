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
 * The runtime persists what a button's onPress returned, but the docs name no
 * API for reading it back. getTimeline() is the only read the library offers,
 * so every entry it returns is checked and their pendingDone lists merged.
 * Whether button-produced props show up there must be confirmed on a device.
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
