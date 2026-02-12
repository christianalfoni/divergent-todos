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

export function useTodos() {
  const [authentication] = useAuthentication();
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
            // Determine connection status from metadata
            let status: ConnectionStatus;
            if (snapshot.metadata.fromCache && !snapshot.metadata.hasPendingWrites) {
              // Data is from cache only - we're likely offline
              status = 'disconnected';
              console.warn('[Todos] Data loaded from cache - may be offline');
            } else if (!snapshot.metadata.fromCache) {
              // Data is from server - we're online
              status = 'connected';
              console.log('[Todos] Data synced from server - online');
            } else {
              // Has pending writes - connecting
              status = 'connecting';
            }

            setTodos(() => ({
              isLoading: false,
              data: snapshot.docs.map((doc) =>
                doc.data({ serverTimestamps: "estimate" })
              ),
              connectionStatus: status,
              connectionError: null,
            }));
          },
          (error) => {
            // Handle Firestore listener errors
            console.error('[Todos] Firestore listener error:', error);
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

  return { isLoading, data, connectionStatus, connectionError, setTodos } as const;
}
