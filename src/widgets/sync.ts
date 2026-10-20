import type { MahamiWidgetProps } from './widget-props';

// Home-screen widgets exist only on iOS. Metro resolves sync.ios.ts there; every
// other platform gets these no-ops, so expo-widgets is never bundled for web or
// Android.

export function pushWidget(_props: MahamiWidgetProps) {}

export async function readWidgetCompletions(): Promise<string[]> {
  return [];
}

export function onWidgetCompletion(_handler: (taskId: string) => void) {
  return () => undefined;
}
