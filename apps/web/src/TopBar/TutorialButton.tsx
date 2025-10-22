import { AcademicCapIcon } from "@heroicons/react/24/outline";

interface TutorialButtonProps {
  isOnboarding: boolean;
  currentStep?: string | null;
  onOpenOnboarding: () => void;
}

export default function TutorialButton({
  isOnboarding,
  currentStep,
  onOpenOnboarding,
}: TutorialButtonProps) {
  if (isOnboarding) {
    const stepText =
      currentStep === "workdays" ? "1/7" :
      currentStep === "add-todo" ? "2/7" :
      currentStep === "add-todo-with-url" ? "3/7" :
      currentStep === "edit-todo" ? "4/7" :
      currentStep === "move-todo" ? "5/7" :
      currentStep === "timebox" ? "6/7" :
      currentStep === "congratulations" ? "7/7" : "1/7";

    return (
      <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-xs font-medium text-yellow-800 inset-ring inset-ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-500 dark:inset-ring-yellow-400/20">
        Tutorial {stepText}
      </span>
    );
  }

  return (
    <button
      onClick={onOpenOnboarding}
      className="group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-menu-hover)] hover:text-[var(--color-accent-text-hover)]"
    >
      <AcademicCapIcon
        aria-hidden="true"
        className="size-6 shrink-0 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-text-hover)]"
      />
      Tutorial
    </button>
  );
}
