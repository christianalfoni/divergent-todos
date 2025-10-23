import { useEffect, useRef } from 'react';

/**
 * Hook that triggers a callback when the app regains focus AND the day has changed
 * since the last focus. This prevents unnecessary refetches when switching tabs
 * within the same day.
 */
export function useAppFocus(callback: () => void) {
  const lastFocusDate = useRef<string | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Get current date as string (YYYY-MM-DD)
        const currentDate = new Date().toISOString().split('T')[0];

        // Only trigger callback if day has changed since last focus
        if (lastFocusDate.current !== currentDate) {
          lastFocusDate.current = currentDate;
          callback();
        }
      }
    };

    // Initialize with current date
    lastFocusDate.current = new Date().toISOString().split('T')[0];

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [callback]);
}
