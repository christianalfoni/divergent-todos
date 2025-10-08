import { useState } from "react";
import { CacheProvider } from "pipesy";
import Calendar from "./Calendar";
import AuthModal from "./AuthModal";
import SubscriptionDialog from "./SubscriptionDialog";
import OnboardingNotification from "./OnboardingNotification";
import TopBar from "./TopBar";
import { useAuthentication } from "./hooks/useAuthentication";
import { useTodos } from "./hooks/useTodos";
import { useAddTodo } from "./hooks/useAddTodo";
import { useEditTodo } from "./hooks/useEditTodo";
import { useDeleteTodo } from "./hooks/useDeleteTodo";
import { generateKeyBetween } from "fractional-indexing";
import { useHittingWood } from "./hooks/useHittingWood";
import { useTheme } from "./hooks/useTheme";
import { OnboardingProvider, useOnboarding } from "./contexts/OnboardingContext";
import { useMarkAppInstalled } from "./hooks/useMarkAppInstalled";

export interface Todo {
  id: string;
  text: string;
  url?: string;
  completed: boolean;
  date: string; // ISO date string (YYYY-MM-DD)
  position: string;
}

function AuthenticatedApp() {
  const [authentication] = useAuthentication();
  const [firebaseTodos] = useTodos();
  const profile = authentication.profile;
  const [, addTodo] = useAddTodo();
  const [, editTodo] = useEditTodo();
  const [, deleteTodo] = useDeleteTodo();
  const hittingWood = useHittingWood();
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const onboarding = useOnboarding();

  // Mark app as installed when running in desktop app
  useMarkAppInstalled();

  // Check if running in Electron
  const isElectron = window.navigator.userAgent.includes("Electron");

  // Check for active subscription
  const hasActiveSubscription = profile?.subscription?.status === "active";

  // In Electron, require active subscription - but only show dialog after auth is complete
  // This prevents showing the dialog while profile is still loading
  // Wait for both auth to complete AND profile to load before checking subscription
  const requiresSubscription = isElectron && !authentication.isAuthenticating && profile !== null && !hasActiveSubscription;

  // Check if user needs to see "Get started" button
  // Show if profile exists and isOnboarded is not true (could be false or undefined)
  const showGetStarted = profile !== null && profile.isOnboarded !== true;

  // Use onboarding todos if in onboarding mode, otherwise use Firebase todos
  const todos: Todo[] = onboarding.isOnboarding
    ? onboarding.todos
        .slice()
        .sort((a, b) => {
          const dateCompare = a.date.toISOString().localeCompare(b.date.toISOString());
          if (dateCompare !== 0) return dateCompare;
          // Use standard string comparison, not localeCompare, to match fractional-indexing library
          if (a.position < b.position) return -1;
          if (a.position > b.position) return 1;
          return 0;
        })
        .map((todo) => ({
          id: todo.id,
          text: todo.description,
          url: undefined,
          completed: todo.completed,
          date: todo.date.toISOString().split("T")[0],
          position: todo.position,
        }))
    : firebaseTodos.map((todo) => ({
        id: todo.id,
        text: todo.description,
        url: undefined, // URL not yet supported in Firebase schema
        completed: todo.completed,
        date: todo.date.toISOString().split("T")[0],
        position: todo.position,
      }));

  // Get Monday of current week
  const getCurrentWeekMonday = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const daysToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  // Count uncompleted todos from before current week
  const getOldUncompletedTodos = () => {
    const currentWeekMonday = getCurrentWeekMonday();
    return todos.filter((todo) => {
      if (todo.completed) return false;
      const todoDate = new Date(todo.date);
      return todoDate < currentWeekMonday;
    });
  };

  const oldUncompletedTodos = getOldUncompletedTodos();

  const handleAddTodo = (todo: Omit<Todo, "id">) => {
    const dateObj = new Date(todo.date);

    if (onboarding.isOnboarding) {
      // In onboarding mode, use local state
      const todosForDate = onboarding.todos
        .filter((t) => t.date.toISOString().split("T")[0] === todo.date)
        .sort((a, b) => {
          // Use standard string comparison, not localeCompare, to match fractional-indexing library
          if (a.position < b.position) return -1;
          if (a.position > b.position) return 1;
          return 0;
        });

      const lastPosition =
        todosForDate.length > 0
          ? todosForDate[todosForDate.length - 1].position
          : null;

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
        setShowSubscriptionDialog(true);
        return;
      }

      // Find last position for this date
      const todosForDate = firebaseTodos
        .filter((t) => t.date.toISOString().split("T")[0] === todo.date)
        .sort((a, b) => {
          // Use standard string comparison, not localeCompare, to match fractional-indexing library
          if (a.position < b.position) return -1;
          if (a.position > b.position) return 1;
          return 0;
        });

      const lastPosition =
        todosForDate.length > 0
          ? todosForDate[todosForDate.length - 1].position
          : null;

      addTodo({ description: todo.text, date: dateObj, lastPosition });
    }
  };

  const toggleTodoComplete = (todoId: string) => {
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
    }
  };

  const moveTodo = (todoId: string, newDate: string, newIndex?: number) => {
    if (onboarding.isOnboarding) {
      const todo = onboarding.todos.find((t) => t.id === todoId);
      if (!todo) return;

      // Get todos for target date, sorted by position (excluding the dragged todo)
      const todosInTargetDate = onboarding.todos
        .filter(
          (t) => t.date.toISOString().split("T")[0] === newDate && t.id !== todoId
        )
        .sort((a, b) => {
          // Use standard string comparison, not localeCompare, to match fractional-indexing library
          if (a.position < b.position) return -1;
          if (a.position > b.position) return 1;
          return 0;
        });

      let newPosition: string;

      if (newIndex === undefined) {
        // Moving to a date without specific position - place at end
        const lastTodo = todosInTargetDate[todosInTargetDate.length - 1];
        newPosition = generateKeyBetween(lastTodo?.position || null, null);
      } else {
        // Moving to specific position
        const beforeTodo = todosInTargetDate[newIndex - 1];
        const afterTodo = todosInTargetDate[newIndex];
        newPosition = generateKeyBetween(
          beforeTodo?.position || null,
          afterTodo?.position || null
        );
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
      const todosInTargetDate = firebaseTodos
        .filter(
          (t) => t.date.toISOString().split("T")[0] === newDate && t.id !== todoId
        )
        .sort((a, b) => {
          // Use standard string comparison, not localeCompare, to match fractional-indexing library
          if (a.position < b.position) return -1;
          if (a.position > b.position) return 1;
          return 0;
        });

      let newPosition: string;

      if (newIndex === undefined) {
        // Moving to a date without specific position - place at end
        const lastTodo = todosInTargetDate[todosInTargetDate.length - 1];
        newPosition = generateKeyBetween(lastTodo?.position || null, null);
      } else {
        // Moving to specific position
        const beforeTodo = todosInTargetDate[newIndex - 1];
        const afterTodo = todosInTargetDate[newIndex];
        newPosition = generateKeyBetween(
          beforeTodo?.position || null,
          afterTodo?.position || null
        );
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
    }
  };

  const updateTodo = (todoId: string, text: string) => {
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
    }
  };

  const handleDeleteTodo = (todoId: string) => {
    if (onboarding.isOnboarding) {
      onboarding.deleteTodo(todoId);
      onboarding.notifyTodoDeleted();
    } else {
      deleteTodo({ id: todoId });
    }
  };

  const moveOldTodosToNextWorkday = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();

    let targetDate = new Date(today);

    // If it's Saturday (6), move to Monday (+2 days)
    // If it's Sunday (0), move to Monday (+1 day)
    // Otherwise, use today
    if (dayOfWeek === 6) {
      targetDate.setDate(today.getDate() + 2);
    } else if (dayOfWeek === 0) {
      targetDate.setDate(today.getDate() + 1);
    }

    const targetDateString = targetDate.toISOString().split("T")[0];
    oldUncompletedTodos.forEach((todo) => {
      moveTodo(todo.id, targetDateString);
    });
  };

  return (
    <>
      <TopBar
        oldTodoCount={oldUncompletedTodos.length}
        onMoveOldTodos={moveOldTodosToNextWorkday}
        profile={profile}
        onOpenSubscription={() => setShowSubscriptionDialog(true)}
        showGetStarted={showGetStarted}
        onOpenOnboarding={onboarding.startOnboarding}
      />
      <Calendar
        todos={todos}
        onAddTodo={handleAddTodo}
        onToggleTodoComplete={toggleTodoComplete}
        onMoveTodo={moveTodo}
        onUpdateTodo={updateTodo}
        onDeleteTodo={handleDeleteTodo}
        profile={profile}
      />
      <SubscriptionDialog
        open={showSubscriptionDialog || requiresSubscription}
        onClose={() => {
          // Only allow closing if not required (i.e., not in Electron or has subscription)
          if (!requiresSubscription) {
            setShowSubscriptionDialog(false);
          }
        }}
        user={authentication.user}
        profile={profile}
        isElectron={isElectron}
      />
      <OnboardingNotification />
    </>
  );
}

function AppContent() {
  const [authentication] = useAuthentication();

  // Initialize theme system
  useTheme();

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {authentication.user ? (
          <AuthenticatedApp />
        ) : (
          <>
            <TopBar />
            <Calendar
              todos={[]}
              onAddTodo={() => {}}
              onToggleTodoComplete={() => {}}
              onMoveTodo={() => {}}
              onUpdateTodo={() => {}}
              onDeleteTodo={() => {}}
              profile={null}
            />
          </>
        )}
      </div>
      <AuthModal
        open={!authentication.isAuthenticating && !authentication.user}
      />
    </div>
  );
}

export default function App() {
  return (
    <CacheProvider>
      <OnboardingProvider>
        <AppContent />
      </OnboardingProvider>
    </CacheProvider>
  );
}
