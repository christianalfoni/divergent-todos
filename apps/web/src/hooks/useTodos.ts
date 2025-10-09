import { pipe } from "pipesy";
import { todosCollection, type Todo } from "../firebase";
import { onSnapshot, query, where, orderBy, Timestamp, or, and } from "firebase/firestore";
import { useAuthentication } from "./useAuthentication";
import { useEffect, useState } from "react";
import { getCurrentWeekStart, getNextWeekEnd } from "../utils/calendar";

export function useTodos() {
  const [authentication] = useAuthentication();
  const [isLoading, setIsLoading] = useState(true);

  const [todos, setTodos] = pipe<Todo[], (todos: Todo[]) => Todo[]>()
    .updateState((state, cb) => cb(state))
    .useCache("todos", []);

  useEffect(() => {
    if (!authentication.user) {
      setIsLoading(false);
      setTodos(() => []);
      return;
    }

    // Reset loading state when user changes (e.g., new login)
    setIsLoading(true);

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
      if (!snapshot.metadata.fromCache) {
        setIsLoading(false);
      }
      setTodos(() =>
        snapshot.docs.map((doc) => doc.data({ serverTimestamps: "estimate" }))
      );
    });
  }, [authentication.user, setTodos]);

  return { isLoading, data: todos, setTodos } as const;
}
