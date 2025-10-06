import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import { type User } from "firebase/auth";
import { type Profile } from "./firebase/types/profile";
import { useLinkAnonymousAccount } from "./hooks/useLinkAnonymousAccount";

interface SubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  profile: Profile | null;
  isElectron?: boolean;
}

export default function SubscriptionDialog({ open, onClose, user, profile, isElectron = false }: SubscriptionDialogProps) {
  const [{ isLinking, error }, linkAccount] = useLinkAnonymousAccount();
  const isAnonymous = user?.isAnonymous ?? true;
  const hasActiveSubscription = profile?.subscription?.status === "active" ||
                                 profile?.subscription?.status === "trialing";

  // In Electron, don't allow closing if no subscription
  const canClose = !isElectron || hasActiveSubscription;

  let title: string;
  let description: string;
  let buttonText: string;
  let buttonAction: () => void;
  let isButtonDisabled = false;

  // In Electron, users are always signed in (never anonymous)
  if (isAnonymous && !isElectron) {
    title = "Sign in required";
    description = "Please sign in with your Google account to subscribe and unlock unlimited todos. Your existing todos will be preserved.";
    buttonText = isLinking ? "Signing in..." : "Sign in with Google";
    buttonAction = () => linkAccount(undefined);
    isButtonDisabled = isLinking;
  } else if (!hasActiveSubscription) {
    title = isElectron ? "Subscription required" : "Subscribe for unlimited todos";
    description = isElectron
      ? "The desktop app requires an active subscription. Get unlimited todos for just $2/month."
      : "Get unlimited todos for just $2/month. Continue adding todos without limits.";
    buttonText = "Subscribe - $2/month";
    buttonAction = onClose; // TODO: Implement subscription flow
  } else {
    title = "Manage subscription";
    description = "You have an active subscription. You can cancel it at any time.";
    buttonText = "Cancel subscription";
    buttonAction = onClose; // TODO: Implement cancellation flow
  }

  return (
    <Dialog
      open={open}
      onClose={canClose ? onClose : () => {}}
      className="relative z-10"
    >
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
                <BanknotesIcon
                  aria-hidden="true"
                  className="size-6 text-[var(--color-accent-text)]"
                />
              </div>
              <div className="mt-3 text-center sm:mt-5">
                <DialogTitle
                  as="h3"
                  className="text-base font-semibold text-[var(--color-text-primary)]"
                >
                  {title}
                </DialogTitle>
                <div className="mt-2">
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    {description}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-6">
              <button
                type="button"
                onClick={buttonAction}
                disabled={isButtonDisabled}
                className="inline-flex w-full justify-center rounded-md bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {buttonText}
              </button>
              {error && (
                <p className="mt-2 text-sm text-[var(--color-error-text)]">
                  {error}
                </p>
              )}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
