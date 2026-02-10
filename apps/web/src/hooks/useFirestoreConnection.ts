import { useEffect } from 'react';
import { enableNetwork, disableNetwork } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Manages Firestore network connection state based on app visibility.
 *
 * This hook ensures Firebase properly reconnects after extended periods of inactivity
 * (e.g., after a weekend with the app running in the background). Without this,
 * real-time listeners can become "stale" - writes succeed but listeners don't
 * receive updates until the page is refreshed.
 *
 * Solution: Explicitly disable/enable the network connection when the app
 * loses/regains visibility, forcing a proper reconnection.
 */
export function useFirestoreConnection() {
  useEffect(() => {
    const handleVisibilityChange = async () => {
      try {
        if (document.hidden) {
          console.log('[Firestore] App hidden - disabling network to save resources');
          await disableNetwork(db);
        } else {
          console.log('[Firestore] App visible - enabling network and forcing reconnection');
          await enableNetwork(db);
        }
      } catch (error) {
        console.error('[Firestore] Error managing network state:', error);
      }
    };

    const handleFocus = async () => {
      // Extra reliability: also handle window focus events
      // This catches cases where visibility API might not fire
      try {
        if (!document.hidden) {
          console.log('[Firestore] Window focused - ensuring network is enabled');
          await enableNetwork(db);
        }
      } catch (error) {
        console.error('[Firestore] Error enabling network on focus:', error);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
}
