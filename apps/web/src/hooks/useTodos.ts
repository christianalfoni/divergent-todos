import { useEffect, useRef } from "react";
import { pipe } from "pipesy";
import { todosCollection, type Todo } from "../firebase";
import {
  onSnapshot,
  query,
  where,
  orderBy,
  Timestamp,
  or,
  and,
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

// How long to wait for server data before showing "disconnected"
const DISCONNECT_TIMEOUT_MS = 3000;

export function useTodos() {
  const [authentication] = useAuthentication();
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
          (snapshot) => {
            if (!snapshot.metadata.fromCache) {
              // Got server data - we're connected!
              console.log('[Todos] Data synced from server - online');

              // Clear any pending disconnect timeout
              if (disconnectTimeoutRef.current) {
                clearTimeout(disconnectTimeoutRef.current);
                disconnectTimeoutRef.current = null;
              }
            } else {
              // Cached data - start timeout to show disconnected if we don't get server data
              console.log('[Todos] Data from cache - waiting for server confirmation');

              if (!disconnectTimeoutRef.current) {
                disconnectTimeoutRef.current = setTimeout(() => {
                  console.warn('[Todos] No server data received - showing disconnected');
                  setTodos((state) => ({
                    ...state,
                    connectionStatus: 'disconnected',
                  }));
                  disconnectTimeoutRef.current = null;
                }, DISCONNECT_TIMEOUT_MS);
              }
            }

            // Always show connected unless timeout expires
            setTodos(() => ({
              isLoading: false,
              data: snapshot.docs.map((doc) =>
                doc.data({ serverTimestamps: "estimate" })
              ),
              connectionStatus: 'connected',
              connectionError: null,
            }));
          },
          (error) => {
            // Handle Firestore listener errors
            console.error('[Todos] Firestore listener error:', error);

            // Clear timeout on error
            if (disconnectTimeoutRef.current) {
              clearTimeout(disconnectTimeoutRef.current);
              disconnectTimeoutRef.current = null;
            }

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

  // Clear timeout when app goes hidden (user tabbed away during grace period)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && disconnectTimeoutRef.current) {
        console.log('[Todos] App hidden - clearing disconnect timeout');
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Clean up timeout on unmount
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
      }
    };
  }, []);

  return { isLoading, data, connectionStatus, connectionError, setTodos } as const;
}
