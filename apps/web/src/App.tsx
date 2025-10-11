import { useState, useMemo, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CacheProvider } from "pipesy";
import Calendar from "./Calendar";
import AuthModal from "./AuthModal";
import SubscriptionDialog from "./SubscriptionDialog";
import OnboardingNotification from "./OnboardingNotification";
import TopBar from "./TopBar";
import MobileBlocker from "./MobileBlocker";
import Terms from "./Terms";
import { useAuthentication } from "./hooks/useAuthentication";
import { useTheme } from "./hooks/useTheme";
import { useOnboarding } from "./contexts/OnboardingContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { useMarkAppInstalled } from "./hooks/useMarkAppInstalled";
import { useTodosData } from "./hooks/useTodosData";
import { useTodoOperations } from "./hooks/useTodoOperations";
import { getOldUncompletedTodos, getNextWorkday } from "./utils/todos";
import { trackAppOpened, trackBulkTodoMove, trackDayTodosMoved } from "./firebase/analytics";
import { isMobileDevice } from "./utils/device";

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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [hasSignedIn, setHasSignedIn] = useState(false);
  const onboarding = useOnboarding();
  const profile = authentication.profile;

  // Debug: Check for duplicate positions
  useEffect(() => {
    const positionMap = new Map<string, string[]>();
    todos.forEach(todo => {
      const date = todo.date;
      if (!positionMap.has(date)) {
        positionMap.set(date, []);
      }
      positionMap.get(date)!.push(todo.position);
    });

    positionMap.forEach((positions, date) => {
      const duplicates = positions.filter((pos, index) => positions.indexOf(pos) !== index);
      if (duplicates.length > 0) {
        console.error(`🔴 Duplicate positions found for date ${date}:`, duplicates);
        const todosForDate = todos.filter(t => t.date === date);
        console.error('All todos for this date:', todosForDate.map(t => ({ id: t.id, position: t.position, text: t.text })));
      }
    });
  }, [todos]);

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

  // Track app opened only once on mount
  useEffect(() => {
    trackAppOpened(isElectron);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if user needs to see "Get started" button
  const showGetStarted = profile !== null && profile.isOnboarded !== true;

  // Start onboarding when user signs in and has a profile without onboarding completed
  useEffect(() => {
    if (hasSignedIn && profile && profile.isOnboarded !== true) {
      onboarding.startOnboarding();
      setHasSignedIn(false); // Reset flag after starting onboarding
    }
  }, [hasSignedIn, profile, onboarding]);

  // Get old uncompleted todos
  const oldUncompletedTodos = useMemo(
    () => getOldUncompletedTodos(todos),
    [todos]
  );

  // Move old todos to next workday
  const moveOldTodosToNextWorkday = () => {
    const targetDate = getNextWorkday();
    const targetDateString = targetDate.toISOString().split("T")[0];
    const todoIds = oldUncompletedTodos.map((todo) => todo.id);

    // Use batch operation for better performance
    todoOperations.moveTodosInBatch(todoIds, targetDateString);

    // Track bulk todo move
    trackBulkTodoMove(oldUncompletedTodos.length);
  };

  // Move uncompleted todos from a specific day to current or next working day
  const moveTodosFromDay = (date: Date) => {
    const targetDate = getNextWorkday();
    const targetDateString = targetDate.toISOString().split("T")[0];
    const dateString = date.toISOString().split("T")[0];

    // Get uncompleted todos from this specific day
    const uncompletedTodos = todos.filter(
      (todo) => todo.date === dateString && !todo.completed
    );

    const todoIds = uncompletedTodos.map((todo) => todo.id);

    // Use batch operation for better performance
    todoOperations.moveTodosInBatch(todoIds, targetDateString);

    // Track day todos move
    trackDayTodosMoved(uncompletedTodos.length);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          oldTodoCount={oldUncompletedTodos.length}
          onMoveOldTodos={moveOldTodosToNextWorkday}
          profile={profile}
          onOpenSubscription={() => setShowSubscriptionDialog(true)}
          showGetStarted={showGetStarted}
          onOpenOnboarding={onboarding.startOnboarding}
          onOpenAuthModal={() => setShowAuthModal(true)}
        />
        {authentication.user && <OnboardingNotification />}
        <Calendar
          todos={todos}
          isLoading={authentication.isAuthenticating || isLoading}
          onAddTodo={
            authentication.user ? todoOperations.handleAddTodo : () => {}
          }
          onToggleTodoComplete={
            authentication.user ? todoOperations.toggleTodoComplete : () => {}
          }
          onMoveTodo={authentication.user ? todoOperations.moveTodo : () => {}}
          onUpdateTodo={
            authentication.user ? todoOperations.updateTodo : () => {}
          }
          onDeleteTodo={
            authentication.user ? todoOperations.handleDeleteTodo : () => {}
          }
          onMoveTodosFromDay={
            authentication.user ? moveTodosFromDay : () => {}
          }
          profile={profile}
        />
      </div>
      <AuthModal
        open={(!authentication.isAuthenticating && !authentication.user) || showAuthModal}
        onSignIn={() => {
          setHasSignedIn(true);
          setShowAuthModal(false);
        }}
      />
      {authentication.user && (
        <SubscriptionDialog
          open={showSubscriptionDialog}
          onClose={() => setShowSubscriptionDialog(false)}
          user={authentication.user}
          profile={profile}
        />
      )}
    </div>
  );
}

export default function App() {
  // Check if device is mobile and show blocker if so
  if (isMobileDevice()) {
    return <MobileBlocker />;
  }

  // In Electron, skip the router entirely
  const isElectron = window.navigator.userAgent.includes("Electron");

  if (isElectron) {
    return (
      <CacheProvider>
        <OnboardingProvider>
          <AppContent />
        </OnboardingProvider>
      </CacheProvider>
    );
  }

  return (
    <BrowserRouter>
      <CacheProvider>
        <OnboardingProvider>
          <Routes>
            <Route path="/" element={<AppContent />} />
            <Route path="/terms" element={<Terms />} />
          </Routes>
        </OnboardingProvider>
      </CacheProvider>
    </BrowserRouter>
  );
}
