import { useState, useMemo } from "react";
import { CacheProvider } from "pipesy";
import Calendar from "./Calendar";
import AuthModal from "./AuthModal";
import SubscriptionDialog from "./SubscriptionDialog";
import OnboardingNotification from "./OnboardingNotification";
import TopBar from "./TopBar";
import { useAuthentication } from "./hooks/useAuthentication";
import { useTheme } from "./hooks/useTheme";
import { useOnboarding } from "./contexts/OnboardingContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { useMarkAppInstalled } from "./hooks/useMarkAppInstalled";
import { useTodosData } from "./hooks/useTodosData";
import { useTodoOperations } from "./hooks/useTodoOperations";
import { getOldUncompletedTodos, getNextWorkday } from "./utils/todos";

export interface Todo {
  id: string;
  text: string;
  url?: string;
  completed: boolean;
  date: string; // ISO date string (YYYY-MM-DD)
  position: string;
}

function AppContent() {
  const [authentication] = useAuthentication();
  const { todos, isLoading } = useTodosData();
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const onboarding = useOnboarding();
  const profile = authentication.profile;

  // Initialize theme system
  useTheme();

  // Mark app as installed when running in desktop app (only when authenticated)
  useMarkAppInstalled();

  // Todo operations
  const todoOperations = useTodoOperations({
    profile,
    onShowSubscriptionDialog: () => setShowSubscriptionDialog(true),
  });

  // Check if running in Electron
  const isElectron = window.navigator.userAgent.includes("Electron");

  // Check for active subscription
  const hasActiveSubscription = profile?.subscription?.status === "active";

  // In Electron, require active subscription - but only show dialog after auth is complete
  const requiresSubscription =
    isElectron && !authentication.isAuthenticating && profile !== null && !hasActiveSubscription;

  // Check if user needs to see "Get started" button
  const showGetStarted = profile !== null && profile.isOnboarded !== true;

  // Get old uncompleted todos
  const oldUncompletedTodos = useMemo(() => getOldUncompletedTodos(todos), [todos]);

  // Move old todos to next workday
  const moveOldTodosToNextWorkday = () => {
    const targetDate = getNextWorkday();
    const targetDateString = targetDate.toISOString().split("T")[0];
    oldUncompletedTodos.forEach((todo) => {
      todoOperations.moveTodo(todo.id, targetDateString);
    });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {authentication.user && (
          <>
            <TopBar
              oldTodoCount={oldUncompletedTodos.length}
              onMoveOldTodos={moveOldTodosToNextWorkday}
              profile={profile}
              onOpenSubscription={() => setShowSubscriptionDialog(true)}
              showGetStarted={showGetStarted}
              onOpenOnboarding={onboarding.startOnboarding}
            />
            <OnboardingNotification />
          </>
        )}
        {!authentication.user && <TopBar />}
        <Calendar
          todos={todos}
          isLoading={authentication.isAuthenticating || isLoading}
          onAddTodo={authentication.user ? todoOperations.handleAddTodo : () => {}}
          onToggleTodoComplete={authentication.user ? todoOperations.toggleTodoComplete : () => {}}
          onMoveTodo={authentication.user ? todoOperations.moveTodo : () => {}}
          onUpdateTodo={authentication.user ? todoOperations.updateTodo : () => {}}
          onDeleteTodo={authentication.user ? todoOperations.handleDeleteTodo : () => {}}
          profile={profile}
        />
      </div>
      <AuthModal open={!authentication.isAuthenticating && !authentication.user} />
      {authentication.user && (
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
      )}
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
