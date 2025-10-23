import { BanknotesIcon } from "@heroicons/react/24/outline";
import type { Profile } from "../firebase";

interface SubscriptionNoticesProps {
  profile?: Profile | null;
  onOpenSubscription?: () => void;
  onOpenBillingPortal: () => Promise<void>;
  isOpeningPortal: boolean;
}

export default function SubscriptionNotices({
  profile,
  onOpenSubscription,
  onOpenBillingPortal,
  isOpeningPortal,
}: SubscriptionNoticesProps) {
  const subscriptionStatus = profile?.subscription?.status;
  const showPaymentWarning = subscriptionStatus === "past_due" || subscriptionStatus === "unpaid";
  const showCancellationNotice =
    profile?.subscription?.cancelAtPeriodEnd && profile?.subscription?.currentPeriodEnd;

  // Payment warning (past_due or unpaid)
  if (showPaymentWarning) {
    return (
      <button
        onClick={onOpenBillingPortal}
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
    );
  }

  // Cancellation notice
  if (showCancellationNotice) {
    return (
      <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 inset-ring inset-ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-500 dark:inset-ring-yellow-400/20">
        Subscription ends{" "}
        {new Date(profile?.subscription?.currentPeriodEnd!).toLocaleDateString()}
      </span>
    );
  }

  // Free account indicators
  if (profile && subscriptionStatus !== "active") {
    return (
      <>
        <div className="flex items-center gap-x-2 text-sm text-[var(--color-text-secondary)]">
          <span>{profile.freeTodoCount || 0} / 20 free todos added</span>
        </div>
        {onOpenSubscription && (
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
      </>
    );
  }

  return null;
}
