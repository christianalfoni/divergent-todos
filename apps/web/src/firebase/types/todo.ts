import {
  type FirestoreDataConverter,
  QueryDocumentSnapshot,
  type SnapshotOptions,
  Timestamp,
  FieldValue,
} from "firebase/firestore";

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
  moveCount?: number; // Number of times todo has been moved/rescheduled
  completedAt?: Date; // When the todo was marked complete
  completedWithTimeBox?: boolean; // Whether completed during a time-boxed session
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
  moveCount?: number;
  completedAt?: Timestamp;
  completedWithTimeBox?: boolean;
}

// Firestore converter for Todo
export const todoConverter: FirestoreDataConverter<Todo> = {
  toFirestore: (
    todo: Todo & { createdAt: FieldValue; updatedAt: FieldValue }
  ): TodoFirestore => {
    const result: any = {
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

    // Only include optional fields if they have values
    if (todo.moveCount !== undefined) {
      result.moveCount = todo.moveCount;
    }
    if (todo.completedAt instanceof Date) {
      result.completedAt = Timestamp.fromDate(todo.completedAt);
    }
    if (todo.completedWithTimeBox !== undefined) {
      result.completedWithTimeBox = todo.completedWithTimeBox;
    }

    return result;
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
      moveCount: data.moveCount,
      completedAt: data.completedAt?.toDate(),
      completedWithTimeBox: data.completedWithTimeBox,
    };
  },
};
