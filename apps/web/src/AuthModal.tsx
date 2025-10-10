import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { UserCircleIcon } from "@heroicons/react/24/outline";
import { useSignIn } from "./hooks/useSignIn";
import { useSignInAnonymously } from "./hooks/useSignInAnonymously";

interface AuthModalProps {
  open: boolean;
  onSignIn: () => void;
}

export default function AuthModal({ open, onSignIn }: AuthModalProps) {
  const [{ isSigningIn, error }, signIn] = useSignIn();
  const [{ isSigningIn: isSigningInAnonymously, error: anonymousError }, signInAnonymously] = useSignInAnonymously();

  // Check if running in Electron
  const isElectron = window.navigator.userAgent.includes("Electron");

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
                  Sign in to continue
                </DialogTitle>
                <div className="mt-2">
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Please sign in with your Google account to access your
                    todos.
                  </p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-3">
                    By signing in, you agree to our{" "}
                    <a
                      href={isElectron ? "https://divergent-todos.com/terms" : "/terms"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)] underline"
                    >
                      Terms of Service
                    </a>
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-6 space-y-3">
              <button
                type="button"
                onClick={() => {
                  signIn({});
                  onSignIn();
                }}
                disabled={isSigningIn || isSigningInAnonymously}
                className="inline-flex w-full justify-center rounded-md bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningIn ? "Signing in..." : "Sign in with Google"}
              </button>
              {!isElectron && (
                <button
                  type="button"
                  onClick={() => {
                    signInAnonymously({});
                    onSignIn();
                  }}
                  disabled={isSigningIn || isSigningInAnonymously}
                  className="inline-flex w-full justify-center rounded-md bg-[var(--color-bg-secondary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] shadow-xs hover:bg-[var(--color-bg-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningInAnonymously ? "Starting..." : "Let me try it first"}
                </button>
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
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
