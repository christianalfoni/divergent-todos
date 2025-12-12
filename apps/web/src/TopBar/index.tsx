import { useState } from "react";
import { signOut } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { CalendarIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import { useAuthentication } from "../hooks/useAuthentication";
import { auth, functions, type Profile } from "../firebase";
import { useTheme } from "../hooks/useTheme";
import { useFontSize } from "../hooks/useFontSize";
import { useIsTestUser } from "../hooks/useIsTestUser";
import { openBillingPortal } from "../firebase/subscriptions";
import { trackMenuItemClicked } from "../firebase/analytics";
import UpdateNotification from "../UpdateNotification";
import DownloadAppDialog from "../DownloadAppDialog";
import FeedbackDialog from "../FeedbackDialog";
import Logo from "./Logo";
import Navigation from "./Navigation";
import YearNavigation from "./YearNavigation";
import SubscriptionNotices from "./SubscriptionNotices";
import UserMenu from "./UserMenu";

function getDownloadUrl(): string | null {
  if (window.navigator.userAgent.includes("Electron")) {
    return null;
  }

  const platform = window.navigator.platform.toLowerCase();
  const userAgent = window.navigator.userAgent.toLowerCase();

  if (platform.includes("mac") || userAgent.includes("mac")) {
    return "https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent-Todos-mac-arm64.dmg";
  }

  if (platform.includes("win") || userAgent.includes("windows")) {
    return "https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent-Todos-Setup-x64.exe";
  }

  if (platform.includes("linux") || userAgent.includes("linux")) {
    return "https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent-Todos-linux-x64.AppImage";
  }

  return "https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent-Todos-mac-arm64.dmg";
}

interface TopBarProps {
  profile?: Profile | null;
  onOpenSubscription?: () => void;
  onOpenOnboarding?: () => void;
  onOpenAuthModal?: () => void;
  currentView?: "calendar" | "activity";
  onViewChange?: (view: "calendar" | "activity") => void;
  activityYear?: number;
  onActivityYearChange?: (year: number) => void;
  isLoading?: boolean;
  isLoadingActivity?: boolean;
  shouldPulsate?: boolean;
}

export default function TopBar({
  profile,
  onOpenSubscription,
  onOpenOnboarding,
  onOpenAuthModal,
  currentView = "calendar",
  onViewChange,
  activityYear,
  onActivityYearChange,
  isLoading = false,
  isLoadingActivity = false,
  shouldPulsate = false,
}: TopBarProps) {
  const [authentication] = useAuthentication();
  const { theme, setTheme } = useTheme();
  const { fontSize, setFontSize } = useFontSize();
  const downloadUrl = getDownloadUrl();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const isTestUser = useIsTestUser();

  const handleSignOut = async () => {
    trackMenuItemClicked("sign_out");

    try {
      // If test user, delete them on sign out
      if (isTestUser && auth.currentUser) {
        const deleteTestUser = httpsCallable(functions, "deleteTestUser");
        await deleteTestUser({ uid: auth.currentUser.uid });
      }

      // Clear landing page flag so user sees it again after sign out
      localStorage.removeItem("hasLeftLandingPage");
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
      // Still sign out even if deletion fails
      localStorage.removeItem("hasLeftLandingPage");
      await signOut(auth);
    }
  };

  const handleSubscriptionClick = () => {
    trackMenuItemClicked("subscription");
    onOpenSubscription?.();
  };

  const handleDownloadAppClick = () => {
    trackMenuItemClicked("download_app");
    setIsDownloadDialogOpen(true);
  };

  const handleFeedbackClick = () => {
    trackMenuItemClicked("feedback");
    setIsFeedbackDialogOpen(true);
  };

  const handleCreateAccountClick = () => {
    trackMenuItemClicked("create_account");
    onOpenAuthModal?.();
  };

  const handleOpenBillingPortal = async () => {
    setIsOpeningPortal(true);
    try {
      await openBillingPortal({ returnUrl: window.location.origin });
      setIsOpeningPortal(false);
    } catch (err) {
      console.error("Failed to open billing portal:", err);
      setIsOpeningPortal(false);
    }
  };

  return (
    <>
      <nav className="border-b bg-[var(--color-bg-nav)] border-[var(--color-border-primary)]">
        <div className="px-4">
          <div className="relative flex h-16 justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Logo />
                {isTestUser && (
                  <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 inset-ring inset-ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-500 dark:inset-ring-yellow-400/20">
                    Test Mode
                  </span>
                )}
              </div>
            </div>

            {/* Activity Year Navigation - Centered */}
            {authentication.user &&
              currentView === "activity" &&
              activityYear &&
              onActivityYearChange && (
                <YearNavigation year={activityYear} onYearChange={onActivityYearChange} />
              )}

            <div className="hidden sm:ml-6 sm:flex sm:items-center gap-3">
              {/* Show skeleton during loading */}
              {isLoading && !authentication.user && onViewChange && (
                <>
                  <div className="flex rounded-lg bg-[var(--color-bg-secondary)] p-1 opacity-50 pointer-events-none">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm">
                      <CalendarIcon className="size-4" />
                      Attention
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-[var(--color-text-secondary)]">
                      <ChartBarIcon className="size-4" />
                      Reflection
                    </div>
                  </div>
                  <div className="h-8 w-px bg-[var(--color-border-primary)]" />

                  {/* Skeleton avatar */}
                  <div className="relative flex max-w-xs items-center p-2 opacity-50 pointer-events-none">
                    <span className="inline-block size-8 overflow-hidden rounded-full bg-[var(--color-bg-primary)] outline -outline-offset-1 outline-[var(--color-outline)]">
                      <svg
                        fill="currentColor"
                        viewBox="0 0 24 24"
                        className="size-full text-[var(--color-text-tertiary)]"
                      >
                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </span>
                  </div>
                </>
              )}

              {authentication.user && onViewChange && (
                <Navigation
                  currentView={currentView}
                  onViewChange={onViewChange}
                  profile={profile}
                  onOpenSubscription={onOpenSubscription}
                  isLoadingActivity={isLoadingActivity}
                  shouldPulsate={shouldPulsate}
                />
              )}

              {/* Divider */}
              {authentication.user && (
                <div className="h-8 w-px bg-[var(--color-border-primary)]" />
              )}

              {authentication.user && <UpdateNotification />}

              {authentication.user && (
                <SubscriptionNotices
                  profile={profile}
                  onOpenSubscription={onOpenSubscription}
                  onOpenBillingPortal={handleOpenBillingPortal}
                  isOpeningPortal={isOpeningPortal}
                />
              )}

              {authentication.user && (
                <UserMenu
                  user={authentication.user}
                  theme={theme}
                  fontSize={fontSize}
                  downloadUrl={downloadUrl}
                  onSignOut={handleSignOut}
                  onSubscriptionClick={handleSubscriptionClick}
                  onDownloadAppClick={handleDownloadAppClick}
                  onThemeClick={setTheme}
                  onFontSizeClick={setFontSize}
                  onGitHubClick={() => trackMenuItemClicked("open_source_code")}
                  onFeedbackClick={handleFeedbackClick}
                  onCreateAccountClick={handleCreateAccountClick}
                  onOpenOnboarding={onOpenOnboarding}
                  onMenuItemClick={trackMenuItemClicked}
                />
              )}
            </div>
          </div>
        </div>
      </nav>

      <DownloadAppDialog
        open={isDownloadDialogOpen}
        onClose={() => setIsDownloadDialogOpen(false)}
        downloadUrl={downloadUrl}
      />

      <FeedbackDialog
        open={isFeedbackDialogOpen}
        onClose={() => setIsFeedbackDialogOpen(false)}
      />
    </>
  );
}
