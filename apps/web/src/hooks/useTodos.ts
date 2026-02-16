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

            if (!isFromCache) {
              // Got server data - we're connected!
              console.log('[Todos] Data synced from server - connection healthy');

              // Clear any pending stale detection timeout
              if (staleTimeoutRef.current) {
                clearTimeout(staleTimeoutRef.current);
                staleTimeoutRef.current = null;
              }

              // Reset reconnect attempt flag when we get server data
              reconnectAttemptedRef.current = false;
              isReconnectingRef.current = false;

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
              // Cached data - start monitoring for stale connection
              console.log('[Todos] Data from cache - monitoring connection health');

              // Always update the data immediately (from cache)
              setTodos((state) => ({
                isLoading: false,
                data: snapshot.docs.map((doc) =>
                  doc.data({ serverTimestamps: "estimate" })
                ),
                connectionStatus: state.connectionStatus, // Keep current status
                connectionError: null,
              }));

              // Only start stale detection if we don't already have a timeout running
              if (!staleTimeoutRef.current && !isReconnectingRef.current) {
                const timeoutDuration = reconnectAttemptedRef.current
                  ? RECONNECT_TIMEOUT_MS
                  : STALE_TIMEOUT_MS;

                staleTimeoutRef.current = setTimeout(async () => {
                  if (!reconnectAttemptedRef.current) {
                    // First timeout - attempt reconnect
                    console.warn('[Todos] No server data received - attempting reconnect');
                    reconnectAttemptedRef.current = true;
                    isReconnectingRef.current = true;

                    try {
                      // Cycle the network connection
                      console.log('[Todos] Disabling network...');
                      await disableNetwork(db);
                      await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause
                      console.log('[Todos] Re-enabling network...');
                      await enableNetwork(db);
                      console.log('[Todos] Reconnect cycle complete - waiting for server data');
                      isReconnectingRef.current = false;

                      // Start another timeout to see if reconnect worked
                      staleTimeoutRef.current = null;
                    } catch (error) {
                      console.error('[Todos] Reconnect failed:', error);
                      isReconnectingRef.current = false;
                      setTodos((state) => ({
                        ...state,
                        connectionStatus: 'disconnected',
                        connectionError: 'Reconnection failed',
                      }));
                      staleTimeoutRef.current = null;
                    }
                  } else {
                    // Second timeout after reconnect - show disconnected
                    console.error('[Todos] Reconnect attempt did not restore connection');
                    setTodos((state) => ({
                      ...state,
                      connectionStatus: 'disconnected',
                      connectionError: 'Unable to connect to server',
                    }));
                    staleTimeoutRef.current = null;
                  }
                }, timeoutDuration);
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
      if (document.hidden && staleTimeoutRef.current) {
        console.log('[Todos] App hidden - clearing stale detection timeout');
        clearTimeout(staleTimeoutRef.current);
        staleTimeoutRef.current = null;
        // Reset reconnect state when user tabs away
        reconnectAttemptedRef.current = false;
        isReconnectingRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Clean up timeout on unmount
      if (staleTimeoutRef.current) {
        clearTimeout(staleTimeoutRef.current);
      }
    };
  }, []);

  return { isLoading, data, connectionStatus, connectionError, setTodos } as const;
}
