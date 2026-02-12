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
          // ALWAYS enable network when app becomes visible
          // Don't check state - just force reconnection to ensure fresh connection
          console.log('[Firestore] App visible - forcing network reconnection');
          await enableNetwork(db);
          console.log('[Firestore] Network successfully re-enabled');
        }
      } catch (error) {
        console.error('[Firestore] Error managing network state:', error);
        // Try to recover by enabling network
        try {
          await enableNetwork(db);
          console.log('[Firestore] Network recovery successful');
        } catch (recoveryError) {
          console.error('[Firestore] Failed to recover network connection:', recoveryError);
        }
      }
    };

    const handleFocus = async () => {
      // Extra reliability: also handle window focus events
      // This catches cases where visibility API might not fire
      // ALWAYS try to enable network on focus
      try {
        console.log('[Firestore] Window focused - forcing network reconnection');
        await enableNetwork(db);
        console.log('[Firestore] Network successfully enabled on focus');
      } catch (error) {
        console.error('[Firestore] Error enabling network on focus:', error);
      }
    };

    // Ensure network is enabled on mount (handles app restart)
    const initializeNetwork = async () => {
      try {
        console.log('[Firestore] Initializing - forcing network connection');
        await enableNetwork(db);
        console.log('[Firestore] Network initialized and enabled');
      } catch (error) {
        console.error('[Firestore] Failed to initialize network:', error);
      }
    };

    initializeNetwork();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
}
