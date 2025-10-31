import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { UserCircleIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useSignIn } from "./hooks/useSignIn";
import { useSignInAnonymously } from "./hooks/useSignInAnonymously";
import { useLinkAnonymousAccount } from "./hooks/useLinkAnonymousAccount";
import { useAuthentication } from "./hooks/useAuthentication";

interface AuthModalProps {
  open: boolean;
  onSignIn: () => void;
}

export default function AuthModal({ open, onSignIn }: AuthModalProps) {
  const [authentication] = useAuthentication();
  const [{ isSigningIn, error }, signIn] = useSignIn();
  const [
    { isSigningIn: isSigningInAnonymously, error: anonymousError },
    signInAnonymously,
  ] = useSignInAnonymously();
  const [{ isLinking, error: linkError }, linkAccount] =
    useLinkAnonymousAccount();

  // Check if running in Electron
  const isElectron = window.navigator.userAgent.includes("Electron");

  // Check if the user is anonymous (for account linking)
  const isAnonymous = authentication.user?.isAnonymous ?? false;

  return (
    <Dialog open={open} onClose={() => {}} className="relative z-10">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-[var(--color-overlay)] transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-[var(--color-bg-primary)] px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-sm sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 outline -outline-offset-1 outline-[var(--color-outline)]"
          >
            <div>
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--color-accent-light)]">
                <UserCircleIcon
                  aria-hidden="true"
                  className="size-6 text-[var(--color-accent-text)]"
                />
              </div>
              <div className="mt-3 text-center sm:mt-5">
                <DialogTitle
                  as="h3"
                  className="text-base font-semibold text-[var(--color-text-primary)]"
                >
                  {isAnonymous
                    ? "Create Your Account"
                    : "Welcome to Divergent Todos"}
                </DialogTitle>
                <div className="mt-2">
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {isAnonymous
                      ? "Link your Google account to save your focus permanently"
                      : "Sign in or download the app to start directing your attention"}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-6 space-y-3">
              <button
                type="button"
                onClick={() => {
                  if (isAnonymous) {
                    linkAccount({});
                  } else {
                    signIn({});
                  }
                  onSignIn();
                }}
                disabled={isSigningIn || isSigningInAnonymously || isLinking}
                className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:inset-ring-transparent dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20 disabled:opacity-50"
              >
                {!(isSigningIn || isLinking) && (
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    className="h-5 w-5"
                  >
                    <path
                      d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
                      fill="#EA4335"
                    />
                    <path
                      d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                      fill="#34A853"
                    />
                  </svg>
                )}
                <span className="text-sm/6 font-semibold">
                  {isAnonymous
                    ? isLinking
                      ? isElectron
                        ? "Linking with browser..."
                        : "Linking..."
                      : "Link Google Account"
                    : isSigningIn
                    ? isElectron
                      ? "Signing in with browser..."
                      : "Signing in..."
                    : "Sign in with Google"}
                </span>
              </button>
              {!isAnonymous && (
                <button
                  type="button"
                  onClick={() => {
                    signInAnonymously({});
                    onSignIn();
                  }}
                  disabled={isSigningIn || isSigningInAnonymously}
                  className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:inset-ring-transparent dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20 disabled:opacity-50"
                >
                  {isSigningInAnonymously
                    ? "Starting..."
                    : "Let me try it first"}
                </button>
              )}
              {!isElectron && !isAnonymous && (
                <>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200 dark:border-white/10"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-[var(--color-bg-primary)] px-2 text-gray-500 dark:text-gray-400">
                        Or
                      </span>
                    </div>
                  </div>
                  <a
                    href="https://github.com/ChristianAlfoni/divergent-todos/releases/latest"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:inset-ring-transparent dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
                  >
                    <ArrowDownTrayIcon className="size-5" />
                    Download Desktop App
                  </a>
                </>
              )}
              {error && (
                <p className="mt-2 text-sm text-[var(--color-error-text)]">
                  {error}
                </p>
              )}
              {anonymousError && (
                <p className="mt-2 text-sm text-[var(--color-error-text)]">
                  {anonymousError}
                </p>
              )}
              {linkError && (
                <p className="mt-2 text-sm text-[var(--color-error-text)]">
                  {linkError}
                </p>
              )}
              <p className="text-xs text-[var(--color-text-secondary)] text-center mt-4">
                By signing in, you agree to our{" "}
                <a
                  href={
                    isElectron ? "https://divergent-todos.com/terms" : "/terms"
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)] underline"
                >
                  Terms of Service
                </a>
              </p>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
