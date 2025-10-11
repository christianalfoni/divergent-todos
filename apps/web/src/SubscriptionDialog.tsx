import { useState } from "react";
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
import {
  startSubscription,
  openBillingPortal,
  stopSubscription,
  resumeSubscription,
} from "./firebase/subscriptions";
import {
  trackSubscriptionStarted,
  trackSubscriptionCanceled,
  trackSubscriptionResumed,
} from "./firebase/analytics";

interface SubscriptionDialogProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  profile: Profile | null;
  isElectron?: boolean;
}

export default function SubscriptionDialog({ open, onClose, user, profile, isElectron = false }: SubscriptionDialogProps) {
  const [{ isLinking, error: linkError }, linkAccount] = useLinkAnonymousAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAnonymous = user?.isAnonymous ?? true;
  const subscriptionStatus = profile?.subscription?.status;
  const cancelAtPeriodEnd = profile?.subscription?.cancelAtPeriodEnd ?? false;
  const currentPeriodEnd = profile?.subscription?.currentPeriodEnd;

  // Can close if not in Electron, or if in Electron and has active subscription
  const canClose = !isElectron || subscriptionStatus === "active";

  const handleOpenBillingPortal = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      // In Electron, don't pass returnUrl (let server use default)
      const isElectronEnv = !window.location.origin.startsWith('http');
      await openBillingPortal(isElectronEnv ? undefined : { returnUrl: window.location.origin });
      setIsProcessing(false);
    } catch (err: any) {
      setError(err.message || "Failed to open billing portal");
      setIsProcessing(false);
    }
  };

  const handleStartSubscription = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      // Track subscription start
      trackSubscriptionStarted();

      // In Electron, don't pass URLs (let server use defaults)
      const isElectronEnv = !window.location.origin.startsWith('http');
      await startSubscription(
        isElectronEnv
          ? undefined
          : {
              successUrl: window.location.origin,
              cancelUrl: window.location.origin,
            }
      );
    } catch (err: any) {
      setError(err.message || "Failed to start subscription");
      setIsProcessing(false);
    }
  };

  const handleStopSubscription = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await stopSubscription();

      // Track subscription cancellation
      trackSubscriptionCanceled();

      setIsProcessing(false);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to cancel subscription");
      setIsProcessing(false);
    }
  };

  const handleResumeSubscription = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await resumeSubscription();

      // Track subscription resume
      trackSubscriptionResumed();

      setIsProcessing(false);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to resume subscription");
      setIsProcessing(false);
    }
  };

  let title: string;
  let description: string;
  let primaryButtonText: string;
  let primaryButtonAction: () => void;
  let isPrimaryButtonDisabled = false;
  let showSecondaryButton = false;
  let secondaryButtonText = "";
  let secondaryButtonAction: () => void = () => {};

  // Anonymous users (both web and desktop) need to sign in to subscribe
  if (isAnonymous) {
    title = "Sign in required";
    description = "Please sign in with your Google account to subscribe and unlock unlimited todos. Your existing todos will be preserved.";
    primaryButtonText = isLinking ? "Signing in..." : "Sign in with Google";
    primaryButtonAction = () => linkAccount(undefined);
    isPrimaryButtonDisabled = isLinking;
  } else if (!subscriptionStatus || subscriptionStatus === "incomplete") {
    title = "Subscribe for unlimited todos";
    description = "Get unlimited todos for just $2/month. Continue adding todos without limits.";
    primaryButtonText = isProcessing ? "Starting..." : "Subscribe - $2/month";
    primaryButtonAction = handleStartSubscription;
    isPrimaryButtonDisabled = isProcessing;
  } else if (subscriptionStatus === "active") {
    if (cancelAtPeriodEnd && currentPeriodEnd) {
      title = "Subscription canceling";
      description = `Your subscription is set to cancel on ${currentPeriodEnd.toLocaleDateString()}. You can continue using unlimited todos until then. Resume your subscription to continue beyond this date.`;
      primaryButtonText = isProcessing ? "Resuming..." : "Resume subscription";
      primaryButtonAction = handleResumeSubscription;
      isPrimaryButtonDisabled = isProcessing;
      showSecondaryButton = true;
      secondaryButtonText = "Manage billing";
      secondaryButtonAction = handleOpenBillingPortal;
    } else {
      title = "Active subscription";
      description = "You have an active subscription with unlimited todos. You can cancel at any time and continue using your subscription until the end of the billing period.";
      primaryButtonText = isProcessing ? "Canceling..." : "Cancel subscription";
      primaryButtonAction = handleStopSubscription;
      isPrimaryButtonDisabled = isProcessing;
      showSecondaryButton = true;
      secondaryButtonText = "Manage billing";
      secondaryButtonAction = handleOpenBillingPortal;
    }
  } else if (subscriptionStatus === "past_due") {
    title = "Payment past due";
    description = "Your payment is past due. Please update your payment method to continue using unlimited todos.";
    primaryButtonText = "Update payment";
    primaryButtonAction = handleOpenBillingPortal;
    isPrimaryButtonDisabled = isProcessing;
    showSecondaryButton = true;
    secondaryButtonText = isProcessing ? "Canceling..." : "Cancel subscription";
    secondaryButtonAction = handleStopSubscription;
  } else if (subscriptionStatus === "unpaid") {
    title = "Subscription unpaid";
    description = "Your subscription payment has failed. Please update your payment method immediately to avoid service interruption.";
    primaryButtonText = "Update payment";
    primaryButtonAction = handleOpenBillingPortal;
    isPrimaryButtonDisabled = isProcessing;
    showSecondaryButton = true;
    secondaryButtonText = isProcessing ? "Canceling..." : "Cancel subscription";
    secondaryButtonAction = handleStopSubscription;
  } else if (subscriptionStatus === "canceled") {
    title = "Subscription canceled";
    description = "Your subscription has been canceled. Resubscribe to get unlimited todos again.";
    primaryButtonText = isProcessing ? "Starting..." : "Resubscribe - $2/month";
    primaryButtonAction = handleStartSubscription;
    isPrimaryButtonDisabled = isProcessing;
  } else {
    // Fallback for any other states
    title = "Manage subscription";
    description = "Manage your subscription settings and billing information.";
    primaryButtonText = "Open billing portal";
    primaryButtonAction = handleOpenBillingPortal;
    isPrimaryButtonDisabled = isProcessing;
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
            <div className="mt-5 sm:mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={primaryButtonAction}
                disabled={isPrimaryButtonDisabled}
                className="inline-flex w-full justify-center rounded-md bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {primaryButtonText}
              </button>
              {showSecondaryButton && (
                <button
                  type="button"
                  onClick={secondaryButtonAction}
                  disabled={isProcessing}
                  className="inline-flex w-full justify-center rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] shadow-xs hover:bg-[var(--color-bg-menu-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {secondaryButtonText}
                </button>
              )}
              {(error || linkError) && (
                <p className="mt-2 text-sm text-[var(--color-error-text)]">
                  {error || linkError}
                </p>
              )}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
