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
import { AuthenticationContext } from "../contexts/AuthenticationContext";
import { getCurrentWeekStart, getNextWeekEnd } from "../utils/calendar";
import { assignState, useEffect, useState } from "rask-ui";

export type TodosState = {
  isLoading: boolean;
  data: Todo[];
};

export function useTodos() {
  const authentication = AuthenticationContext.use();
  const state = useState({
    isLoading: true,
    data: [] as Todo[],
  });

  useEffect(() => {
    if (!authentication.user) {
      assignState(state, {
        isLoading: authentication.isAuthenticating,
        data: [],
      });
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
      assignState(state, {
        isLoading: false,
        data: snapshot.docs.map((doc) =>
          doc.data({ serverTimestamps: "estimate" })
        ),
      });
    });
  });

  return state;
}
