import { CalendarIcon, ChartBarIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import type { Profile } from "../firebase";

interface NavigationProps {
  currentView: "calendar" | "activity";
  onViewChange: (view: "calendar" | "activity") => void;
  profile?: Profile | null;
  onOpenSubscription?: () => void;
  CalendarIconComponent?: typeof CalendarIcon;
  ChartBarIconComponent?: typeof ChartBarIcon;
  isLoadingActivity?: boolean;
  shouldPulsate?: boolean;
}

export default function Navigation({
  currentView,
  onViewChange,
  profile,
  onOpenSubscription,
  CalendarIconComponent = CalendarIcon,
  ChartBarIconComponent = ChartBarIcon,
  isLoadingActivity = false,
  shouldPulsate = false,
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
        <CalendarIconComponent className="size-4" />
        Attention
      </button>
      <button
        onClick={() => {
          if (!hasActiveSubscription) {
            onOpenSubscription?.();
          } else {
            onViewChange("activity");
          }
        }}
        disabled={isLoadingActivity}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-default ${
          currentView === "activity"
            ? "bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm"
            : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        } ${isLoadingActivity ? "opacity-50" : ""} ${shouldPulsate ? "activity-button-pulsate" : ""}`}
      >
        <ChartBarIconComponent className="size-4" />
        Reflection
        {!hasActiveSubscription && <LockClosedIcon className="ml-1 size-3" />}
      </button>
    </div>
  );
}
