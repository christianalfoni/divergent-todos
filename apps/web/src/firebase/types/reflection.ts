import {
  type FirestoreDataConverter,
  QueryDocumentSnapshot,
  type SnapshotOptions,
  Timestamp,
} from "firebase/firestore";
import type { CompletedTodo } from "./activity";

// Week note grouping related todos
export interface WeekNote {
  title: string; // Brief title for this group of related work
  summary: string; // 1-2 sentence summary of the work
  tags: string[]; // Combined tags from grouped todos
}

// Reflection week type definition
export interface ReflectionWeek {
  id: string;
  userId: string;
  year: number;
  week: number; // Sequential week number (1-52)
  month: number; // Month number (0-11) for grouping
  completedTodos: CompletedTodo[];
  incompleteCount: number; // Number of incomplete todos from the week
  notes: WeekNote[]; // AI-generated notes grouping related work
  notesGeneratedAt?: Date;
  updatedAt: Date;
}

// Firestore data format (with Timestamps instead of Dates)
interface ReflectionWeekFirestore {
  userId: string;
  year: number;
  week: number;
  month: number;
  completedTodos: CompletedTodo[];
  incompleteCount: number;
  notes: WeekNote[];
  notesGeneratedAt?: Timestamp;
  updatedAt: Timestamp;
}

// Firestore converter for ReflectionWeek
export const reflectionWeekConverter: FirestoreDataConverter<ReflectionWeek> = {
  toFirestore: (reflectionWeek: ReflectionWeek): ReflectionWeekFirestore => {
    return {
      userId: reflectionWeek.userId,
      year: reflectionWeek.year,
      week: reflectionWeek.week,
      month: reflectionWeek.month,
      completedTodos: reflectionWeek.completedTodos,
      incompleteCount: reflectionWeek.incompleteCount,
      notes: reflectionWeek.notes,
      notesGeneratedAt: reflectionWeek.notesGeneratedAt
        ? Timestamp.fromDate(reflectionWeek.notesGeneratedAt)
        : undefined,
      updatedAt: Timestamp.fromDate(reflectionWeek.updatedAt),
    };
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot<ReflectionWeekFirestore>,
    options?: SnapshotOptions
  ): ReflectionWeek => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      userId: data.userId,
      year: data.year,
      week: data.week,
      month: data.month,
      completedTodos: data.completedTodos || [],
      incompleteCount: data.incompleteCount || 0,
      notes: data.notes || [],
      notesGeneratedAt: data.notesGeneratedAt?.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  },
};
