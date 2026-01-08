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
}

export default function FocusDialog({
  open,
  todo,
  onClose,
  onMinimize,
  onAddSession,
}: FocusDialogProps) {
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [isHoveringNoDistraction, setIsHoveringNoDistraction] = useState(false);
  const onboarding = useOnboarding();

  // Track start time when dialog opens
  useEffect(() => {
    if (open) {
      setStartTime(new Date());
    }
  }, [open]);

  const handleClose = () => {
    setStartTime(null);
    trackFocusClosed();
    onClose();
    onboarding.notifyTimeboxClosed(); // Keep old function name for now
  };

  const handleNoDistractions = () => {
    if (!todo || !startTime) return;
    // Reset hover state immediately when button is clicked
    setIsHoveringNoDistraction(false);
    // Calculate elapsed minutes from start time to now
    const elapsedMs = Date.now() - startTime.getTime();
    const minutes = Math.max(1, Math.floor(elapsedMs / 60000));
    onAddSession(todo.id, minutes, true);
    handleClose();
  };

  const handleGotDistracted = () => {
    if (!todo || !startTime) return;
    // Calculate elapsed minutes from start time to now
    const elapsedMs = Date.now() - startTime.getTime();
    const minutes = Math.max(1, Math.floor(elapsedMs / 60000));
    onAddSession(todo.id, minutes, false);
    handleClose();
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
            <div className="px-6 pt-6 pb-4 flex items-center justify-between">
              <DialogTitle
                as="h2"
                className="text-xl font-semibold text-[var(--color-text-primary)] m-0 flex items-center gap-2"
              >
                {isHoveringNoDistraction ? (
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
              {/* Without Distraction Button */}
              <button
                type="button"
                onClick={handleNoDistractions}
                onMouseEnter={() => setIsHoveringNoDistraction(true)}
                onMouseLeave={() => setIsHoveringNoDistraction(false)}
                className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 transition-all ${
                  isHoveringNoDistraction
                    ? "bg-yellow-500 text-white focus-visible:outline-yellow-500"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300 focus-visible:outline-gray-400 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500"
                }`}
              >
                Without distraction
              </button>

              {/* With Distraction Button */}
              <button
                type="button"
                onClick={handleGotDistracted}
                className="inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold text-gray-700 bg-gray-200 shadow-xs hover:bg-gray-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400 transition-colors dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500"
              >
                With distraction
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
      </Dialog>
    </>
  );
}
