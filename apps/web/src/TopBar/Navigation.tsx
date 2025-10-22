import { CalendarIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import type { Profile } from "../firebase";

interface NavigationProps {
  currentView: "calendar" | "activity";
  onViewChange: (view: "calendar" | "activity") => void;
  profile?: Profile | null;
  onOpenSubscription?: () => void;
}

export default function Navigation({
  currentView,
  onViewChange,
  profile,
  onOpenSubscription,
}: NavigationProps) {
  const hasActiveSubscription = profile?.subscription?.status === "active";

  return (
    <div className="flex rounded-lg bg-[var(--color-bg-secondary)] p-1">
      <button
        onClick={() => onViewChange("calendar")}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          currentView === "calendar"
            ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm"
            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        }`}
      >
        <CalendarIcon className="size-4" />
        Calendar
      </button>
      <button
        onClick={() => {
          if (!hasActiveSubscription) {
            onOpenSubscription?.();
          } else {
            onViewChange("activity");
          }
        }}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          currentView === "activity"
            ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm"
            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        }`}
      >
        <ChartBarIcon className="size-4" />
        Activity
        {!hasActiveSubscription && (
          <svg className="ml-1 size-3" viewBox="0 0 12 12" fill="currentColor">
            <path d="M4 0h4v1H4V0zM2 2h1V1h1v1h4V1h1v1h1v1h1v8H1V3h1V2zm1 1v1h1V3H3zm5 0v1h1V3H8zM2 5h8v5H2V5z" />
          </svg>
        )}
      </button>
    </div>
  );
}
