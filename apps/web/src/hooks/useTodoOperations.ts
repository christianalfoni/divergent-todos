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

      if (onboarding.isOnboarding) {
        // In onboarding mode, use local state
        const todosForDate = sortTodosByPosition(
          onboarding.todos.filter((t) => t.date.toISOString().split("T")[0] === todo.date)
        );

        const lastPosition = todosForDate.length > 0 ? todosForDate[todosForDate.length - 1].position : null;

        onboarding.addTodo({
          description: todo.text,
          date: dateObj,
          completed: false,
          position: generateKeyBetween(lastPosition, null),
        });

        // If in add-todo step, advance to next step
        if (onboarding.currentStep === "add-todo") {
          onboarding.nextStep();
        }

        // If in add-todo-with-url step, check if todo contains a URL and advance
        if (onboarding.currentStep === "add-todo-with-url") {
          const hasUrl = todo.text.includes('data-url="');
          if (hasUrl) {
            onboarding.nextStep();
          }
        }
      } else {
        // Check if user has reached the free limit
        const hasActiveSubscription = profile?.subscription?.status === "active";
        const freeTodoCount = profile?.freeTodoCount ?? 0;

        if (!hasActiveSubscription && freeTodoCount >= 20) {
          trackFreeLimitReached(freeTodoCount);
          onShowSubscriptionDialog();
          return;
        }

        // Find last position for this date
        const todosForDate = sortTodosByPosition(
          firebaseTodos.filter((t) => t.date.toISOString().split("T")[0] === todo.date)
        );

        const lastPosition = todosForDate.length > 0 ? todosForDate[todosForDate.length - 1].position : null;

        addTodo({ description: todo.text, date: dateObj, lastPosition });
      }

      // Track todo creation
      const hasUrl = todo.text.includes('data-url="');
      trackTodoCreated({
        hasUrl,
        isOnboarding: onboarding.isOnboarding,
      });
    },
    [onboarding, firebaseTodos, profile, addTodo, onShowSubscriptionDialog]
  );

  const toggleTodoComplete = useCallback(
    (todoId: string) => {
      if (onboarding.isOnboarding) {
        const todo = onboarding.todos.find((t) => t.id === todoId);
        if (!todo) return;

        // Play sound when completing a todo
        if (!todo.completed) {
          hittingWood.play();
        }

        onboarding.editTodo(todoId, {
          completed: !todo.completed,
        });
      } else {
        const todo = firebaseTodos.find((t) => t.id === todoId);
        if (!todo) return;

        // Play sound when completing a todo
        if (!todo.completed) {
          hittingWood.play();
        }

        editTodo({
          id: todoId,
          description: todo.description,
          completed: !todo.completed,
          date: todo.date,
        });

        // Track todo completion/uncompletion
        if (!todo.completed) {
          trackTodoCompleted({ isOnboarding: onboarding.isOnboarding });
        } else {
          trackTodoUncompleted({ isOnboarding: onboarding.isOnboarding });
        }
      }
    },
    [onboarding, firebaseTodos, hittingWood, editTodo]
  );

  const moveTodo = useCallback(
    (todoId: string, newDate: string, newIndex?: number) => {
      if (onboarding.isOnboarding) {
        const todo = onboarding.todos.find((t) => t.id === todoId);
        if (!todo) return;

        // Get todos for target date, sorted by position (excluding the dragged todo)
        const todosInTargetDate = sortTodosByPosition(
          onboarding.todos.filter((t) => t.date.toISOString().split("T")[0] === newDate && t.id !== todoId)
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

        onboarding.editTodo(todoId, {
          date: dateObj,
          position: newPosition,
        });

        // Notify that a todo was moved
        onboarding.notifyTodoMoved();
      } else {
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

        editTodo({
          id: todoId,
          description: todo.description,
          completed: todo.completed,
          date: dateObj,
          position: newPosition,
        });

        // Track todo movement
        const sameDay = todo.date.toISOString().split("T")[0] === newDate;
        trackTodoMoved({
          sameDay,
          isOnboarding: onboarding.isOnboarding,
        });
      }
    },
    [onboarding, firebaseTodos, editTodo]
  );

  const updateTodo = useCallback(
    (todoId: string, text: string) => {
      if (onboarding.isOnboarding) {
        onboarding.editTodo(todoId, {
          description: text,
        });
        // Notify that a todo edit was completed
        onboarding.notifyTodoEditCompleted();
      } else {
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
      }
    },
    [onboarding, firebaseTodos, editTodo]
  );

  const handleDeleteTodo = useCallback(
    (todoId: string) => {
      if (onboarding.isOnboarding) {
        onboarding.deleteTodo(todoId);
        onboarding.notifyTodoDeleted();
      } else {
        deleteTodo({ id: todoId });
      }

      // Track todo deletion
      trackTodoDeleted({ isOnboarding: onboarding.isOnboarding });
    },
    [onboarding, deleteTodo]
  );

  const moveTodosInBatch = useCallback(
    (todoIds: string[], newDate: string) => {
      if (onboarding.isOnboarding) {
        // Get todos for target date (excluding todos being moved)
        const todosInTargetDate = sortTodosByPosition(
          onboarding.todos.filter((t) => t.date.toISOString().split("T")[0] === newDate && !todoIds.includes(t.id))
        );

        // Track the last position to chain the new positions
        let lastPosition = todosInTargetDate.length > 0 ? todosInTargetDate[todosInTargetDate.length - 1].position : null;

        // In onboarding mode, move todos one by one using local state
        todoIds.forEach((todoId) => {
          const todo = onboarding.todos.find((t) => t.id === todoId);
          if (!todo) return;

          const newPosition = generateKeyBetween(lastPosition, null);
          lastPosition = newPosition; // Update for next todo
          const dateObj = new Date(newDate);

          onboarding.editTodo(todoId, {
            date: dateObj,
            position: newPosition,
          });
        });
      } else {
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

            return {
              id: todoId,
              description: todo.description,
              completed: todo.completed,
              date: dateObj,
              position: newPosition,
            };
          })
          .filter((update): update is NonNullable<typeof update> => update !== null);

        // Execute batch update
        if (updates.length > 0) {
          batchEditTodos(updates);
        }
      }
    },
    [onboarding, firebaseTodos, batchEditTodos]
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
