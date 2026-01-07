import { useCallback } from "react";
import { generateKeyBetween } from "fractional-indexing";
import { doc } from "firebase/firestore";
import { useAddTodo } from "./useAddTodo";
import { useEditTodo } from "./useEditTodo";
import { useBatchEditTodos } from "./useBatchEditTodos";
import { useDeleteTodo } from "./useDeleteTodo";
import { useHittingWood } from "./useHittingWood";
import { useOnboarding } from "../contexts/OnboardingContext";
import { useTodos } from "./useTodos";
import { usePendingTodos } from "./usePendingTodos";
import { sortTodosByPosition } from "../utils/todos";
import type { Todo } from "../App";
import { todosCollection, type Profile } from "../firebase";
import {
  trackTodoCreated,
  trackTodoCompleted,
  trackTodoUncompleted,
  trackTodoEdited,
  trackTodoDeleted,
  trackTodoMoved,
  trackTodoCopied,
  trackFreeLimitReached,
} from "../firebase/analytics";

interface UseTodoOperationsProps {
  profile: Profile | null;
  onShowSubscriptionDialog: () => void;
}

export function useTodoOperations({ profile, onShowSubscriptionDialog }: UseTodoOperationsProps) {
  const { data: firebaseTodos } = useTodos();
  const [, addTodo] = useAddTodo();
  const [, editTodo] = useEditTodo();
  const [, batchEditTodos] = useBatchEditTodos();
  const [, deleteTodo] = useDeleteTodo();
  const hittingWood = useHittingWood();
  const onboarding = useOnboarding();
  const { addPending, removePending, updatePending, getPendingAsTodos } = usePendingTodos();

  const handleAddTodo = useCallback(
    (todo: Omit<Todo, "id" | "position"> & { position?: string }): string | undefined => {
      const dateObj = new Date(todo.date);

      // Check if user has reached the free limit (applies to both web and desktop)
      // Skip limit check during onboarding
      if (!onboarding.isOnboarding) {
        const hasActiveSubscription = profile?.subscription?.status === "active";
        const freeTodoCount = profile?.freeTodoCount ?? 0;

        if (!hasActiveSubscription && freeTodoCount >= 20) {
          trackFreeLimitReached(freeTodoCount);
          onShowSubscriptionDialog();
          return undefined;
        }
      }

      // Generate document ID upfront
      const todoDoc = doc(todosCollection);
      const docId = todoDoc.id;

      // Find last position for this date (including pending todos)
      const allTodosForDate = [
        ...firebaseTodos.filter((t) => t.date.toISOString().split("T")[0] === todo.date),
        ...getPendingAsTodos().filter((t) => t.date === todo.date)
      ];
      const todosForDate = sortTodosByPosition(allTodosForDate);

      const lastPosition = todosForDate.length > 0 ? todosForDate[todosForDate.length - 1].position : null;
      const newPosition = generateKeyBetween(lastPosition, null);

      // Add to pending immediately for optimistic update
      addPending({
        id: docId,
        text: todo.text,
        url: todo.url,
        completed: false,
        date: todo.date,
        position: newPosition,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPending: true,
      });

      // Add to Firebase (with the pre-generated ID and position)
      addTodo({ description: todo.text, date: dateObj, position: newPosition, docId });

      // Track todo creation
      const hasUrl = todo.text.includes('data-url="');
      const hasTag = todo.text.includes('data-tag="');
      trackTodoCreated({
        hasUrl,
        isOnboarding: onboarding.isOnboarding,
      });

      // Advance onboarding steps if applicable
      if (onboarding.isOnboarding) {
        if (hasUrl) {
          onboarding.notifyTodoAddedWithUrl();
        } else if (hasTag) {
          onboarding.notifyTodoAddedWithTag();
        } else {
          onboarding.notifyTodoAdded();
        }
      }

      // Return the new todo ID so it can be selected
      return docId;
    },
    [onboarding, firebaseTodos, profile, addTodo, onShowSubscriptionDialog, addPending, getPendingAsTodos]
  );

  const toggleTodoComplete = useCallback(
    (todoId: string) => {
      const todo = firebaseTodos.find((t) => t.id === todoId);
      if (!todo) return;

      const isCompleting = !todo.completed;

      // Play sound when completing a todo
      if (isCompleting) {
        hittingWood.play();
      }

      // Update Firestore - scheduled function will read these later
      editTodo({
        id: todoId,
        description: todo.description,
        completed: isCompleting,
        date: todo.date,
        completedAt: isCompleting ? new Date() : undefined,
      });

      // Track analytics
      if (isCompleting) {
        trackTodoCompleted({ isOnboarding: onboarding.isOnboarding });
      } else {
        trackTodoUncompleted({ isOnboarding: onboarding.isOnboarding });
      }
    },
    [firebaseTodos, hittingWood, editTodo, onboarding.isOnboarding]
  );

  const addTodoSession = useCallback(
    (todoId: string, minutes: number, deepFocus: boolean) => {
      const todo = firebaseTodos.find((t) => t.id === todoId);
      if (!todo) return;

      // Get existing sessions or initialize empty array
      const existingSessions = todo.sessions || [];

      // Add new session
      const newSessions = [
        ...existingSessions,
        { minutes, deepFocus, createdAt: new Date() },
      ];

      // Update Firestore with sessions array
      editTodo({
        id: todoId,
        description: todo.description,
        completed: todo.completed,
        date: todo.date,
        sessions: newSessions,
      });

      // TODO: Track analytics with trackFocusSessionAdded
    },
    [firebaseTodos, editTodo]
  );

  const moveTodo = useCallback(
    (todoId: string, newDate: string, newIndex?: number) => {
      const todo = firebaseTodos.find((t) => t.id === todoId);
      if (!todo) return;

      // Get todos for target date, sorted by position (excluding the dragged todo)
      const todosInTargetDate = sortTodosByPosition(
        firebaseTodos.filter((t) => t.date.toISOString().split("T")[0] === newDate && t.id !== todoId)
      );

      let newPosition: string;

      if (newIndex === undefined || todosInTargetDate.length === 0) {
        // Moving to a date without specific position - place at end
        const lastTodo = todosInTargetDate[todosInTargetDate.length - 1];
        newPosition = generateKeyBetween(lastTodo?.position || null, null);
      } else {
        // Moving to specific position
        const beforeTodo = todosInTargetDate[newIndex - 1];
        const afterTodo = todosInTargetDate[newIndex];
        newPosition = generateKeyBetween(beforeTodo?.position || null, afterTodo?.position || null);
      }

      // Convert string date to Date object
      const dateObj = new Date(newDate);

      // Increment moveCount only when actually changing dates
      const isChangingDate = todo.date.toISOString().split("T")[0] !== newDate;
      const newMoveCount = isChangingDate ? (todo.moveCount || 0) + 1 : (todo.moveCount || 0);

      editTodo({
        id: todoId,
        description: todo.description,
        completed: todo.completed,
        date: dateObj,
        position: newPosition,
        moveCount: newMoveCount,
      });

      // Track todo movement
      const sameDay = todo.date.toISOString().split("T")[0] === newDate;
      trackTodoMoved({
        sameDay,
        isOnboarding: onboarding.isOnboarding,
      });

      // Notify onboarding if applicable
      if (onboarding.isOnboarding) {
        onboarding.notifyTodoMoved();
      }
    },
    [firebaseTodos, editTodo, onboarding]
  );

  const updateTodo = useCallback(
    (todoId: string, text: string) => {
      // Check if this is a pending todo
      const pendingTodos = getPendingAsTodos();
      const isPending = pendingTodos.some((t) => t.id === todoId);

      if (isPending) {
        // Update in pending state
        updatePending(todoId, text);
      } else {
        // Update in Firebase
        const todo = firebaseTodos.find((t) => t.id === todoId);
        if (!todo) return;

        editTodo({
          id: todoId,
          description: text,
          completed: todo.completed,
          date: todo.date,
        });
      }

      // Track todo edit
      trackTodoEdited({ isOnboarding: onboarding.isOnboarding });

      // Notify onboarding if applicable
      if (onboarding.isOnboarding) {
        onboarding.notifyTodoEditCompleted();
      }
    },
    [firebaseTodos, editTodo, onboarding, getPendingAsTodos, updatePending]
  );

  const handleDeleteTodo = useCallback(
    (todoId: string) => {
      // Check if this is a pending todo
      const pendingTodos = getPendingAsTodos();
      const isPending = pendingTodos.some((t) => t.id === todoId);

      if (isPending) {
        // Just remove from pending state
        removePending(todoId);
      } else {
        // Delete from Firebase
        deleteTodo({ id: todoId });
      }

      // Track todo deletion
      trackTodoDeleted({ isOnboarding: onboarding.isOnboarding });

      // Notify onboarding if applicable
      if (onboarding.isOnboarding) {
        onboarding.notifyTodoDeleted();
      }
    },
    [deleteTodo, onboarding, getPendingAsTodos, removePending]
  );

  const copyTodo = useCallback(
    (todoId: string, newDate: string, newIndex?: number) => {
      const todo = firebaseTodos.find((t) => t.id === todoId);
      if (!todo) return;

      // Check if user has reached the free limit (applies to both web and desktop)
      // Skip limit check during onboarding
      if (!onboarding.isOnboarding) {
        const hasActiveSubscription = profile?.subscription?.status === "active";
        const freeTodoCount = profile?.freeTodoCount ?? 0;

        if (!hasActiveSubscription && freeTodoCount >= 20) {
          trackFreeLimitReached(freeTodoCount);
          onShowSubscriptionDialog();
          return;
        }
      }

      // Generate document ID upfront
      const todoDoc = doc(todosCollection);
      const docId = todoDoc.id;

      // Get todos for target date, sorted by position (including pending)
      const allTodosInTargetDate = [
        ...firebaseTodos.filter((t) => t.date.toISOString().split("T")[0] === newDate),
        ...getPendingAsTodos().filter((t) => t.date === newDate)
      ];
      const todosInTargetDate = sortTodosByPosition(allTodosInTargetDate);

      let newPosition: string;

      if (newIndex === undefined || todosInTargetDate.length === 0) {
        // Copying to a date without specific position - place at end
        const lastTodo = todosInTargetDate[todosInTargetDate.length - 1];
        newPosition = generateKeyBetween(lastTodo?.position || null, null);
      } else {
        // Copying to specific position
        const beforeTodo = todosInTargetDate[newIndex - 1];
        const afterTodo = todosInTargetDate[newIndex];
        newPosition = generateKeyBetween(beforeTodo?.position || null, afterTodo?.position || null);
      }

      // Add to pending immediately for optimistic update
      addPending({
        id: docId,
        text: todo.description,
        completed: false,
        date: newDate,
        position: newPosition,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPending: true,
      });

      // Convert string date to Date object
      const dateObj = new Date(newDate);

      // Add as new todo with same description, starting with moveCount of 0
      // IMPORTANT: Explicitly set completed to false - copies should always be incomplete
      addTodo({ description: todo.description, date: dateObj, position: newPosition, docId, completed: false });

      // Track todo creation (it's a copy, but counts as creation)
      const hasUrl = todo.description.includes('data-url="');
      trackTodoCreated({
        hasUrl,
        isOnboarding: onboarding.isOnboarding,
      });

      // Track todo copy specifically
      trackTodoCopied({ isOnboarding: onboarding.isOnboarding });

      // Notify onboarding if applicable
      if (onboarding.isOnboarding) {
        onboarding.notifyTodoCopied();
      }
    },
    [firebaseTodos, addTodo, profile, onShowSubscriptionDialog, onboarding, addPending, getPendingAsTodos]
  );

  const moveTodosInBatch = useCallback(
    (todoIds: string[], newDate: string) => {
      // Get todos for target date (excluding todos being moved)
      const todosInTargetDate = sortTodosByPosition(
        firebaseTodos.filter((t) => t.date.toISOString().split("T")[0] === newDate && !todoIds.includes(t.id))
      );

      // Track the last position to chain the new positions
      let lastPosition = todosInTargetDate.length > 0 ? todosInTargetDate[todosInTargetDate.length - 1].position : null;

      // Build array of updates for batch operation
      const updates = todoIds
        .map((todoId) => {
          const todo = firebaseTodos.find((t) => t.id === todoId);
          if (!todo) return null;

          // Calculate new position (append to end, chaining from previous)
          const newPosition = generateKeyBetween(lastPosition, null);
          lastPosition = newPosition; // Update for next todo
          const dateObj = new Date(newDate);

          // Increment moveCount since batch move always changes dates
          const newMoveCount = (todo.moveCount || 0) + 1;

          return {
            id: todoId,
            description: todo.description,
            completed: todo.completed,
            date: dateObj,
            position: newPosition,
            moveCount: newMoveCount,
          };
        })
        .filter((update): update is NonNullable<typeof update> => update !== null);

      // Execute batch update
      if (updates.length > 0) {
        batchEditTodos(updates);
      }
    },
    [firebaseTodos, batchEditTodos]
  );

  const setTodoCompleted = useCallback(
    (todoId: string, completed: boolean) => {
      const todo = firebaseTodos.find((t) => t.id === todoId);
      if (!todo) return;

      editTodo({
        id: todoId,
        description: todo.description,
        completed: completed,
        date: todo.date,
        completedAt: completed ? new Date() : undefined,
      });
    },
    [firebaseTodos, editTodo]
  );

  const resetTodoForCopy = useCallback(
    (todoId: string) => {
      const todo = firebaseTodos.find((t) => t.id === todoId);
      if (!todo) return;

      // Reset to incomplete and clear metadata
      editTodo({
        id: todoId,
        description: todo.description,
        completed: false,
        date: todo.date,
        moveCount: 0,
        completedAt: undefined,
      });
    },
    [firebaseTodos, editTodo]
  );

  const addTodoWithState = useCallback(
    (todo: { text: string; date: string; completed: boolean; position?: string }) => {
      const dateObj = new Date(todo.date);

      // Check if user has reached the free limit (applies to both web and desktop)
      // Skip limit check during onboarding
      if (!onboarding.isOnboarding) {
        const hasActiveSubscription = profile?.subscription?.status === "active";
        const freeTodoCount = profile?.freeTodoCount ?? 0;

        if (!hasActiveSubscription && freeTodoCount >= 20) {
          trackFreeLimitReached(freeTodoCount);
          onShowSubscriptionDialog();
          return;
        }
      }

      // Generate document ID upfront
      const todoDoc = doc(todosCollection);
      const docId = todoDoc.id;

      // Use provided position or calculate a new one
      let newPosition: string;
      if (todo.position) {
        // Use the provided position directly
        newPosition = todo.position;
      } else {
        // Find last position for this date (including pending todos)
        const allTodosForDate = [
          ...firebaseTodos.filter((t) => t.date.toISOString().split("T")[0] === todo.date),
          ...getPendingAsTodos().filter((t) => t.date === todo.date)
        ];
        const todosForDate = sortTodosByPosition(allTodosForDate);

        const lastPosition = todosForDate.length > 0 ? todosForDate[todosForDate.length - 1].position : null;
        newPosition = generateKeyBetween(lastPosition, null);
      }

      // Add to pending immediately for optimistic update
      addPending({
        id: docId,
        text: todo.text,
        completed: todo.completed,
        date: todo.date,
        position: newPosition,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPending: true,
      });

      // Add to Firebase (with the pre-generated ID and position)
      addTodo({
        description: todo.text,
        date: dateObj,
        position: newPosition,
        docId,
        completed: todo.completed,
      });
    },
    [onboarding, firebaseTodos, profile, addTodo, onShowSubscriptionDialog, addPending, getPendingAsTodos]
  );

  return {
    handleAddTodo,
    toggleTodoComplete,
    addTodoSession,
    moveTodo,
    copyTodo,
    moveTodosInBatch,
    updateTodo,
    handleDeleteTodo,
    setTodoCompleted,
    resetTodoForCopy,
    addTodoWithState,
    getPendingAsTodos,
    removePending,
  };
}
