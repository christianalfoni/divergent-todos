import { useState, useEffect } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ClockIcon, LightBulbIcon } from "@heroicons/react/24/outline";
import type { Todo } from "./App";
import { useOnboarding } from "./contexts/OnboardingContext";
import { trackFocusClosed } from "./firebase/analytics";
import SmartEditor from "./SmartEditor";

interface FocusDialogProps {
  open: boolean;
  todo: Todo | null;
  onClose: () => void;
  onMinimize: () => void;
  onAddSession: (todoId: string, minutes: number, deepFocus: boolean) => void;
  onToggleTodoComplete: (todoId: string) => void;
}

export default function FocusDialog({
  open,
  todo,
  onClose,
  onMinimize,
  onAddSession,
  onToggleTodoComplete,
}: FocusDialogProps) {
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const onboarding = useOnboarding();

  // Track start time when dialog opens
  useEffect(() => {
    if (open) {
      setStartTime(new Date());
    }
  }, [open]);

  const handleEnd = () => {
    if (!todo || !startTime) return;
    // Calculate elapsed minutes from start time to now
    const elapsedMs = Date.now() - startTime.getTime();
    const minutes = Math.max(1, Math.floor(elapsedMs / 60000));
    onAddSession(todo.id, minutes, isFocused);
    setStartTime(null);
    setIsFocused(false); // Reset for next time
    trackFocusClosed();
    onClose();
    onboarding.notifyTimeboxClosed(); // Keep old function name for now
  };

  const handleToggleComplete = () => {
    if (!todo) return;
    onToggleTodoComplete(todo.id);
  };

  if (!todo) return null;

  return (
    <>
      <Dialog open={open} onClose={onMinimize} className="relative z-[60]">
      <DialogBackdrop
        transition
        className="fixed inset-0 backdrop-blur-md bg-[var(--color-overlay)] transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 z-[60] w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-800 dark:outline dark:-outline-offset-1 dark:outline-white/10"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <DialogTitle
                as="h2"
                className="text-xl font-semibold text-[var(--color-text-primary)] m-0 flex items-center gap-2"
              >
                {isFocused ? (
                  <LightBulbIcon
                    aria-hidden="true"
                    className="w-6 h-6 text-yellow-500"
                  />
                ) : (
                  <ClockIcon
                    aria-hidden="true"
                    className="w-6 h-6 text-[var(--color-accent-primary)]"
                  />
                )}
                Focus
              </DialogTitle>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              <div
                className="text-[var(--color-text-primary)]"
                style={{ ["--todo-text-size" as string]: "1.125rem" }}
              >
                <SmartEditor html={todo.text} editing={false} />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between dark:bg-gray-700/25">
              {/* Left: Completed Checkbox */}
              <div className="flex items-center gap-2">
                <div className="group/checkbox relative grid size-4 grid-cols-1">
                  <input
                    id="focus-completed"
                    type="checkbox"
                    checked={todo.completed}
                    onChange={handleToggleComplete}
                    className="col-start-1 row-start-1 appearance-none rounded-sm border border-[var(--color-border-secondary)] bg-[var(--color-bg-primary)] checked:border-[var(--color-accent-primary)] checked:bg-[var(--color-accent-primary)] indeterminate:border-[var(--color-accent-primary)] indeterminate:bg-[var(--color-accent-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:border-[var(--color-border-secondary)] disabled:bg-[var(--color-bg-secondary)] disabled:checked:bg-[var(--color-bg-secondary)] forced-colors:appearance-auto"
                  />
                  <svg
                    fill="none"
                    viewBox="0 0 14 14"
                    className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled/checkbox:stroke-[var(--color-text-secondary)]"
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
                <label htmlFor="focus-completed" className="text-sm text-[var(--color-text-primary)]">
                  Completed
                </label>
              </div>

              {/* Middle: Focus Toggle */}
              <div className="flex items-center justify-between gap-3">
                <div className="group relative inline-flex w-11 shrink-0 rounded-full bg-gray-200 p-0.5 inset-ring inset-ring-gray-900/5 outline-offset-2 outline-yellow-500 transition-colors duration-200 ease-in-out has-checked:bg-yellow-500 has-focus-visible:outline-2 dark:bg-white/5 dark:inset-ring-white/10 dark:outline-yellow-400 dark:has-checked:bg-yellow-400">
                  <span className="size-5 rounded-full bg-white shadow-xs ring-1 ring-gray-900/5 transition-transform duration-200 ease-in-out group-has-checked:translate-x-5" />
                  <input
                    id="no-distractions"
                    type="checkbox"
                    checked={isFocused}
                    onChange={(e) => setIsFocused(e.target.checked)}
                    aria-labelledby="no-distractions-label"
                    className="absolute inset-0 size-full appearance-none focus:outline-hidden"
                  />
                </div>
                <div className="text-sm">
                  <label id="no-distractions-label" className="font-medium text-[var(--color-text-primary)]">
                    No distractions
                  </label>
                </div>
              </div>

              {/* Right: End Button */}
              <button
                type="button"
                onClick={handleEnd}
                className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors ${
                  isFocused
                    ? "text-white bg-yellow-500 hover:bg-yellow-400 focus-visible:outline-yellow-500"
                    : "text-gray-700 bg-gray-200 hover:bg-gray-300 focus-visible:outline-gray-400 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500"
                }`}
              >
                End Session
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
      </Dialog>
    </>
  );
}
