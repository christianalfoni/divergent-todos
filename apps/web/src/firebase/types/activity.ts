import {
  type FirestoreDataConverter,
  QueryDocumentSnapshot,
  type SnapshotOptions,
  Timestamp,
} from "firebase/firestore";

// Completed todo details for activity tracking
export interface CompletedTodo {
  date: string; // ISO date (YYYY-MM-DD)
  text: string; // Todo description/HTML
  createdAt: string; // ISO timestamp
  completedAt: string; // ISO timestamp
  moveCount: number; // Times rescheduled
  completedWithTimeBox: boolean; // Completed during time-boxed session
  hasUrl: boolean; // Has external link
  tags: string[]; // Extracted tag pills (without # prefix)
}

// Activity week type definition
export interface ActivityWeek {
  id: string;
  userId: string;
  year: number;
  week: number; // Sequential week number (1-52)
  month: number; // Month number (0-11) for grouping
  completedTodos: CompletedTodo[];
  aiSummary?: string; // Attention reflection summary
  /** @deprecated No longer generated - use aiSummary instead */
  aiPersonalSummary?: string;
  aiSummaryGeneratedAt?: Date;
  updatedAt: Date;
}

// Firestore data format (with Timestamps instead of Dates)
interface ActivityWeekFirestore {
  userId: string;
  year: number;
  week: number;
  month: number;
  completedTodos: CompletedTodo[];
  aiSummary?: string;
  /** @deprecated No longer generated - use aiSummary instead */
  aiPersonalSummary?: string;
  aiSummaryGeneratedAt?: Timestamp;
  updatedAt: Timestamp;
}

// Firestore converter for ActivityWeek
export const activityWeekConverter: FirestoreDataConverter<ActivityWeek> = {
  toFirestore: (activityWeek: ActivityWeek): ActivityWeekFirestore => {
    return {
      userId: activityWeek.userId,
      year: activityWeek.year,
      week: activityWeek.week,
      month: activityWeek.month,
      completedTodos: activityWeek.completedTodos,
      aiSummary: activityWeek.aiSummary,
      aiPersonalSummary: activityWeek.aiPersonalSummary,
      aiSummaryGeneratedAt: activityWeek.aiSummaryGeneratedAt
        ? Timestamp.fromDate(activityWeek.aiSummaryGeneratedAt)
        : undefined,
      updatedAt: Timestamp.fromDate(activityWeek.updatedAt),
    };
  },
  fromFirestore: (
    snapshot: QueryDocumentSnapshot<ActivityWeekFirestore>,
    options?: SnapshotOptions
  ): ActivityWeek => {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      userId: data.userId,
      year: data.year,
      week: data.week,
      month: data.month,
      completedTodos: data.completedTodos || [],
      aiSummary: data.aiSummary,
      aiPersonalSummary: data.aiPersonalSummary,
      aiSummaryGeneratedAt: data.aiSummaryGeneratedAt?.toDate(),
      updatedAt: data.updatedAt.toDate(),
    };
  },
};
