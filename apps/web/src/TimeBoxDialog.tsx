import { useState, useEffect } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ClockIcon } from "@heroicons/react/24/outline";
import type { Todo } from "./App";
import { useWoodDoorKnock } from "./hooks/useWoodDoorKnock";
import { useOnboarding } from "./contexts/OnboardingContext";
import { trackTimeboxClosed } from "./firebase/analytics";
import SmartEditor from "./SmartEditor";

interface TimeBoxDialogProps {
  open: boolean;
  todo: Todo | null;
  onClose: () => void;
  onComplete: (todoId: string) => void;
}

const timeOptions = [
  { name: "5min", minutes: 5 },
  { name: "15min", minutes: 15 },
  { name: "30min", minutes: 30 },
  { name: "1hour", minutes: 60 },
];

export default function TimeBoxDialog({
  open,
  todo,
  onClose,
  onComplete,
}: TimeBoxDialogProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [hasTimerStarted, setHasTimerStarted] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const woodDoorKnock = useWoodDoorKnock();
  const onboarding = useOnboarding();

  useEffect(() => {
    if (!isTimerActive || timeRemaining === null) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) {
          setIsTimerActive(false);
          woodDoorKnock.play();
          return 0;
        }
        return prev - 1;
      });
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [isTimerActive, timeRemaining, woodDoorKnock]);

  const handleTimeSelect = (minutes: number) => {
    setHasTimerStarted(true);
    // If timer has completed (at 0), add time; otherwise set new time
    if (timeRemaining === 0) {
      setTimeRemaining(minutes);
    } else {
      setTimeRemaining(minutes);
    }
    setIsTimerActive(true);
  };

  const handleClose = () => {
    setTimeRemaining(null);
    setIsTimerActive(false);
    setHasTimerStarted(false);
    setIsCompleting(false);

    // Track timebox close
    trackTimeboxClosed();

    onClose();
    // Notify onboarding that timebox was closed
    onboarding.notifyTimeboxClosed();
  };

  const handleMarkComplete = async () => {
    if (!todo) return;
    setIsCompleting(true);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Delay to show checkbox
    onComplete(todo.id);
    handleClose();
  };

  if (!todo) return null;

  return (
    <Dialog
      open={open}
      onClose={hasTimerStarted ? () => {} : onClose}
      className="relative z-[60]"
    >
      <DialogBackdrop
        transition
        className={`fixed inset-0 ${
          isTimerActive ? "backdrop-blur-md" : ""
        } bg-[var(--color-overlay)] transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in`}
      />

      <div className="fixed inset-0 z-[60] w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-[var(--color-bg-dialog)] text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:outline dark:-outline-offset-1 dark:outline-white/10"
          >
            {/* Header */}
            <div className="px-6 py-6 border-b border-[var(--color-border-primary)] flex items-center justify-between">
              <DialogTitle
                as="h2"
                className="text-xl font-semibold text-[var(--color-text-primary)] m-0 flex items-center gap-2"
              >
                <ClockIcon
                  aria-hidden="true"
                  className="w-6 h-6 text-[var(--color-accent-primary)]"
                />
                Time Box
              </DialogTitle>
              <button
                type="button"
                onClick={handleClose}
                className="bg-transparent border-0 text-2xl text-[var(--color-text-secondary)] p-0 w-8 h-8 flex items-center justify-center rounded-md transition-all duration-150 hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <div
                className="text-[var(--color-text-primary)] mb-3"
                style={{ ['--todo-text-size' as string]: '1.125rem' }}
              >
                <SmartEditor html={todo.text} editing={false} />
              </div>
              {todo.url && (
                <a
                  href={todo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-[var(--color-accent-text)] hover:text-[var(--color-accent-text-hover)] break-all underline"
                >
                  {todo.url}
                </a>
              )}
            </div>
            <div className="bg-[var(--color-bg-dialog-footer)] px-6 py-6 sm:flex sm:justify-between sm:items-center">
              {isTimerActive && timeRemaining !== null && timeRemaining > 0 ? (
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-[var(--color-accent-text)]">
                    {timeRemaining}
                  </span>
                  <span className="ml-2 text-sm font-semibold text-[var(--color-accent-text)]">
                    min
                  </span>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-3">
                  {timeOptions.map((option) => (
                    <button
                      key={option.name}
                      type="button"
                      onClick={() => handleTimeSelect(option.minutes)}
                      className="inline-flex w-full justify-center rounded-md bg-[var(--color-bg-button-secondary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-button-secondary-hover)] sm:w-auto dark:inset-ring dark:inset-ring-white/5"
                    >
                      {hasTimerStarted ? `+${option.name}` : option.name}
                    </button>
                  ))}
                </div>
              )}
              {hasTimerStarted && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2">
                    <div className="group/checkbox grid size-4 grid-cols-1">
                      <input
                        type="checkbox"
                        checked={isCompleting}
                        onChange={handleMarkComplete}
                        className="col-start-1 row-start-1 appearance-none rounded-sm border border-[var(--color-border-secondary)] bg-[var(--color-bg-dialog)] checked:border-[var(--color-accent-primary)] checked:bg-[var(--color-accent-primary)] indeterminate:border-[var(--color-accent-primary)] indeterminate:bg-[var(--color-accent-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:border-[var(--color-border-secondary)] disabled:bg-[var(--color-bg-tertiary)] disabled:checked:bg-[var(--color-bg-tertiary)] forced-colors:appearance-auto"
                      />
                      <svg
                        fill="none"
                        viewBox="0 0 14 14"
                        className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled/checkbox:stroke-[var(--color-text-tertiary)]"
                      >
                        <path
                          d="M3 8L6 11L11 3.5"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="opacity-0 group-has-checked/checkbox:opacity-100"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                      Mark done
                    </span>
                  </label>
                </div>
              )}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
