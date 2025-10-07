import { pipe } from "pipesy";
import { todosCollection, type Todo } from "../firebase";
import { onSnapshot, query, where, orderBy } from "firebase/firestore";
import { useAuthentication } from "./useAuthentication";
import { useEffect } from "react";

export function useTodos() {
  const [authentication] = useAuthentication();

  const [todos, setTodos] = pipe<Todo[], (todos: Todo[]) => Todo[]>()
    .updateState((state, cb) => cb(state))
    .useCache("todos", []);

  useEffect(() => {
    const q = query(
      todosCollection,
      where("userId", "==", authentication.user!.uid),
      orderBy("date", "asc"),
      orderBy("position", "asc")
    );

    return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      setTodos(() =>
        snapshot.docs.map((doc) => doc.data({ serverTimestamps: "estimate" }))
      );
    });
  }, [authentication.user, setTodos]);

  return [todos, setTodos] as const;
}
