import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';

import { useAuth } from '@/contexts/auth-context';
import { useRoutines } from '@/contexts/routines-context';
import { useTasks } from '@/contexts/tasks-context';
import { useTheme } from '@/contexts/theme-context';

import { onWidgetCompletion, pushWidget, readWidgetCompletions } from './sync';
import { buildWidgetProps } from './widget-props';

/**
 * Keeps the home-screen widget in step with the app.
 *
 * Order matters on launch. A task finished from the widget while the app was
 * closed lives only in the widget's persisted props. Pushing a fresh snapshot
 * first would overwrite it with Supabase's copy, where the task is still
 * pending — so the tap would silently undo itself. Completions are drained
 * first; only then does the app start pushing.
 *
 * toggleTask flips a task rather than setting it, so a completion must never be
 * applied twice: one drain runs at a time, and each id is in flight at most once.
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
  const drained = useRef(false);
  const draining = useRef(false);

  useEffect(() => {
    latest.current = { tasks, routines, completions, palette, toggleTask };
  }, [tasks, routines, completions, palette, toggleTask]);

  const push = useRef(() => {
    const { tasks: t, routines: r, completions: c, palette: p } = latest.current;
    pushWidget(
      buildWidgetProps({
        signedIn: true,
        link: Linking.createURL('/home'),
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
    // be reopened by the flip.
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

  // Signed out: the widget asks the user to sign in, and nothing is drained.
  useEffect(() => {
    if (session) return;
    drained.current = false;
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

  useEffect(() => {
    if (!session || loading) return;

    if (drained.current) {
      push.current();
      return;
    }
    if (draining.current) return;

    draining.current = true;
    void (async () => {
      try {
        const ids = await readWidgetCompletions();
        for (const id of ids) {
          unsynced.current.add(id);
          await finish.current(id);
        }
      } finally {
        drained.current = true;
        draining.current = false;
        push.current();
      }
    })();
  }, [session, loading, tasks, routines, completions, palette]);

  // Taps while the app is open are applied straight away.
  useEffect(
    () =>
      onWidgetCompletion((taskId) => {
        unsynced.current.add(taskId);
        void finish.current(taskId).then(() => push.current());
      }),
    [],
  );
}
