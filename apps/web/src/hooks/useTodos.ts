import { pipe } from "pipesy";
import { todosCollection, type Todo } from "../firebase";
import { onSnapshot, query, where, orderBy } from "firebase/firestore";
import { useAuthentication } from "./useAuthentication";

export function useTodos() {
  const [authentication] = useAuthentication();

  if (!authentication.user) {
    return [];
  }

  const [todos] = pipe<Todo[]>()
    .setState()
    .useCache("todos", [], (emit) => {
      const q = query(
        todosCollection,
        where("userId", "==", authentication.user!.uid),
        orderBy("date", "asc"),
        orderBy("position", "asc")
      );

      return onSnapshot(q, { includeMetadataChanges: false }, (snapshot) => {
        emit(snapshot.docs.map((doc) => doc.data({ serverTimestamps: 'estimate' })));
      });
    });

  return todos;
}
