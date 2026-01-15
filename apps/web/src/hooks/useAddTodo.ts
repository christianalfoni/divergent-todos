import { pipe } from "pipesy";
import { todosCollection, profilesCollection } from "../firebase";
import {
  doc,
  serverTimestamp,
  setDoc,
  increment,
  writeBatch,
} from "firebase/firestore";
import { useAuthentication } from "./useAuthentication";
import { useRef } from "react";
import { generateKeyBetween } from "fractional-indexing";

export type AddTodoState =
  | {
      isAdding: true;
      error: null;
    }
  | {
      isAdding: false;
      error: null;
    }
  | {
      isAdding: false;
      error: string;
    };

export function useAddTodo() {
  const [authentication] = useAuthentication();
  const userRef = useRef(authentication.user);
  const profileRef = useRef(authentication.profile);

  userRef.current = authentication.user;
  profileRef.current = authentication.profile;

  return pipe<
    { description: string; date: Date; firstPosition?: string | null; position?: string; docId?: string; completed?: boolean },
    AddTodoState
  >()
    .setState({ isAdding: true, error: null })
    .async(({ description, date, firstPosition, position: providedPosition, docId, completed }) => {
      const todoDoc = docId ? doc(todosCollection, docId) : doc(todosCollection);

      if (!userRef.current) {
        throw new Error("can not add todo without a user");
      }

      // Use provided position or generate position for new todo at the top of the day
      const position = providedPosition || generateKeyBetween(null, firstPosition || null);

      // Check if user has an active subscription
      const hasActiveSubscription =
        profileRef.current?.subscription?.status === "active";

      // If no subscription, increment freeTodoCount (applies to both web and desktop)
      if (!hasActiveSubscription) {
        const batch = writeBatch(todosCollection.firestore);

        // Add the todo
        const todoData = {
          id: todoDoc.id,
          userId: userRef.current.uid,
          description,
          completed: completed ?? false,
          date,
          position,
          moveCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        batch.set(todoDoc, todoData);

        // Increment freeTodoCount
        const profileDoc = doc(profilesCollection, userRef.current.uid);
        batch.set(profileDoc, { freeTodoCount: increment(1) }, { merge: true });

        return batch.commit();
      }

      // User has subscription, just add the todo
      const todoData = {
        id: todoDoc.id,
        userId: userRef.current.uid,
        description,
        completed: completed ?? false,
        date,
        position,
        moveCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      return setDoc(todoDoc, todoData);
    })
    .map(() => ({ isAdding: false, error: null }))
    .catch((err) => {
      console.error('Error adding todo:', err);
      return { isAdding: false, error: String(err) };
    })
    .use({ isAdding: false, error: null });
}
