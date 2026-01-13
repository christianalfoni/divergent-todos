import { useState, useMemo, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CacheProvider } from "pipesy";
import Calendar from "./Calendar";
import Activity from "./Activity";
import LandingPage from "./LandingPage";
import AuthModal from "./AuthModal";
import SubscriptionDialog from "./SubscriptionDialog";
import OnboardingNotification from "./OnboardingNotification";
import PreviousWeekDialog from "./PreviousWeekDialog";
import CreateMomentumDialog from "./CreateMomentumDialog";
import Survey from "./components/Survey";
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
import { useActivity } from "./hooks/useActivity";
import { useSurvey } from "./hooks/useSurvey";
import { getOldUncompletedTodos, getNextWorkday } from "./utils/todos";
import {
  trackAppOpened,
  trackBulkTodoMove,
} from "./firebase/analytics";
import { isMobileDevice } from "./utils/device";
import { getSequentialWeek } from "./utils/activity";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { reflectionWeekConverter, type WeekNote } from "./firebase/types/reflection";

export interface Todo {
  id: string;
  text: string;
  url?: string;
  completed: boolean;
  date: string; // ISO date string (YYYY-MM-DD)
  position: string;
  moveCount?: number;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date;
  sessions?: Array<{ minutes: number; deepFocus: boolean; createdAt: Date }>;
}

function AppContent() {
  const [authentication] = useAuthentication();
  const { todos: firebaseTodos, isLoading } = useTodosData();
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [authModalState, setAuthModalState] = useState(false);
  const [hasLeftLandingPage, setHasLeftLandingPage] = useState(() => {
    // Check if user has already left the landing page
    return localStorage.getItem("hasLeftLandingPage") === "true";
  });
  const [currentView, setCurrentView] = useState<"calendar" | "activity">(
    "calendar"
  );
  const [activityYear, setActivityYear] = useState(() =>
    new Date().getFullYear()
  );
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const [shouldPulsate, setShouldPulsate] = useState(false);
  const [pendingView, setPendingView] = useState<
    "calendar" | "activity" | null
  >(null);
  const [previousWeekDialog, setPreviousWeekDialog] = useState<{
    show: boolean;
    notes: WeekNote[];
    week: number;
    year: number;
    todoCount: number;
    dailyCounts: [number, number, number, number, number];
    userId: string;
  } | null>(null);
  const [createMomentumDialog, setCreateMomentumDialog] = useState<{
    show: boolean;
    todo: Todo | null;
  } | null>(null);
  const [focusState, setFocusState] = useState<{
    todo: Todo | null;
    isMinimized: boolean;
    onRestore: () => void;
  }>({ todo: null, isMinimized: false, onRestore: () => {} });
  const onboarding = useOnboarding();
  const profile = authentication.profile;
  const [, editProfile] = useEditProfile();

  // Fetch activity data at App level so it persists across view changes
  const { activityWeeks, loading: activityLoading } = useActivity(activityYear);

  // Survey hook for one-week check-in
  const { activeSurvey, dismissSurvey, submitSurvey } = useSurvey({
    profile: authentication.user ? authentication.profile : null,
    userId: authentication.user?.uid || null,
  });

  // Track if we've seen an authenticated user in this session
  const [hadAuthenticatedUser, setHadAuthenticatedUser] = useState(false);

  useEffect(() => {
    if (authentication.user) {
      setHadAuthenticatedUser(true);

      // If user signed in while hasLeftLandingPage is false, set it to true
      // This handles the case where LandingPage unmounts before its useEffect runs
      if (!hasLeftLandingPage) {
        localStorage.setItem("hasLeftLandingPage", "true");
        setHasLeftLandingPage(true);
      }
    } else if (!authentication.isAuthenticating && hadAuthenticatedUser) {
      // User just signed out
      const hasLeftInStorage = localStorage.getItem("hasLeftLandingPage") === "true";
      if (!hasLeftInStorage) {
        setHasLeftLandingPage(false);
      }
    }
  }, [authentication.user, authentication.isAuthenticating, hasLeftLandingPage, hadAuthenticatedUser]);

  // Auto-start tutorial for authenticated users who haven't completed onboarding
  useEffect(() => {
    if (
      authentication.user &&
      profile !== null &&
      profile.isOnboarded !== true &&
      !onboarding.isOnboarding
    ) {
      onboarding.startOnboarding();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authentication.user, profile]);


  // Sync state with localStorage when user signs out
  // (localStorage is cleared by the sign out button handler)
  useEffect(() => {
    if (
      !authentication.user &&
      !authentication.isAuthenticating &&
      hadAuthenticatedUser
    ) {
      // User signed out - check if localStorage was cleared
      const hasLeftLandingPageInStorage = localStorage.getItem("hasLeftLandingPage") === "true";
      if (hasLeftLandingPage && !hasLeftLandingPageInStorage) {
        setHasLeftLandingPage(false);
      }
    }
  }, [
    authentication.user,
    authentication.isAuthenticating,
    hadAuthenticatedUser,
    hasLeftLandingPage,
  ]);

  // Todo operations
  const todoOperations = useTodoOperations({
    profile,
    onShowSubscriptionDialog: () => setShowSubscriptionDialog(true),
  });

  // Merge pending todos with Firebase todos (filter out pending todos that are already confirmed)
  const todos = useMemo(() => {
    const pending = todoOperations.getPendingAsTodos();
    const firebaseIds = new Set(firebaseTodos.map(t => t.id));
    const uniquePending = pending.filter(p => !firebaseIds.has(p.id));
    return [...uniquePending, ...firebaseTodos];
  }, [firebaseTodos, todoOperations]);

  // Clean up pending todos when they appear in Firebase
  useEffect(() => {
    const pendingTodos = todoOperations.getPendingAsTodos();
    const firebaseTodoIds = new Set(firebaseTodos.map((t) => t.id));

    pendingTodos.forEach((pending) => {
      if (firebaseTodoIds.has(pending.id)) {
        todoOperations.removePending(pending.id);
      }
    });
  }, [firebaseTodos, todoOperations]);

  // Debug: Check for duplicate positions
  useEffect(() => {
    const positionMap = new Map<string, string[]>();
    todos.forEach((todo) => {
      const date = todo.date;
      if (!positionMap.has(date)) {
        positionMap.set(date, []);
      }
      positionMap.get(date)!.push(todo.position);
    });

    positionMap.forEach((positions, date) => {
      const duplicates = positions.filter(
        (pos, index) => positions.indexOf(pos) !== index
      );
      if (duplicates.length > 0) {
        console.error(
          `🔴 Duplicate positions found for date ${date}:`,
          duplicates
        );
        const todosForDate = todos.filter((t) => t.date === date);
        console.error(
          "All todos for this date:",
          todosForDate.map((t) => ({
            id: t.id,
            position: t.position,
            text: t.text,
          }))
        );
      }
    });
  }, [todos]);

  // Initialize theme system
  useTheme();

  // Initialize font size system
  useFontSize();

  // Mark app as installed when running in desktop app (only when authenticated)
  useMarkAppInstalled();

  // Check if running in Electron
  const isElectron = window.navigator.userAgent.includes("Electron");

  // Track app opened only once on mount
  useEffect(() => {
    trackAppOpened(isElectron);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Previous week dialog detection
  useEffect(() => {
    const checkPreviousWeekDialog = async () => {
      // Only run if user is authenticated and has a profile
      if (!authentication.user || !profile) return;

      const now = new Date();
      const dayOfWeek = now.getDay();

      // Don't show on weekends (0 = Sunday, 6 = Saturday)
      if (dayOfWeek === 0 || dayOfWeek === 6) return;

      // Get current week info
      const { year, week } = getSequentialWeek(now);
      const currentWeekKey = `${year}-${week}`;

      // Check if user has already seen the dialog for this week
      if (profile.lastPreviousWeekDialogWeek === currentWeekKey) return;

      // Get previous week
      const previousWeek = week - 1;
      const previousYear = previousWeek < 1 ? year - 1 : year;
      const previousWeekNumber = previousWeek < 1 ? 52 : previousWeek;

      try {
        // Query previous week's reflection
        const reflectionRef = collection(db, "reflections").withConverter(
          reflectionWeekConverter
        );
        const q = query(
          reflectionRef,
          where("userId", "==", authentication.user.uid),
          where("year", "==", previousYear),
          where("week", "==", previousWeekNumber)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const reflectionDoc = querySnapshot.docs[0].data();

          // Only show if there are notes
          if (reflectionDoc.notes && reflectionDoc.notes.length > 0) {
            // Calculate daily counts (Mon-Fri)
            const dailyCounts: [number, number, number, number, number] = [
              0, 0, 0, 0, 0,
            ];
            reflectionDoc.completedTodos.forEach((todo) => {
              const todoDate = new Date(todo.date);
              const dayOfWeek = todoDate.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri
              if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                dailyCounts[dayOfWeek - 1]++; // Convert to 0-4 index
              }
            });

            setPreviousWeekDialog({
              show: true,
              notes: reflectionDoc.notes,
              week: previousWeekNumber,
              year: previousYear,
              todoCount: reflectionDoc.completedTodos.length,
              dailyCounts,
              userId: authentication.user.uid,
            });

            // Mark as seen for this week
            editProfile({ lastPreviousWeekDialogWeek: currentWeekKey });
          }
        }
      } catch (error) {
        console.error("Failed to fetch previous week reflection:", error);
      }
    };

    checkPreviousWeekDialog();
  }, [authentication.user, profile]);

  // Real-time sync: Close dialog if reflection is saved on another device
  useEffect(() => {
    if (!previousWeekDialog) return;

    const reflectionDocId = `${previousWeekDialog.userId}_${previousWeekDialog.year}_${previousWeekDialog.week}`;
    const reflectionDocRef = doc(db, "reflections", reflectionDocId).withConverter(
      reflectionWeekConverter
    );

    // Track the initial timestamp to detect changes
    let initialTimestamp: Date | null = null;

    const unsubscribe = onSnapshot(reflectionDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();

        if (initialTimestamp === null) {
          // First snapshot - store the initial timestamp
          initialTimestamp = data.updatedAt;
        } else {
          // Check if updatedAt has changed (meaning someone else saved)
          if (data.updatedAt.getTime() !== initialTimestamp.getTime()) {
            console.log("Week reflection was saved on another device - closing dialog");
            setPreviousWeekDialog(null);
          }
        }
      }
    }, (error) => {
      console.error("Error listening to reflection document:", error);
    });

    return () => unsubscribe();
  }, [previousWeekDialog]);

  // TEST: Keyboard shortcut to manually trigger previous week dialog (Cmd+Shift+M)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Check for Cmd+Shift+M (case insensitive)
      if (e.metaKey && e.shiftKey && (e.key === "M" || e.key === "m")) {
        e.preventDefault();
        console.log("Previous week dialog shortcut triggered!");

        if (!authentication.user) {
          console.log("No authenticated user");
          return;
        }

        // Get previous week
        const now = new Date();
        const { year, week } = getSequentialWeek(now);
        const previousWeek = week - 1;
        const previousYear = previousWeek < 1 ? year - 1 : year;
        const previousWeekNumber = previousWeek < 1 ? 52 : previousWeek;

        try {
          // Query previous week's reflection
          const reflectionRef = collection(db, "reflections").withConverter(
            reflectionWeekConverter
          );
          const q = query(
            reflectionRef,
            where("userId", "==", authentication.user.uid),
            where("year", "==", previousYear),
            where("week", "==", previousWeekNumber)
          );

          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const reflectionDoc = querySnapshot.docs[0].data();

            if (reflectionDoc.notes && reflectionDoc.notes.length > 0) {
              // Calculate daily counts (Mon-Fri)
              const dailyCounts: [number, number, number, number, number] = [
                0, 0, 0, 0, 0,
              ];
              reflectionDoc.completedTodos.forEach((todo) => {
                const todoDate = new Date(todo.date);
                const dayOfWeek = todoDate.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                  dailyCounts[dayOfWeek - 1]++; // Convert to 0-4 index
                }
              });

              setPreviousWeekDialog({
                show: true,
                notes: reflectionDoc.notes,
                week: previousWeekNumber,
                year: previousYear,
                todoCount: reflectionDoc.completedTodos.length,
                dailyCounts,
                userId: authentication.user.uid,
              });
            } else {
              console.log("No notes found for previous week");
            }
          } else {
            console.log("No reflection data found for previous week");
          }
        } catch (error) {
          console.error("Failed to fetch previous week reflection:", error);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [authentication.user]);

  // Get old uncompleted todos
  const oldUncompletedTodos = useMemo(
    () => getOldUncompletedTodos(todos),
    [todos]
  );

  // Move old todos to next workday (or today)
  const moveOldTodosToNextWorkday = () => {
    const targetDate = getNextWorkday();
    const targetDateString = targetDate.toISOString().split("T")[0];
    const todoIds = oldUncompletedTodos.map((todo) => todo.id);

    // Use batch operation for better performance
    todoOperations.moveTodosInBatch(todoIds, targetDateString);

    // Track bulk todo move
    trackBulkTodoMove(oldUncompletedTodos.length);
  };

  // Handle previous week dialog "Start week" - moves all uncompleted todos to today
  const handleStartWeek = () => {
    if (!previousWeekDialog) return;

    const today = new Date();
    const todayString = today.toISOString().split("T")[0];

    // Get all uncompleted todos from previous weeks/days
    const uncompletedTodos = todos.filter(
      (todo) => todo.date < todayString && !todo.completed
    );

    if (uncompletedTodos.length > 0) {
      const todoIds = uncompletedTodos.map((todo) => todo.id);
      todoOperations.moveTodosInBatch(todoIds, todayString);
      trackBulkTodoMove(uncompletedTodos.length);
    }

    // Close dialog
    setPreviousWeekDialog(null);
  };

  // Show landing page if:
  // - Not running in Electron (desktop app never shows landing page) AND
  // - User is not authenticated AND
  // - User hasn't left the landing page yet (no localStorage flag)
  // This way, first-time users see landing page immediately,
  // but returning users who clicked past it won't see it during auth loading
  const showLandingPage =
    !isElectron && !authentication.user && !hasLeftLandingPage;

  // Effect to handle pulsating animation delay
  useEffect(() => {
    if (isLoadingActivity) {
      const pulsateTimer = setTimeout(() => {
        setShouldPulsate(true);
      }, 1000);

      return () => clearTimeout(pulsateTimer);
    } else {
      setShouldPulsate(false);
    }
  }, [isLoadingActivity]);

  // Handle view changes with loading state
  const handleViewChange = (view: "calendar" | "activity") => {
    if (view === "activity" && currentView === "calendar") {
      // Starting to load activity
      setPendingView("activity");
      setIsLoadingActivity(true);
    } else if (view === "calendar") {
      // User clicked calendar while loading activity
      setPendingView(null);
      setIsLoadingActivity(false);
      setCurrentView("calendar");
    }
  };

  // Activity loaded callback
  const handleActivityLoaded = () => {
    if (pendingView === "activity") {
      setCurrentView("activity");
      setPendingView(null);
      // Notify onboarding that activity view was opened
      onboarding.notifyActivityViewOpened();
    }
    setIsLoadingActivity(false);
  };

  if (showLandingPage) {
    return (
      <LandingPage
        onAuthenticated={() => {
          localStorage.setItem("hasLeftLandingPage", "true");
          setHasLeftLandingPage(true);
        }}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar
          profile={profile}
          onOpenSubscription={() => setShowSubscriptionDialog(true)}
          onOpenOnboarding={onboarding.startOnboarding}
          onOpenAuthModal={() => setAuthModalState(true)}
          currentView={currentView}
          onViewChange={handleViewChange}
          activityYear={activityYear}
          onActivityYearChange={setActivityYear}
          isLoading={authentication.isAuthenticating || isLoading}
          isLoadingActivity={isLoadingActivity}
          activeFocusTodo={focusState.todo}
          isFocusMinimized={focusState.isMinimized}
          onRestoreFocus={focusState.onRestore}
          shouldPulsate={shouldPulsate}
        />
        {authentication.user && <OnboardingNotification />}
        {currentView === "calendar" ? (
          <Calendar
            todos={todos}
            isLoading={authentication.isAuthenticating || isLoading}
            onAddTodo={
              authentication.user ? todoOperations.handleAddTodo : () => undefined
            }
            onToggleTodoComplete={
              authentication.user ? todoOperations.toggleTodoComplete : () => {}
            }
            onAddSession={
              authentication.user ? todoOperations.addTodoSession : () => {}
            }
            onMoveTodo={
              authentication.user ? todoOperations.moveTodo : () => {}
            }
            onCopyTodo={
              authentication.user ? todoOperations.copyTodo : () => {}
            }
            onResetTodoForCopy={
              authentication.user ? todoOperations.resetTodoForCopy : () => {}
            }
            onAddTodoWithState={
              authentication.user ? todoOperations.addTodoWithState : () => {}
            }
            onUpdateTodo={
              authentication.user ? todoOperations.updateTodo : () => {}
            }
            onDeleteTodo={
              authentication.user ? todoOperations.handleDeleteTodo : () => {}
            }
            onOpenBreakDown={(todo) => setCreateMomentumDialog({ show: true, todo })}
            onMoveIncompleteTodosToToday={
              authentication.user ? moveOldTodosToNextWorkday : () => {}
            }
            hasOldUncompletedTodos={oldUncompletedTodos.length > 0}
            profile={profile}
            onFocusStateChange={(todo, isMinimized, onRestore) =>
              setFocusState({ todo, isMinimized, onRestore })
            }
          />
        ) : (
          <Activity
            year={activityYear}
            activityWeeks={activityWeeks}
            loading={activityLoading}
            onLoaded={handleActivityLoaded}
          />
        )}
        {/* Hidden Activity component to trigger loading */}
        {pendingView === "activity" && currentView === "calendar" && (
          <div style={{ display: "none" }}>
            <Activity
              year={activityYear}
              activityWeeks={activityWeeks}
              loading={activityLoading}
              onLoaded={handleActivityLoaded}
            />
          </div>
        )}
      </div>
      <AuthModal
        open={
          (!authentication.isAuthenticating && !authentication.user) ||
          authModalState
        }
        onSignIn={() => {
          setAuthModalState(false);
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
      {previousWeekDialog?.show && (
        <PreviousWeekDialog
          notes={previousWeekDialog.notes}
          week={previousWeekDialog.week}
          year={previousWeekDialog.year}
          todoCount={previousWeekDialog.todoCount}
          dailyCounts={previousWeekDialog.dailyCounts}
          onClose={handleStartWeek}
        />
      )}
      {createMomentumDialog?.show && createMomentumDialog.todo && (
        <CreateMomentumDialog
          todo={createMomentumDialog.todo}
          isOpen={createMomentumDialog.show}
          onClose={() => setCreateMomentumDialog(null)}
          onAddTodo={todoOperations.addTodoWithState}
          onToggleTodoComplete={todoOperations.toggleTodoComplete}
        />
      )}
      {activeSurvey && (
        <Survey
          surveyId={activeSurvey.id}
          question={activeSurvey.questions[0]?.question || "How is your experience?"}
          onDismiss={dismissSurvey}
          onSubmit={submitSurvey}
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
