import { pipe } from "pipesy";
import { todosCollection, profilesCollection } from "../firebase";
import { doc, serverTimestamp, setDoc, increment, writeBatch } from "firebase/firestore";
import { useAuthentication } from "./useAuthentication";
import { useRef } from "react";
import { generateKeyBetween } from "fractional-indexing";
import { useProfile } from "./useProfile";

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
  const authentication = useAuthentication();
  const profile = useProfile();
  const userRef = useRef(authentication.user);
  const profileRef = useRef(profile);

  userRef.current = authentication.user;
  profileRef.current = profile;

  return pipe<
    AddTodoState,
    { description: string; date: Date; lastPosition: string | null }
  >()
    .setState({ isAdding: true, error: null })
    .async(({ description, date, lastPosition }) => {
      const todoDoc = doc(todosCollection);

      if (!userRef.current) {
        throw new Error("can not add todo without a user");
      }

      // Generate position for new todo at the end of the day
      const position = generateKeyBetween(lastPosition, null);

      // Check if user has an active subscription
      const hasActiveSubscription = profileRef.current?.subscription?.status === "active";

      // If no subscription, increment freeTodoCount
      if (!hasActiveSubscription) {
        const batch = writeBatch(todosCollection.firestore);

        // Add the todo
        batch.set(doc(todosCollection.firestore, "todos", todoDoc.id), {
          userId: userRef.current.uid,
          description,
          completed: false,
          date,
          position,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // Increment freeTodoCount
        const profileDoc = doc(profilesCollection, userRef.current.uid);
        batch.set(profileDoc, { freeTodoCount: increment(1) }, { merge: true });

        return batch.commit();
      }

      // User has subscription, just add the todo
      return setDoc(doc(todosCollection.firestore, "todos", todoDoc.id), {
        userId: userRef.current.uid,
        description,
        completed: false,
        date,
        position,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    })
    .map(() => ({ isAdding: false, error: null }))
    .catch((err) => ({ isAdding: false, error: String(err) }))
    .use({ isAdding: false, error: null });
}
