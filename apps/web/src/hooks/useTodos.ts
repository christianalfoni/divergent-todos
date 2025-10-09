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

export type TodosState = {
  isLoading: boolean;
  data: Todo[];
};

export function useTodos() {
  const [authentication] = useAuthentication();
  const [{ isLoading, data }, setTodos] = pipe<
    (todos: TodosState) => TodosState,
    TodosState
  >()
    .updateState((state, cb) => cb(state))
    .use(
      {
        isLoading: true,
        data: [],
      },
      "todos",
      () => {
        if (!authentication.user) {
          setTodos(() => ({
            isLoading: false,
            data: [],
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

        return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
          setTodos(() => ({
            isLoading: false,
            data: snapshot.docs.map((doc) =>
              doc.data({ serverTimestamps: "estimate" })
            ),
          }));
        });
      },
      [authentication.user]
    );

  return { isLoading, data, setTodos } as const;
}
