import { useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { signOut } from "firebase/auth";
import { RocketLaunchIcon, SparklesIcon, ArrowDownTrayIcon, ArrowRightStartOnRectangleIcon, BanknotesIcon, CheckIcon, DocumentTextIcon, ChatBubbleLeftRightIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { CodeBracketIcon } from "@heroicons/react/20/solid";
import { useAuthentication } from "./hooks/useAuthentication";
import { auth, type Profile } from "./firebase";
import { useTheme, type Theme } from "./hooks/useTheme";
import UpdateNotification from "./UpdateNotification";
import { openBillingPortal } from "./firebase/subscriptions";
import { useOnboarding } from "./contexts/OnboardingContext";
import DownloadAppDialog from "./DownloadAppDialog";
import FeedbackDialog from "./FeedbackDialog";
import { trackMenuItemClicked } from "./firebase/analytics";
import { ARTICLE_URL } from "./constants/links";

function getDownloadUrl(): string | null {
  // Check if running in Electron
  if (window.navigator.userAgent.includes("Electron")) {
    return null; // Don't show download link in desktop app
  }

  const platform = window.navigator.platform.toLowerCase();
  const userAgent = window.navigator.userAgent.toLowerCase();

  // macOS detection
  if (platform.includes("mac") || userAgent.includes("mac")) {
    // Prefer ARM64 for Apple Silicon, but GitHub doesn't have architecture detection
    // Default to ARM64 as most modern Macs are Apple Silicon
    return "https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent-Todos-mac-arm64.dmg";
  }

  // Windows detection
  if (platform.includes("win") || userAgent.includes("windows")) {
    return "https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent-Todos-win-x64.exe";
  }

  // Linux detection
  if (platform.includes("linux") || userAgent.includes("linux")) {
    return "https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent-Todos-linux-x64.AppImage";
  }

  // Default to macOS if platform cannot be determined
  return "https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent-Todos-mac-arm64.dmg";
}

interface TopBarProps {
  oldTodoCount?: number;
  onMoveOldTodos?: () => void;
  profile?: Profile | null;
  onOpenSubscription?: () => void;
  showGetStarted?: boolean;
  onOpenOnboarding?: () => void;
  onOpenAuthModal?: () => void;
}

export default function TopBar({ oldTodoCount = 0, onMoveOldTodos, profile, onOpenSubscription, showGetStarted, onOpenOnboarding, onOpenAuthModal }: TopBarProps) {
  const [authentication] = useAuthentication();
  const { theme, setTheme } = useTheme();
  const downloadUrl = getDownloadUrl();
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);
  const { isOnboarding, currentStep } = useOnboarding();
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);

  const subscriptionStatus = profile?.subscription?.status;
  const showPaymentWarning = subscriptionStatus === "past_due" || subscriptionStatus === "unpaid";
  const showCancellationNotice = profile?.subscription?.cancelAtPeriodEnd && profile?.subscription?.currentPeriodEnd;

  const handleSignOut = () => {
    trackMenuItemClicked("sign_out");
    signOut(auth);
  };

  const handleSubscriptionClick = () => {
    trackMenuItemClicked("subscription");
    onOpenSubscription?.();
  };

  const handleDownloadAppClick = () => {
    trackMenuItemClicked("download_app");
    setIsDownloadDialogOpen(true);
  };

  const handleThemeClick = (theme: Theme) => {
    trackMenuItemClicked(`theme_${theme}`);
    setTheme(theme);
  };

  const handleGitHubClick = () => {
    trackMenuItemClicked("open_source_code");
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
    } catch (err) {
      console.error("Failed to open billing portal:", err);
      setIsOpeningPortal(false);
    }
  };

  const themes: { value: Theme; label: string }[] = [
    { value: "default", label: "Default" },
    { value: "ocean", label: "Ocean" },
    { value: "forest", label: "Forest" },
    { value: "sunset", label: "Sunset" },
  ];

  return (
    <nav className="border-b bg-[var(--color-bg-nav)] border-[var(--color-border-primary)]">
      <div className="px-4">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex shrink-0 items-center gap-3">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-auto"
                aria-label="Divergent Todos"
              >
                {/* Upper left corner */}
                <path
                  d="M 8 4 L 4 4 L 4 8"
                  stroke="var(--color-accent-primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                {/* Lower right corner */}
                <path
                  d="M 24 28 L 28 28 L 28 24"
                  stroke="var(--color-accent-primary)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                {/* Checkmark - extended to edges */}
                <path
                  d="M6 16L12 22L26 8"
                  stroke="var(--color-accent-primary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-lg font-light text-[var(--color-text-primary)] font-(logo:--font-logo) tracking-widest">
                Divergent Todos
              </span>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center gap-3">
            {/* Update notification */}
            {authentication.user && <UpdateNotification />}

            {/* Get Started button or Onboarding badge */}
            {authentication.user && showGetStarted && onOpenOnboarding && (
              isOnboarding ? (
                <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 inset-ring inset-ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-500 dark:inset-ring-yellow-400/20">
                  Onboarding {
                    currentStep === "workdays" ? "1/7" :
                    currentStep === "add-todo" ? "2/7" :
                    currentStep === "add-todo-with-url" ? "3/7" :
                    currentStep === "edit-todo" ? "4/7" :
                    currentStep === "move-todo" ? "5/7" :
                    currentStep === "timebox" ? "6/7" :
                    currentStep === "congratulations" ? "7/7" : "1/7"
                  }
                </span>
              ) : (
                <button
                  onClick={onOpenOnboarding}
                  className="group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-menu-hover)] hover:text-[var(--color-accent-text-hover)]"
                >
                  <RocketLaunchIcon
                    aria-hidden="true"
                    className="size-6 shrink-0 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-text-hover)]"
                  />
                  Get started
                </button>
              )
            )}

            {/* Subscription cancellation notice */}
            {authentication.user && showCancellationNotice && !showPaymentWarning && (
              <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 inset-ring inset-ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-500 dark:inset-ring-yellow-400/20">
                Subscription ends {new Date(profile?.subscription?.currentPeriodEnd!).toLocaleDateString()}
              </span>
            )}

            {/* Payment warning indicators for past_due (yellow) and unpaid (red) */}
            {authentication.user && showPaymentWarning && (
              <button
                onClick={handleOpenBillingPortal}
                disabled={isOpeningPortal}
                className={`flex items-center gap-x-2 rounded-md px-3 py-2 text-sm font-semibold text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  subscriptionStatus === "unpaid"
                    ? "bg-red-600 focus-visible:outline-red-600"
                    : "bg-yellow-600 focus-visible:outline-yellow-600"
                }`}
              >
                <svg
                  className="size-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <span>
                  {subscriptionStatus === "unpaid" ? "Payment failed" : "Payment past due"}
                </span>
              </button>
            )}

            {/* Free todo counter - only show if user has no active subscription and is authenticated */}
            {authentication.user && profile && profile.subscription?.status !== 'active' && !showPaymentWarning && (
              <div className="flex items-center gap-x-2 text-sm text-[var(--color-text-secondary)]">
                <span>{profile.freeTodoCount || 0} / 20 free todos added</span>
              </div>
            )}

            {/* Subscribe button - only show if user has no active subscription and no payment issues */}
            {authentication.user && profile && profile.subscription?.status !== 'active' && !showPaymentWarning && onOpenSubscription && (
              <button
                onClick={onOpenSubscription}
                className="group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-menu-hover)] hover:text-[var(--color-accent-text-hover)]"
              >
                <BanknotesIcon
                  aria-hidden="true"
                  className="size-6 shrink-0 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-text-hover)]"
                />
                Subscribe
              </button>
            )}

            {/* Old todos indicator */}
            {authentication.user && oldTodoCount > 0 && onMoveOldTodos && (
              <button
                onClick={onMoveOldTodos}
                className="group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-menu-hover)] hover:text-[var(--color-accent-text-hover)]"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  className="size-6 shrink-0 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-text-hover)]"
                >
                  <path
                    d="M10 3V17M10 17L14 13M10 17L6 13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Move {oldTodoCount} uncompleted todo{oldTodoCount === 1 ? '' : 's'}
              </button>
            )}

            {/* Profile dropdown */}
            {authentication.user && (
              <Menu as="div" className="relative">
                <MenuButton className="relative flex max-w-xs items-center p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] rounded-md">
                  <span className="absolute -inset-1.5" />
                  <span className="sr-only">Open user menu</span>
                  {authentication.user.photoURL ? (
                    <img
                      alt=""
                      src={authentication.user.photoURL}
                      className="size-8 rounded-full outline -outline-offset-1 outline-[var(--color-outline)]"
                    />
                  ) : (
                    <span className="inline-block size-8 overflow-hidden rounded-full bg-[var(--color-bg-primary)] outline -outline-offset-1 outline-[var(--color-outline)]">
                      <svg fill="currentColor" viewBox="0 0 24 24" className="size-full text-[var(--color-text-tertiary)]">
                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </span>
                  )}
                </MenuButton>

                <MenuItems
                  transition
                  className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-[var(--color-bg-primary)] py-1 shadow-lg outline outline-[var(--color-outline)] transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:shadow-none dark:-outline-offset-1"
                >
                  {authentication.user.isAnonymous ? (
                    <>
                      {/* Menu for anonymous users */}
                      <MenuItem>
                        <button
                          onClick={handleCreateAccountClick}
                          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                        >
                          <UserCircleIcon
                            aria-hidden="true"
                            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
                          />
                          Create account
                        </button>
                      </MenuItem>

                      {downloadUrl && (
                        <MenuItem>
                          <button
                            onClick={handleDownloadAppClick}
                            className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                          >
                            <ArrowDownTrayIcon
                              aria-hidden="true"
                              className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
                            />
                            Download app
                          </button>
                        </MenuItem>
                      )}

                      <div className="flex items-center px-4 my-1">
                        <div aria-hidden="true" className="w-full border-t border-[var(--color-border-primary)]" />
                        <div className="relative flex justify-center">
                          <span className="bg-[var(--color-bg-primary)] px-2 text-xs text-[var(--color-text-tertiary)]">Themes</span>
                        </div>
                        <div aria-hidden="true" className="w-full border-t border-[var(--color-border-primary)]" />
                      </div>

                      {themes.map((themeOption) => (
                        <MenuItem key={themeOption.value}>
                          <button
                            onClick={() => handleThemeClick(themeOption.value)}
                            className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                          >
                            {theme === themeOption.value ? (
                              <CheckIcon
                                aria-hidden="true"
                                className="mr-3 size-5 text-[var(--color-accent-text)]"
                              />
                            ) : (
                              <span className="mr-3 size-5" aria-hidden="true" />
                            )}
                            {themeOption.label}
                          </button>
                        </MenuItem>
                      ))}

                      <div className="flex items-center px-4 my-1">
                        <div aria-hidden="true" className="w-full border-t border-[var(--color-border-primary)]" />
                        <div className="relative flex justify-center">
                          <span className="bg-[var(--color-bg-primary)] px-2 text-xs text-[var(--color-text-tertiary)]">Resources</span>
                        </div>
                        <div aria-hidden="true" className="w-full border-t border-[var(--color-border-primary)]" />
                      </div>

                      <MenuItem>
                        <a
                          href={ARTICLE_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackMenuItemClicked("introduction_article")}
                          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                        >
                          <DocumentTextIcon
                            aria-hidden="true"
                            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
                          />
                          Introduction Article
                        </a>
                      </MenuItem>

                      <MenuItem>
                        <a
                          href="https://github.com/christianalfoni/divergent-todos"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleGitHubClick}
                          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                        >
                          <CodeBracketIcon
                            aria-hidden="true"
                            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
                          />
                          Open Source Code
                        </a>
                      </MenuItem>

                      <MenuItem>
                        <button
                          onClick={handleFeedbackClick}
                          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                        >
                          <ChatBubbleLeftRightIcon
                            aria-hidden="true"
                            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
                          />
                          Feedback
                        </button>
                      </MenuItem>

                      <div className="my-1 h-px bg-[var(--color-border-primary)]" />

                      <MenuItem>
                        <button
                          onClick={handleSignOut}
                          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                        >
                          <ArrowRightStartOnRectangleIcon
                            aria-hidden="true"
                            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
                          />
                          Sign out
                        </button>
                      </MenuItem>
                    </>
                  ) : (
                    <>
                      {/* Menu for authenticated users */}
                      <MenuItem>
                        <button
                          onClick={handleSubscriptionClick}
                          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                        >
                          <BanknotesIcon
                            aria-hidden="true"
                            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
                          />
                          Subscription
                        </button>
                      </MenuItem>

                      {downloadUrl && (
                        <MenuItem>
                          <button
                            onClick={handleDownloadAppClick}
                            className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                          >
                            <ArrowDownTrayIcon
                              aria-hidden="true"
                              className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
                            />
                            Download app
                          </button>
                        </MenuItem>
                      )}

                      <div className="flex items-center px-4 my-1">
                        <div aria-hidden="true" className="w-full border-t border-[var(--color-border-primary)]" />
                        <div className="relative flex justify-center">
                          <span className="bg-[var(--color-bg-primary)] px-2 text-xs text-[var(--color-text-tertiary)]">Themes</span>
                        </div>
                        <div aria-hidden="true" className="w-full border-t border-[var(--color-border-primary)]" />
                      </div>

                      {themes.map((themeOption) => (
                        <MenuItem key={themeOption.value}>
                          <button
                            onClick={() => handleThemeClick(themeOption.value)}
                            className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                          >
                            {theme === themeOption.value ? (
                              <CheckIcon
                                aria-hidden="true"
                                className="mr-3 size-5 text-[var(--color-accent-text)]"
                              />
                            ) : (
                              <span className="mr-3 size-5" aria-hidden="true" />
                            )}
                            {themeOption.label}
                          </button>
                        </MenuItem>
                      ))}

                      <div className="flex items-center px-4 my-1">
                        <div aria-hidden="true" className="w-full border-t border-[var(--color-border-primary)]" />
                        <div className="relative flex justify-center">
                          <span className="bg-[var(--color-bg-primary)] px-2 text-xs text-[var(--color-text-tertiary)]">Resources</span>
                        </div>
                        <div aria-hidden="true" className="w-full border-t border-[var(--color-border-primary)]" />
                      </div>

                      <MenuItem>
                        <a
                          href={ARTICLE_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackMenuItemClicked("introduction_article")}
                          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                        >
                          <DocumentTextIcon
                            aria-hidden="true"
                            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
                          />
                          Introduction Article
                        </a>
                      </MenuItem>

                      <MenuItem>
                        <a
                          href="https://github.com/christianalfoni/divergent-todos"
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleGitHubClick}
                          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                        >
                          <CodeBracketIcon
                            aria-hidden="true"
                            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
                          />
                          Open Source Code
                        </a>
                      </MenuItem>

                      <MenuItem>
                        <button
                          onClick={handleFeedbackClick}
                          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                        >
                          <ChatBubbleLeftRightIcon
                            aria-hidden="true"
                            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
                          />
                          Feedback
                        </button>
                      </MenuItem>

                      <div className="my-1 h-px bg-[var(--color-border-primary)]" />

                      <MenuItem>
                        <button
                          onClick={handleSignOut}
                          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                        >
                          <ArrowRightStartOnRectangleIcon
                            aria-hidden="true"
                            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
                          />
                          Sign out
                        </button>
                      </MenuItem>
                    </>
                  )}
                </MenuItems>
              </Menu>
            )}
          </div>
        </div>
      </div>

      <DownloadAppDialog
        open={isDownloadDialogOpen}
        onClose={() => setIsDownloadDialogOpen(false)}
        downloadUrl={downloadUrl}
      />

      <FeedbackDialog
        open={isFeedbackDialogOpen}
        onClose={() => setIsFeedbackDialogOpen(false)}
      />
    </nav>
  );
}
