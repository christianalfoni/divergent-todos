import { useState, useMemo, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CacheProvider } from "pipesy";
import Calendar from "./Calendar";
import Activity from "./Activity";
import LandingPage from "./LandingPage";
import AuthModal from "./AuthModal";
import SubscriptionDialog from "./SubscriptionDialog";
import OnboardingNotification from "./OnboardingNotification";
import MondayMotivationDialog from "./MondayMotivationDialog";
import TopBar from "./TopBar";
import MobileBlocker from "./MobileBlocker";
import Terms from "./Terms";
import { useAuthentication } from "./hooks/useAuthentication";
import { useTheme } from "./hooks/useTheme";
import { useFontSize } from "./hooks/useFontSize";
import { useOnboarding } from "./contexts/OnboardingContext";
import { OnboardingProvider } from "./contexts/OnboardingContext";
import { useMarkAppInstalled } from "./hooks/useMarkAppInstalled";
import { useTodosData } from "./hooks/useTodosData";
import { useTodoOperations } from "./hooks/useTodoOperations";
import { useEditProfile } from "./hooks/useEditProfile";
import { getOldUncompletedTodos, getNextWorkday } from "./utils/todos";
import { trackAppOpened, trackBulkTodoMove, trackDayTodosMoved } from "./firebase/analytics";
import { isMobileDevice } from "./utils/device";
import { getSequentialWeek } from "./utils/activity";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { activityWeekConverter } from "./firebase/types/activity";

export interface Todo {
  id: string;
  text: string;
  url?: string;
  completed: boolean;
  date: string; // ISO date string (YYYY-MM-DD)
  position: string;
  moveCount?: number;
  createdAt?: Date;
  completedAt?: Date;
  completedWithTimeBox?: boolean;
}

function AppContent() {
  const [authentication] = useAuthentication();
  const { todos, isLoading } = useTodosData();
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [authModalState, setAuthModalState] = useState<{ open: boolean; autoTrigger?: "google" | "anonymous" | null }>({ open: false, autoTrigger: null });
  const [hasLeftLandingPage, setHasLeftLandingPage] = useState(() => {
    // Check if user has already left the landing page
    return localStorage.getItem('hasLeftLandingPage') === 'true';
  });
  const [currentView, setCurrentView] = useState<"calendar" | "activity">("calendar");
  const [activityYear, setActivityYear] = useState(() => new Date().getFullYear());
  const [mondayDialog, setMondayDialog] = useState<{
    show: boolean;
    summary: string;
    week: number;
    year: number;
    todoCount: number;
    tags: string[];
    dailyCounts: [number, number, number, number, number];
  } | null>(null);
  const onboarding = useOnboarding();
  const profile = authentication.profile;
  const [, editProfile] = useEditProfile();

  // Track if we've seen an authenticated user in this session
  const [hadAuthenticatedUser, setHadAuthenticatedUser] = useState(false);

  useEffect(() => {
    if (authentication.user) {
      setHadAuthenticatedUser(true);
    }
  }, [authentication.user]);

  // Clear the localStorage flag when user signs out (only if they were previously authenticated)
  // This allows them to see the landing page again after sign out
  useEffect(() => {
    if (!authentication.user && !authentication.isAuthenticating && hadAuthenticatedUser && hasLeftLandingPage) {
      // User was authenticated but now is signed out
      localStorage.removeItem('hasLeftLandingPage');
      setHasLeftLandingPage(false);
    }
  }, [authentication.user, authentication.isAuthenticating, hadAuthenticatedUser, hasLeftLandingPage]);

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

  // Initialize font size system
  useFontSize();

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

  // Monday motivation dialog detection
  useEffect(() => {
    const checkMondayDialog = async () => {
      // Only run if user is authenticated and has a profile
      if (!authentication.user || !profile) return;

      const now = new Date();
      const dayOfWeek = now.getDay();

      // Only show on Mondays (1 = Monday)
      if (dayOfWeek !== 1) return;

      // Get current week info
      const { year, week } = getSequentialWeek(now);
      const currentWeekKey = `${year}-${week}`;

      // Check if user has already seen the dialog for this week
      if (profile.lastMondayDialogWeek === currentWeekKey) return;

      // Get previous week
      const previousWeek = week - 1;
      const previousYear = previousWeek < 1 ? year - 1 : year;
      const previousWeekNumber = previousWeek < 1 ? 52 : previousWeek;

      try {
        // Query previous week's activity
        const activityRef = collection(db, "activity").withConverter(activityWeekConverter);
        const q = query(
          activityRef,
          where("userId", "==", authentication.user.uid),
          where("year", "==", previousYear),
          where("week", "==", previousWeekNumber)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const activityDoc = querySnapshot.docs[0].data();

          // Only show if there's a personal summary
          if (activityDoc.aiPersonalSummary) {
            // Extract unique tags from completed todos
            const uniqueTags = new Set<string>();
            activityDoc.completedTodos.forEach(todo => {
              todo.tags.forEach(tag => uniqueTags.add(tag));
            });

            // Calculate daily counts (Mon-Fri)
            const dailyCounts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
            activityDoc.completedTodos.forEach(todo => {
              const todoDate = new Date(todo.date);
              const dayOfWeek = todoDate.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri
              if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                dailyCounts[dayOfWeek - 1]++; // Convert to 0-4 index
              }
            });

            setMondayDialog({
              show: true,
              summary: activityDoc.aiPersonalSummary,
              week: previousWeekNumber,
              year: previousYear,
              todoCount: activityDoc.completedTodos.length,
              tags: Array.from(uniqueTags).sort(),
              dailyCounts,
            });

            // Mark as seen for this week
            editProfile({ lastMondayDialogWeek: currentWeekKey });
          }
        }
      } catch (error) {
        console.error("Failed to fetch Monday motivation:", error);
      }
    };

    checkMondayDialog();
  }, [authentication.user, profile]);

  // TEST: Keyboard shortcut to manually trigger Monday dialog (Cmd+Shift+M)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Check for Cmd+Shift+M (case insensitive)
      if (e.metaKey && e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        e.preventDefault();
        console.log('Monday dialog shortcut triggered!');

        if (!authentication.user) {
          console.log('No authenticated user');
          return;
        }

        // Get previous week
        const now = new Date();
        const { year, week } = getSequentialWeek(now);
        const previousWeek = week - 1;
        const previousYear = previousWeek < 1 ? year - 1 : year;
        const previousWeekNumber = previousWeek < 1 ? 52 : previousWeek;

        try {
          // Query previous week's activity
          const activityRef = collection(db, "activity").withConverter(activityWeekConverter);
          const q = query(
            activityRef,
            where("userId", "==", authentication.user.uid),
            where("year", "==", previousYear),
            where("week", "==", previousWeekNumber)
          );

          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const activityDoc = querySnapshot.docs[0].data();

            if (activityDoc.aiPersonalSummary) {
              // Extract unique tags from completed todos
              const uniqueTags = new Set<string>();
              activityDoc.completedTodos.forEach(todo => {
                todo.tags.forEach(tag => uniqueTags.add(tag));
              });

              // Calculate daily counts (Mon-Fri)
              const dailyCounts: [number, number, number, number, number] = [0, 0, 0, 0, 0];
              activityDoc.completedTodos.forEach(todo => {
                const todoDate = new Date(todo.date);
                const dayOfWeek = todoDate.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                  dailyCounts[dayOfWeek - 1]++; // Convert to 0-4 index
                }
              });

              setMondayDialog({
                show: true,
                summary: activityDoc.aiPersonalSummary,
                week: previousWeekNumber,
                year: previousYear,
                todoCount: activityDoc.completedTodos.length,
                tags: Array.from(uniqueTags).sort(),
                dailyCounts,
              });
            } else {
              console.log("No AI personal summary found for previous week");
            }
          } else {
            console.log("No activity data found for previous week");
          }
        } catch (error) {
          console.error("Failed to fetch Monday motivation:", error);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authentication.user]);

  // Check if user needs to see "Tutorial" button
  const showTutorial = profile !== null && profile.isOnboarded !== true;

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

  // Show landing page if:
  // - Not running in Electron (desktop app never shows landing page) AND
  // - User is not authenticated AND
  // - User hasn't left the landing page yet (no localStorage flag)
  // This way, first-time users see landing page immediately,
  // but returning users who clicked past it won't see it during auth loading
  const showLandingPage = !isElectron && !authentication.user && !hasLeftLandingPage;

  if (showLandingPage) {
    return (
      <LandingPage
        onSignInGoogle={() => {
          localStorage.setItem('hasLeftLandingPage', 'true');
          setHasLeftLandingPage(true);
          setAuthModalState({ open: true, autoTrigger: "google" });
        }}
        onSignInAnonymous={() => {
          localStorage.setItem('hasLeftLandingPage', 'true');
          setHasLeftLandingPage(true);
          setAuthModalState({ open: true, autoTrigger: "anonymous" });
        }}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          oldTodoCount={oldUncompletedTodos.length}
          onMoveOldTodos={moveOldTodosToNextWorkday}
          profile={profile}
          onOpenSubscription={() => setShowSubscriptionDialog(true)}
          showTutorial={showTutorial}
          onOpenOnboarding={onboarding.startOnboarding}
          onOpenAuthModal={() => setAuthModalState({ open: true, autoTrigger: null })}
          currentView={currentView}
          onViewChange={setCurrentView}
          activityYear={activityYear}
          onActivityYearChange={setActivityYear}
        />
        {authentication.user && <OnboardingNotification />}
        {currentView === "calendar" ? (
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
        ) : (
          <Activity year={activityYear} />
        )}
      </div>
      <AuthModal
        open={(!authentication.isAuthenticating && !authentication.user) || authModalState.open}
        onSignIn={() => {
          setAuthModalState({ open: false, autoTrigger: null });
        }}
        autoTrigger={authModalState.autoTrigger}
      />
      {authentication.user && (
        <SubscriptionDialog
          open={showSubscriptionDialog}
          onClose={() => setShowSubscriptionDialog(false)}
          user={authentication.user}
          profile={profile}
        />
      )}
      {mondayDialog?.show && (
        <MondayMotivationDialog
          summary={mondayDialog.summary}
          week={mondayDialog.week}
          year={mondayDialog.year}
          todoCount={mondayDialog.todoCount}
          tags={mondayDialog.tags}
          dailyCounts={mondayDialog.dailyCounts}
          onClose={() => setMondayDialog(null)}
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
