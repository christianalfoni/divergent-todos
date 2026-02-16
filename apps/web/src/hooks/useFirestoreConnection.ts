import { useEffect } from 'react';
import { enableNetwork } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Initializes Firestore network connection.
 *
 * This hook only ensures the network is enabled on mount. It does NOT
 * force disconnect/reconnect on focus/visibility changes, as that was
 * causing race conditions and sync issues.
 *
 * Connection monitoring and recovery is now handled by useTodos hook,
 * which passively detects when snapshots stop updating and only intervenes
 * if necessary.
 */
export function useFirestoreConnection() {
  useEffect(() => {
    // Ensure network is enabled on mount (handles app restart)
    const initializeNetwork = async () => {
      try {
        console.log('[Firestore] Initializing - enabling network');
        await enableNetwork(db);
        console.log('[Firestore] Network initialized and enabled');
      } catch (error) {
        console.error('[Firestore] Failed to initialize network:', error);
      }
    };

    initializeNetwork();
  }, []);
}
