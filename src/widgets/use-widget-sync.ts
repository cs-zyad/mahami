import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/contexts/auth-context';
import { useRoutines } from '@/contexts/routines-context';
import { useTasks } from '@/contexts/tasks-context';
import { useTheme } from '@/contexts/theme-context';

import { onWidgetCompletion, pushWidget, readWidgetCompletions } from './sync';
import { buildWidgetProps } from './widget-props';

/**
 * Keeps the home-screen widget in step with the app.
 *
 * A widget button runs its AppIntent inside the widget extension — a separate
 * OS process from the app, always, whether the app is closed, backgrounded, or
 * even foregrounded (the home screen widget can only be tapped while the app
 * is off-screen in the first place). The extension posts its own
 * NotificationCenter.default event on a tap, but that is process-local: it
 * never reaches the app, so onWidgetCompletion below cannot be relied on as
 * the primary path and is kept only as a defensive extra.
 *
 * The one moment guaranteed to follow any widget tap is the app coming back to
 * the foreground. So the drain — reading pendingDone back out of the widget's
 * storage and writing it to Supabase — runs on cold launch *and* every time
 * AppState turns 'active', not once per session. Running it repeatedly is
 * safe: finish() below is a no-op for a task the app already has as completed.
 */
export function useWidgetSync() {
  const { session } = useAuth();
  const { tasks, loading, toggleTask } = useTasks();
  const { routines, completions } = useRoutines();
  const { palette } = useTheme();

  const latest = useRef({ tasks, routines, completions, palette, toggleTask });
  // Finished from the widget but not yet saved; kept in the snapshot so the
  // widget goes on showing them done.
  const unsynced = useRef(new Set<string>());
  const inFlight = useRef(new Set<string>());
  const draining = useRef(false);
  const everDrained = useRef(false);

  useEffect(() => {
    latest.current = { tasks, routines, completions, palette, toggleTask };
  }, [tasks, routines, completions, palette, toggleTask]);

  const push = useRef(() => {
    const { tasks: t, routines: r, completions: c, palette: p } = latest.current;
    pushWidget(
      buildWidgetProps({
        signedIn: true,
        // Tapping the widget opens today's tasks — the same list it shows.
        link: Linking.createURL('/tasks', { queryParams: { view: 'today' } }),
        tasks: t,
        routines: r,
        completions: c,
        palette: p,
        pendingDone: [...unsynced.current],
      }),
    );
  });

  const finish = useRef(async (taskId: string) => {
    if (inFlight.current.has(taskId)) return;
    const task = latest.current.tasks.find((item) => item.id === taskId);
    // Only a still-pending task is sent; one the app already completed must not
    // be reopened by the flip. This is also what makes repeated drains safe.
    if (!task || task.status !== 'pending') {
      unsynced.current.delete(taskId);
      return;
    }
    inFlight.current.add(taskId);
    try {
      const result = await latest.current.toggleTask(taskId);
      if (result.saved) unsynced.current.delete(taskId);
      else unsynced.current.add(taskId);
    } finally {
      inFlight.current.delete(taskId);
    }
  });

  const drainAndPush = useRef(async () => {
    if (draining.current) return;
    draining.current = true;
    try {
      const ids = await readWidgetCompletions();
      for (const id of ids) {
        unsynced.current.add(id);
        await finish.current(id);
      }
    } finally {
      everDrained.current = true;
      draining.current = false;
      push.current();
    }
  });

  // Signed out: the widget asks the user to sign in, and nothing is drained.
  useEffect(() => {
    if (session) return;
    everDrained.current = false;
    unsynced.current.clear();
    pushWidget(
      buildWidgetProps({
        signedIn: false,
        link: Linking.createURL('/login'),
        tasks: [],
        routines: [],
        completions: [],
        palette,
      }),
    );
  }, [session, palette]);

  // Cold launch, and after that every local change (a task edited in the app
  // itself) just pushes — it does not need to re-read the widget's storage.
  useEffect(() => {
    if (!session || loading) return;
    if (everDrained.current) {
      push.current();
      return;
    }
    void drainAndPush.current();
  }, [session, loading, tasks, routines, completions, palette]);

  // The moment that actually follows a widget tap: returning to the app.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (!session) return;
      if (state === 'active') void drainAndPush.current();
      else if (state === 'background' && everDrained.current) push.current();
    });
    return () => subscription.remove();
  }, [session]);

  // Kept defensively in case a future iOS/expo-widgets version delivers this
  // in-process after all; not relied on for the home-screen widget today.
  useEffect(
    () =>
      onWidgetCompletion((taskId) => {
        unsynced.current.add(taskId);
        void finish.current(taskId).then(() => push.current());
      }),
    [],
  );
}
