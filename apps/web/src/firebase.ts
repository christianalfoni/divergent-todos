import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  type FirestoreDataConverter,
  QueryDocumentSnapshot,
  type SnapshotOptions,
  Timestamp,
  collection,
  FieldValue,
} from "firebase/firestore";
import { getFunctions } from "firebase/functions";
// import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'

const firebaseConfig = {
  apiKey: "AIzaSyB-AL-doPbwouEQnPdhzal5E7QiEF10kX8",
  authDomain: "divergent-todos.firebaseapp.com",
  projectId: "divergent-todos",
  storageBucket: "divergent-todos.firebasestorage.app",
  messagingSenderId: "743678931261",
  appId: "1:743678931261:web:d27461ad19ffb981d49554",
  measurementId: "G-H7SMY53091",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

// Example callable usage:
// export const doPrivilegedThing = httpsCallable(functions, 'doPrivilegedThing')

// Todo type definition
export interface Todo {
  id: string;
  userId: string;
  description: string;
  completed: boolean;
  date: Date;
  position: string; // Fractional index for ordering
  createdAt: Date;
  updatedAt: Date;
}

// Firestore data format (with Timestamps instead of Dates)
interface TodoFirestore {
  userId: string;
  description: string;
  completed: boolean;
  date: Timestamp;
  position: string; // Fractional index for ordering
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Firestore converter for Todo
const todoConverter: FirestoreDataConverter<Todo> = {
  toFirestore: (
    todo: Todo & { createdAt: FieldValue; updatedAt: FieldValue }
  ): TodoFirestore => {
    return {
      userId: todo.userId,
      description: todo.description,
      completed: todo.completed,
      date: Timestamp.fromDate(todo.date),
      position: todo.position,
      createdAt:
        todo.createdAt instanceof Date
          ? Timestamp.fromDate(todo.createdAt)
          : todo.createdAt,
      updatedAt:
        todo.updatedAt instanceof Date
          ? Timestamp.fromDate(todo.updatedAt)
          : todo.updatedAt,
    };
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot<TodoFirestore>,
    options?: SnapshotOptions
  ): Todo => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      userId: data.userId,
      description: data.description,
      completed: data.completed,
      date: data.date.toDate(),
      position: data.position,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  },
};

export const todosCollection = collection(db, "todos").withConverter(
  todoConverter
);

/*
// App Check (optional; more common on web)
initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
  isTokenAutoRefreshEnabled: true,
})
*/
