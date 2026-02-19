import { useState, useEffect } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { LightBulbIcon } from "@heroicons/react/24/outline";
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
  const [showDialog, setShowDialog] = useState(false);
  const onboarding = useOnboarding();

  // Play heartbeat sound when focus is activated, starting at 200ms mark
  const playHeartbeatSound = () => {
    try {
      const audio = new Audio('/heartbeat.mp3');
      audio.volume = 0.8; // Adjust volume (0.0 to 1.0)
      audio.currentTime = 0.2; // Start playing from 200ms (0.2 seconds) in
      audio.play().catch(err => {
        console.debug('Audio playback failed:', err);
      });
    } catch (error) {
      console.debug('Audio not available:', error);
    }
  };

  // Track start time when dialog opens and play heartbeat immediately
  useEffect(() => {
    if (open) {
      setStartTime(new Date());
      setShowDialog(true);
      // Play heartbeat sound immediately
      playHeartbeatSound();
    } else {
      setShowDialog(false);
    }
  }, [open]);

  const handleEnd = (markAsCompleted: boolean = false) => {
    if (!todo || !startTime) return;
    // Calculate elapsed minutes from start time to now
    const elapsedMs = Date.now() - startTime.getTime();
    const minutes = Math.max(1, Math.floor(elapsedMs / 60000));
    onAddSession(todo.id, minutes, isFocused);

    // Mark as completed if requested and not already completed
    if (markAsCompleted && !todo.completed) {
      onToggleTodoComplete(todo.id);
    }

    setStartTime(null);
    setIsFocused(false); // Reset for next time
    trackFocusClosed();
    onClose();
    onboarding.notifyTimeboxClosed(); // Keep old function name for now
  };

  if (!todo) return null;

  return (
    <>
      <Dialog open={showDialog} onClose={onMinimize} className="relative z-[60]">
      <DialogBackdrop
        transition
        className="fixed inset-0 backdrop-blur-sm bg-black/30 transition-opacity data-closed:opacity-0 data-enter:duration-400 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 z-[60] w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform transition-all data-closed:scale-95 data-closed:opacity-0 data-enter:duration-500 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg"
          >
            <div className="focus-breathing-border">
              <div className="relative overflow-hidden rounded-lg bg-white text-left shadow-xl dark:bg-gray-800">
            {/* Header */}
            <div className="px-6 pt-6 pb-4">
              <DialogTitle
                as="h2"
                className="text-xl font-semibold text-[var(--color-text-primary)] m-0 flex items-center gap-2"
              >
                <LightBulbIcon
                  aria-hidden="true"
                  className={`w-6 h-6 ${isFocused ? "text-yellow-500" : "text-[var(--color-accent-primary)]"}`}
                />
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
              {/* Left: Focus Toggle (No distractions) */}
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
                  <label id="no-distractions-label" htmlFor="no-distractions" className="font-medium text-[var(--color-text-primary)] cursor-default">
                    No distractions
                  </label>
                </div>
              </div>

              {/* Right: Split button (Complete + End Session) */}
              <span className="inline-flex">
                {/* Checkbox side */}
                <button
                  type="button"
                  onClick={() => handleEnd(true)}
                  aria-label="Complete and end session"
                  className={`inline-flex shrink-0 items-center rounded-l-md border px-2 py-2 transition-colors ${
                    isFocused
                      ? "border-yellow-500 bg-yellow-500 hover:bg-yellow-400"
                      : "border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-700 dark:bg-white/10 dark:hover:bg-white/20"
                  }`}
                >
                  <div className="group/checkbox grid size-4 grid-cols-1">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      readOnly
                      tabIndex={-1}
                      aria-hidden="true"
                      className={`col-start-1 row-start-1 appearance-none rounded-sm border pointer-events-none ${
                        isFocused
                          ? "border-white bg-white checked:border-white checked:bg-white"
                          : "border-gray-300 bg-white checked:border-[var(--color-accent-primary)] checked:bg-[var(--color-accent-primary)] dark:border-white/20 dark:bg-transparent dark:checked:border-indigo-500 dark:checked:bg-indigo-500"
                      }`}
                    />
                    <svg
                      fill="none"
                      viewBox="0 0 14 14"
                      className={`pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center ${
                        isFocused ? "stroke-yellow-500" : "stroke-white dark:stroke-white"
                      }`}
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
                </button>

                {/* End Session button side */}
                <button
                  type="button"
                  onClick={() => handleEnd(false)}
                  className={`-ml-px inline-flex items-center justify-center gap-2 rounded-r-md border px-4 py-2 text-sm font-semibold shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors ${
                    isFocused
                      ? "text-white border-yellow-500 bg-yellow-500 hover:bg-yellow-400 focus-visible:outline-yellow-500"
                      : "text-gray-700 border-gray-300 bg-white hover:bg-gray-50 focus-visible:outline-gray-400 dark:border-gray-700 dark:bg-white/10 dark:text-gray-100 dark:hover:bg-white/20"
                  }`}
                >
                  End Session
                </button>
              </span>
            </div>
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
      </Dialog>
    </>
  );
}
