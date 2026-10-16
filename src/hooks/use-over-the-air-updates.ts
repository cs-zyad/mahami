import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

// expo-updates already fetches on launch and applies on the next one, so a fix
// would reach a user only the second time they open the app. Checking again
// when the app returns to the foreground halves that: a user who switches away
// and back gets the new bundle on the spot.
//
// The reload happens only on that transition, never while someone is in the
// middle of something.
export function useOverTheAirUpdates() {
  const checking = useRef(false);

  useEffect(() => {
    // False in Expo Go and in development builds, where the bundle comes from
    // Metro and reloading would fight the dev server.
    if (!Updates.isEnabled) return;

    const check = async () => {
      if (checking.current) return;
      checking.current = true;
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (!isAvailable) return;
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      } catch {
        // Offline, or the update server is unreachable. The app keeps running
        // on the bundle it has and tries again next time.
      } finally {
        checking.current = false;
      }
    };

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void check();
    });

    return () => subscription.remove();
  }, []);
}
