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
import {
  trackAppOpened,
  trackBulkTodoMove,
  trackDayTodosMoved,
} from "./firebase/analytics";
import { isMobileDevice } from "./utils/device";
import { getSequentialWeek } from "./utils/activity";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
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
    summary: string;
    week: number;
    year: number;
    todoCount: number;
    tags: string[];
    dailyCounts: [number, number, number, number, number];
    userId: string;
  } | null>(null);
  const onboarding = useOnboarding();
  const profile = authentication.profile;
  const [, editProfile] = useEditProfile();

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
        // Query previous week's activity
        const activityRef = collection(db, "activity").withConverter(
          activityWeekConverter
        );
        const q = query(
          activityRef,
          where("userId", "==", authentication.user.uid),
          where("year", "==", previousYear),
          where("week", "==", previousWeekNumber)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const activityDoc = querySnapshot.docs[0].data();

          // Only show if there's an AI summary
          if (activityDoc.aiSummary) {
            // Extract unique tags from completed todos
            const uniqueTags = new Set<string>();
            activityDoc.completedTodos.forEach((todo) => {
              todo.tags.forEach((tag) => uniqueTags.add(tag));
            });

            // Calculate daily counts (Mon-Fri)
            const dailyCounts: [number, number, number, number, number] = [
              0, 0, 0, 0, 0,
            ];
            activityDoc.completedTodos.forEach((todo) => {
              const todoDate = new Date(todo.date);
              const dayOfWeek = todoDate.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri
              if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                dailyCounts[dayOfWeek - 1]++; // Convert to 0-4 index
              }
            });

            setPreviousWeekDialog({
              show: true,
              summary: activityDoc.aiSummary,
              week: previousWeekNumber,
              year: previousYear,
              todoCount: activityDoc.completedTodos.length,
              tags: Array.from(uniqueTags).sort(),
              dailyCounts,
              userId: authentication.user.uid,
            });

            // Mark as seen for this week
            editProfile({ lastPreviousWeekDialogWeek: currentWeekKey });
          }
        }
      } catch (error) {
        console.error("Failed to fetch previous week summary:", error);
      }
    };

    checkPreviousWeekDialog();
  }, [authentication.user, profile]);

  // Real-time sync: Close dialog if summary is saved on another device
  useEffect(() => {
    if (!previousWeekDialog) return;

    const activityDocId = `${previousWeekDialog.userId}_${previousWeekDialog.year}_${previousWeekDialog.week}`;
    const activityDocRef = doc(db, "activity", activityDocId).withConverter(
      activityWeekConverter
    );

    // Track the initial timestamp to detect changes
    let initialTimestamp: Date | null = null;

    const unsubscribe = onSnapshot(activityDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();

        if (initialTimestamp === null) {
          // First snapshot - store the initial timestamp
          initialTimestamp = data.updatedAt;
        } else {
          // Check if updatedAt has changed (meaning someone else saved)
          if (data.updatedAt.getTime() !== initialTimestamp.getTime()) {
            console.log("Week summary was saved on another device - closing dialog");
            setPreviousWeekDialog(null);
          }
        }
      }
    }, (error) => {
      console.error("Error listening to activity document:", error);
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
          // Query previous week's activity
          const activityRef = collection(db, "activity").withConverter(
            activityWeekConverter
          );
          const q = query(
            activityRef,
            where("userId", "==", authentication.user.uid),
            where("year", "==", previousYear),
            where("week", "==", previousWeekNumber)
          );

          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const activityDoc = querySnapshot.docs[0].data();

            if (activityDoc.aiSummary) {
              // Extract unique tags from completed todos
              const uniqueTags = new Set<string>();
              activityDoc.completedTodos.forEach((todo) => {
                todo.tags.forEach((tag) => uniqueTags.add(tag));
              });

              // Calculate daily counts (Mon-Fri)
              const dailyCounts: [number, number, number, number, number] = [
                0, 0, 0, 0, 0,
              ];
              activityDoc.completedTodos.forEach((todo) => {
                const todoDate = new Date(todo.date);
                const dayOfWeek = todoDate.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri
                if (dayOfWeek >= 1 && dayOfWeek <= 5) {
                  dailyCounts[dayOfWeek - 1]++; // Convert to 0-4 index
                }
              });

              setPreviousWeekDialog({
                show: true,
                summary: activityDoc.aiSummary,
                week: previousWeekNumber,
                year: previousYear,
                todoCount: activityDoc.completedTodos.length,
                tags: Array.from(uniqueTags).sort(),
                dailyCounts,
                userId: authentication.user.uid,
              });
            } else {
              console.log("No AI summary found for previous week");
            }
          } else {
            console.log("No activity data found for previous week");
          }
        } catch (error) {
          console.error("Failed to fetch previous week summary:", error);
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

  // Handle previous week dialog "Start week" - moves all uncompleted todos to today and saves edited summary
  const handleStartWeek = (editedSummary: string) => {
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

    // Close dialog immediately
    setPreviousWeekDialog(null);

    // Update the activity document with edited summary in the background
    const activityDocId = `${previousWeekDialog.userId}_${previousWeekDialog.year}_${previousWeekDialog.week}`;
    const activityDocRef = doc(db, "activity", activityDocId);
    updateDoc(activityDocRef, {
      aiSummary: editedSummary,
      updatedAt: new Date(),
    }).catch((error) => {
      console.error("Failed to update activity summary:", error);
    });
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
          oldTodoCount={oldUncompletedTodos.length}
          onMoveOldTodos={moveOldTodosToNextWorkday}
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
          shouldPulsate={shouldPulsate}
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
            onMoveTodo={
              authentication.user ? todoOperations.moveTodo : () => {}
            }
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
          <Activity year={activityYear} onLoaded={handleActivityLoaded} />
        )}
        {/* Hidden Activity component to trigger loading */}
        {pendingView === "activity" && currentView === "calendar" && (
          <div style={{ display: "none" }}>
            <Activity year={activityYear} onLoaded={handleActivityLoaded} />
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
          summary={previousWeekDialog.summary}
          week={previousWeekDialog.week}
          year={previousWeekDialog.year}
          todoCount={previousWeekDialog.todoCount}
          tags={previousWeekDialog.tags}
          dailyCounts={previousWeekDialog.dailyCounts}
          onStartWeek={handleStartWeek}
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
