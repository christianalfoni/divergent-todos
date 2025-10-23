import { useState, useEffect } from "react";
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
}

export default function SubscriptionDialog({ open, onClose, user: _user, profile }: SubscriptionDialogProps) {
  const [{ isLinking, error: linkError }, linkAccount] = useLinkAnonymousAccount();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWaitingForWebhook, setIsWaitingForWebhook] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const isAnonymous = _user?.isAnonymous ?? true;
  const subscriptionStatus = profile?.subscription?.status;
  const cancelAtPeriodEnd = profile?.subscription?.cancelAtPeriodEnd ?? false;
  const currentPeriodEnd = profile?.subscription?.currentPeriodEnd;

  // Animation effect
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [open]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Listen for window close events in Electron
  useEffect(() => {
    const onWindowClosed = window.native?.onWindowClosed;
    if (!onWindowClosed) return;

    const unsubscribe = onWindowClosed(() => {
      // When checkout window closes, we're waiting for webhook to update subscription
      setIsProcessing(false);
      setIsWaitingForWebhook(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // When subscription becomes active, clear the waiting state
  useEffect(() => {
    if (isWaitingForWebhook && subscriptionStatus === "active") {
      setIsWaitingForWebhook(false);
    }
  }, [isWaitingForWebhook, subscriptionStatus]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200); // Wait for fade-out animation
  };

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
  let secondaryButtonText = "";
  let secondaryButtonAction: () => void = () => {};

  // Show waiting state when checkout completed but webhook hasn't updated subscription yet
  if (isWaitingForWebhook) {
    title = "Processing subscription...";
    description = "Your payment was successful! We're activating your subscription now. This usually takes a few seconds.";
    primaryButtonText = "Activating...";
    primaryButtonAction = () => {};
    isPrimaryButtonDisabled = true;
  } else if (isAnonymous) {
    title = "Sign in required";
    description = "Please sign in with your Google account to subscribe and unlock unlimited todos. Your existing todos will be preserved.";
    primaryButtonText = isLinking ? "Signing in..." : "Sign in with Google";
    primaryButtonAction = () => linkAccount(undefined);
    isPrimaryButtonDisabled = isLinking;
  } else if (!subscriptionStatus || subscriptionStatus === "incomplete") {
    title = "Subscribe to Divergent Todos";
    description = "The only plan for everyone, forever";
    primaryButtonText = isProcessing ? "Starting..." : "Subscribe";
    primaryButtonAction = handleStartSubscription;
    isPrimaryButtonDisabled = isProcessing;
  } else if (subscriptionStatus === "active") {
    if (cancelAtPeriodEnd && currentPeriodEnd) {
      title = "Subscription canceling";
      description = `Your subscription is set to cancel on ${currentPeriodEnd.toLocaleDateString()}. You can continue using unlimited todos until then. Resume your subscription to continue beyond this date.`;
      primaryButtonText = isProcessing ? "Resuming..." : "Resume subscription";
      primaryButtonAction = handleResumeSubscription;
      isPrimaryButtonDisabled = isProcessing;
      secondaryButtonText = "Manage billing";
      secondaryButtonAction = handleOpenBillingPortal;
    } else {
      title = "Active subscription";
      description = "You have an active subscription with unlimited todos. You can cancel at any time and continue using your subscription until the end of the billing period.";
      primaryButtonText = isProcessing ? "Canceling..." : "Cancel subscription";
      primaryButtonAction = handleStopSubscription;
      isPrimaryButtonDisabled = isProcessing;
      secondaryButtonText = "Manage billing";
      secondaryButtonAction = handleOpenBillingPortal;
    }
  } else if (subscriptionStatus === "past_due") {
    title = "Payment past due";
    description = "Your payment is past due. Please update your payment method to continue using unlimited todos.";
    primaryButtonText = "Update payment";
    primaryButtonAction = handleOpenBillingPortal;
    isPrimaryButtonDisabled = isProcessing;
    secondaryButtonText = isProcessing ? "Canceling..." : "Cancel subscription";
    secondaryButtonAction = handleStopSubscription;
  } else if (subscriptionStatus === "unpaid") {
    title = "Subscription unpaid";
    description = "Your subscription payment has failed. Please update your payment method immediately to avoid service interruption.";
    primaryButtonText = "Update payment";
    primaryButtonAction = handleOpenBillingPortal;
    isPrimaryButtonDisabled = isProcessing;
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

  if (!open) return null;

  return (
    <div
      className={`monday-dialog-overlay ${isVisible ? 'visible' : ''}`}
      onClick={handleClose}
    >
      <div
        className={`monday-dialog ${isVisible ? 'visible' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="monday-dialog-header">
          <h2>
            <svg className="monday-dialog-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
            {title}
          </h2>
          <button
            className="monday-dialog-close"
            onClick={handleClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="monday-dialog-content">
          <p className="text-sm text-[var(--color-text-secondary)] text-center">
            {description}
          </p>

          {/* Show pricing and features for subscription state */}
          {(!subscriptionStatus || subscriptionStatus === "incomplete") && (
            <>
              <div className="mt-8 flex items-baseline justify-center gap-x-2">
                <span className="text-5xl font-semibold tracking-tight text-[var(--color-text-primary)]">
                  $2
                </span>
                <span className="text-sm font-semibold text-[var(--color-text-secondary)]">/month</span>
              </div>

              <ul className="mt-8 space-y-3 text-sm text-[var(--color-text-primary)]">
                <li className="flex gap-x-3">
                  <svg className="h-6 w-5 flex-none text-[var(--color-accent-primary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited todos
                </li>
                <li className="flex gap-x-3">
                  <svg className="h-6 w-5 flex-none text-[var(--color-accent-primary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Weekly activity tracking
                </li>
                <li className="flex gap-x-3">
                  <svg className="h-6 w-5 flex-none text-[var(--color-accent-primary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  AI-generated weekly summaries
                </li>
                <li className="flex gap-x-3">
                  <svg className="h-6 w-5 flex-none text-[var(--color-accent-primary)]" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Hopefully, a stronger sense of owning your attention
                </li>
              </ul>
            </>
          )}

          {(error || linkError) && (
            <p className="mt-4 text-sm text-[var(--color-error-text)]">
              {error || linkError}
            </p>
          )}
        </div>
        <div className="monday-dialog-actions">
          {/* Show buttons in different layouts based on the state */}
          {/* When active (not canceling): Cancel (left, flat) + Manage Billing (right, primary) */}
          {subscriptionStatus === "active" && !cancelAtPeriodEnd && (
            <>
              <button
                type="button"
                onClick={primaryButtonAction}
                disabled={isPrimaryButtonDisabled}
                className="monday-dialog-button monday-dialog-button-flat"
              >
                {primaryButtonText}
              </button>
              <button
                type="button"
                onClick={secondaryButtonAction}
                disabled={isProcessing}
                className="monday-dialog-button monday-dialog-button-primary"
              >
                {secondaryButtonText}
              </button>
            </>
          )}
          {/* When active (canceling): Resume (left) + Manage Billing (right, primary) */}
          {subscriptionStatus === "active" && cancelAtPeriodEnd && (
            <>
              <button
                type="button"
                onClick={primaryButtonAction}
                disabled={isPrimaryButtonDisabled}
                className="monday-dialog-button"
              >
                {primaryButtonText}
              </button>
              <button
                type="button"
                onClick={secondaryButtonAction}
                disabled={isProcessing}
                className="monday-dialog-button monday-dialog-button-primary"
              >
                {secondaryButtonText}
              </button>
            </>
          )}
          {/* When past_due or unpaid: Update Payment (left, primary) + Cancel (right, flat) */}
          {(subscriptionStatus === "past_due" || subscriptionStatus === "unpaid") && (
            <>
              <button
                type="button"
                onClick={primaryButtonAction}
                disabled={isPrimaryButtonDisabled}
                className="monday-dialog-button monday-dialog-button-primary"
              >
                {primaryButtonText}
              </button>
              <button
                type="button"
                onClick={secondaryButtonAction}
                disabled={isProcessing}
                className="monday-dialog-button monday-dialog-button-flat"
              >
                {secondaryButtonText}
              </button>
            </>
          )}
          {/* For other states (sign in, subscribe, etc.): just primary button centered */}
          {subscriptionStatus !== "active" && subscriptionStatus !== "past_due" && subscriptionStatus !== "unpaid" && (
            <button
              type="button"
              onClick={primaryButtonAction}
              disabled={isPrimaryButtonDisabled}
              className="monday-dialog-button"
            >
              {primaryButtonText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
