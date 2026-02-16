import { useEffect, useRef } from "react";
import { pipe } from "pipesy";
import { todosCollection, type Todo, db } from "../firebase";
import {
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  or,
  and,
  disableNetwork,
  enableNetwork,
} from "firebase/firestore";
import { useAuthentication } from "./useAuthentication";
import { getCurrentWeekStart, getNextWeekEnd } from "../utils/calendar";

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

export type TodosState = {
  isLoading: boolean;
  data: Todo[];
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
};

// How long to wait for server data before attempting reconnect
const STALE_TIMEOUT_MS = 10000; // 10 seconds
// How long to wait after reconnect attempt before showing disconnected
const RECONNECT_TIMEOUT_MS = 5000; // 5 seconds

export function useTodos() {
  const [authentication] = useAuthentication();
  const staleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptedRef = useRef<boolean>(false);
  const isReconnectingRef = useRef<boolean>(false);

  const [{ isLoading, data, connectionStatus, connectionError }, setTodos] = pipe<
    (todos: TodosState) => TodosState,
    TodosState
  >()
    .updateState((state, cb) => cb(state))
    .use(
      {
        isLoading: true,
        data: [],
        connectionStatus: 'connecting' as ConnectionStatus,
        connectionError: null,
      },
      "todos",
      () => {
        if (!authentication.user) {
          setTodos(() => ({
            isLoading: authentication.isAuthenticating,
            data: [],
            connectionStatus: 'connected' as ConnectionStatus,
            connectionError: null,
          }));
          return;
        }

        const currentWeekStart = getCurrentWeekStart();
        const nextWeekEnd = getNextWeekEnd();

        const q = query(
          todosCollection,
          and(
            where("userId", "==", authentication.user.uid),
            or(
              where("completed", "==", false),
              and(
                where("completed", "==", true),
                where("date", ">=", Timestamp.fromDate(currentWeekStart)),
                where("date", "<=", Timestamp.fromDate(nextWeekEnd))
              )
            )
          ),
          orderBy("date", "asc"),
          orderBy("position", "asc")
        );

        return onSnapshot(
          q,
          { includeMetadataChanges: true },
          async (snapshot) => {
            const isFromCache = snapshot.metadata.fromCache;
            const docCount = snapshot.docs.length;

            console.log(`[Todos] Snapshot received: fromCache=${isFromCache}, docs=${docCount}, hasPendingWrites=${snapshot.metadata.hasPendingWrites}`);

            if (!isFromCache) {
              // Got server data - we're connected!
              console.log('[Todos] ✅ Server data received - connection healthy');

              // Clear any pending stale detection timeout
              if (staleTimeoutRef.current) {
                console.log('[Todos] Clearing stale timeout - server confirmed');
                clearTimeout(staleTimeoutRef.current);
                staleTimeoutRef.current = null;
              }

              // Reset reconnect flags when we get server data
              const wasReconnecting = reconnectAttemptedRef.current;
              reconnectAttemptedRef.current = false;
              isReconnectingRef.current = false;

              if (wasReconnecting) {
                console.log('[Todos] ✅ Reconnect successful!');
              }

              // Update state to show we're connected
              setTodos(() => ({
                isLoading: false,
                data: snapshot.docs.map((doc) =>
                  doc.data({ serverTimestamps: "estimate" })
                ),
                connectionStatus: 'connected',
                connectionError: null,
              }));
            } else {
              // Cached data - monitor for stale connection
              console.log('[Todos] ⚠️  Cache data received - monitoring connection');

              // Update data but keep monitoring status
              setTodos((state) => ({
                isLoading: false,
                data: snapshot.docs.map((doc) =>
                  doc.data({ serverTimestamps: "estimate" })
                ),
                // Keep 'connected' if we just got data, but not if we're already monitoring
                connectionStatus: state.connectionStatus === 'connecting' ? 'connecting' : state.connectionStatus,
                connectionError: null,
              }));

              // Only start stale detection if we don't already have a timeout running
              if (!staleTimeoutRef.current && !isReconnectingRef.current) {
                const isFirstAttempt = !reconnectAttemptedRef.current;
                const timeoutDuration = isFirstAttempt ? STALE_TIMEOUT_MS : RECONNECT_TIMEOUT_MS;

                console.log(`[Todos] 🕐 Starting ${isFirstAttempt ? 'stale' : 'reconnect'} timeout (${timeoutDuration}ms)`);

                staleTimeoutRef.current = setTimeout(async () => {
                  staleTimeoutRef.current = null;

                  if (!reconnectAttemptedRef.current) {
                    // First timeout - attempt reconnect
                    console.warn('[Todos] ⏰ Stale timeout fired - no server data received');
                    console.log('[Todos] 🔄 Attempting reconnect...');

                    reconnectAttemptedRef.current = true;
                    isReconnectingRef.current = true;

                    try {
                      // Cycle the network connection
                      console.log('[Todos] 📴 Disabling network...');
                      await disableNetwork(db);

                      console.log('[Todos] ⏳ Waiting 100ms...');
                      await new Promise(resolve => setTimeout(resolve, 100));

                      console.log('[Todos] 📡 Re-enabling network...');
                      await enableNetwork(db);

                      console.log('[Todos] ✅ Network cycle complete');
                      isReconnectingRef.current = false;

                      // Start the second timeout immediately
                      console.log(`[Todos] 🕐 Starting post-reconnect timeout (${RECONNECT_TIMEOUT_MS}ms)`);
                      staleTimeoutRef.current = setTimeout(() => {
                        console.error('[Todos] ⏰ Post-reconnect timeout fired - still no server data');
                        console.error('[Todos] ❌ Showing disconnected notification');

                        setTodos((state) => ({
                          ...state,
                          connectionStatus: 'disconnected',
                          connectionError: 'Unable to connect to server',
                        }));

                        staleTimeoutRef.current = null;
                      }, RECONNECT_TIMEOUT_MS);

                    } catch (error) {
                      console.error('[Todos] ❌ Reconnect attempt failed:', error);
                      isReconnectingRef.current = false;
                      setTodos((state) => ({
                        ...state,
                        connectionStatus: 'disconnected',
                        connectionError: 'Reconnection failed',
                      }));
                    }
                  }
                }, timeoutDuration);
              } else {
                console.log(`[Todos] ⏭️  Skipping timeout creation - already have one or reconnecting (timeout=${!!staleTimeoutRef.current}, reconnecting=${isReconnectingRef.current})`);
              }
            }
          },
          (error) => {
            // Handle Firestore listener errors
            console.error('[Todos] Firestore listener error:', error);

            // Clear timeout on error
            if (staleTimeoutRef.current) {
              clearTimeout(staleTimeoutRef.current);
              staleTimeoutRef.current = null;
            }

            reconnectAttemptedRef.current = false;
            isReconnectingRef.current = false;

            setTodos((state) => ({
              ...state,
              isLoading: false,
              connectionStatus: 'disconnected',
              connectionError: error.message,
            }));
          }
        );
      },
      [authentication.user]
    );

  // Clear timeout when app goes hidden (user tabbed away during monitoring)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('[Todos] 👁️  App hidden');
        if (staleTimeoutRef.current) {
          console.log('[Todos] 🧹 Clearing stale detection timeout');
          clearTimeout(staleTimeoutRef.current);
          staleTimeoutRef.current = null;
        }
        // Reset reconnect state when user tabs away
        if (reconnectAttemptedRef.current || isReconnectingRef.current) {
          console.log('[Todos] 🔄 Resetting reconnect state');
          reconnectAttemptedRef.current = false;
          isReconnectingRef.current = false;
        }
      } else {
        console.log('[Todos] 👁️  App visible');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Clean up timeout on unmount
      if (staleTimeoutRef.current) {
        console.log('[Todos] 🧹 Cleanup: clearing timeout on unmount');
        clearTimeout(staleTimeoutRef.current);
      }
    };
  }, []);

  return { isLoading, data, connectionStatus, connectionError, setTodos } as const;
}
