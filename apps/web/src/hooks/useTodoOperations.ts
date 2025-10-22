import { useCallback } from "react";
import { generateKeyBetween } from "fractional-indexing";
import { useAddTodo } from "./useAddTodo";
import { useEditTodo } from "./useEditTodo";
import { useBatchEditTodos } from "./useBatchEditTodos";
import { useDeleteTodo } from "./useDeleteTodo";
import { useHittingWood } from "./useHittingWood";
import { useOnboarding } from "../contexts/OnboardingContext";
import { useTodos } from "./useTodos";
import { sortTodosByPosition } from "../utils/todos";
import type { Todo } from "../App";
import type { Profile } from "../firebase";
import {
  trackTodoCreated,
  trackTodoCompleted,
  trackTodoUncompleted,
  trackTodoEdited,
  trackTodoDeleted,
  trackTodoMoved,
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

  const handleAddTodo = useCallback(
    (todo: Omit<Todo, "id" | "position"> & { position?: string }) => {
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

      // Find last position for this date
      const todosForDate = sortTodosByPosition(
        firebaseTodos.filter((t) => t.date.toISOString().split("T")[0] === todo.date)
      );

      const lastPosition = todosForDate.length > 0 ? todosForDate[todosForDate.length - 1].position : null;

      addTodo({ description: todo.text, date: dateObj, lastPosition });

      // Track todo creation
      const hasUrl = todo.text.includes('data-url="');
      trackTodoCreated({
        hasUrl,
        isOnboarding: onboarding.isOnboarding,
      });

      // Advance onboarding steps if applicable
      if (onboarding.isOnboarding) {
        if (hasUrl) {
          onboarding.notifyTodoAddedWithUrl();
        } else {
          onboarding.notifyTodoAdded();
        }
      }
    },
    [onboarding, firebaseTodos, profile, addTodo, onShowSubscriptionDialog]
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
      const todo = firebaseTodos.find((t) => t.id === todoId);
      if (!todo) return;

      editTodo({
        id: todoId,
        description: text,
        completed: todo.completed,
        date: todo.date,
      });

      // Track todo edit
      trackTodoEdited({ isOnboarding: onboarding.isOnboarding });

      // Notify onboarding if applicable
      if (onboarding.isOnboarding) {
        onboarding.notifyTodoEditCompleted();
      }
    },
    [firebaseTodos, editTodo, onboarding]
  );

  const handleDeleteTodo = useCallback(
    (todoId: string) => {
      deleteTodo({ id: todoId });

      // Track todo deletion
      trackTodoDeleted({ isOnboarding: onboarding.isOnboarding });

      // Notify onboarding if applicable
      if (onboarding.isOnboarding) {
        onboarding.notifyTodoDeleted();
      }
    },
    [deleteTodo, onboarding]
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

  return {
    handleAddTodo,
    toggleTodoComplete,
    moveTodo,
    moveTodosInBatch,
    updateTodo,
    handleDeleteTodo,
  };
}
