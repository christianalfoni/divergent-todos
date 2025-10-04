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
  const [isCompleting, setIsCompleting] = useState(false);
  const woodDoorKnock = useWoodDoorKnock();

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
    setTimeRemaining(minutes);
    setIsTimerActive(true);
  };

  const handleClose = () => {
    setTimeRemaining(null);
    setIsTimerActive(false);
    setIsCompleting(false);
    onClose();
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
    <Dialog open={open} onClose={isTimerActive ? () => {} : onClose} className="relative z-10">
      <DialogBackdrop
        transition
        className={`fixed inset-0 ${isTimerActive ? 'backdrop-blur-md bg-gray-500/90' : 'bg-gray-500/75'} transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in dark:bg-gray-900/50`}
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-800 dark:outline dark:-outline-offset-1 dark:outline-white/10"
          >
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 dark:bg-gray-800">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 sm:mx-0 sm:size-10 dark:bg-indigo-500/10">
                  <ClockIcon
                    aria-hidden="true"
                    className="size-6 text-indigo-600 dark:text-indigo-400"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900 dark:text-white"
                  >
                    Time Box To-Do
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {todo.text}
                    </p>
                    {todo.url && (
                      <a
                        href={todo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300 break-all underline"
                      >
                        {todo.url}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:justify-between sm:items-center sm:px-6 dark:bg-gray-700/25">
              {isTimerActive && timeRemaining !== null ? (
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {timeRemaining}
                  </span>
                  <span className="ml-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400">
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
                      className="inline-flex w-full justify-center rounded-md bg-gray-950/5 px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-950/10 sm:w-auto dark:bg-white/10 dark:text-white dark:inset-ring dark:inset-ring-white/5 dark:hover:bg-white/20"
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3 mt-3 sm:mt-0">
                {isTimerActive && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div className="group/checkbox grid size-4 grid-cols-1">
                      <input
                        type="checkbox"
                        checked={isCompleting}
                        onChange={handleMarkComplete}
                        className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 indeterminate:border-indigo-600 indeterminate:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:checked:border-indigo-500 dark:checked:bg-indigo-500 dark:indeterminate:border-indigo-500 dark:indeterminate:bg-indigo-500 dark:focus-visible:outline-indigo-500 dark:disabled:border-white/5 dark:disabled:bg-white/10 dark:disabled:checked:bg-white/10 forced-colors:appearance-auto"
                      />
                      <svg
                        fill="none"
                        viewBox="0 0 14 14"
                        className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled/checkbox:stroke-gray-950/25 dark:group-has-disabled/checkbox:stroke-white/25"
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
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Mark as completed
                    </span>
                  </label>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 sm:w-auto dark:bg-indigo-500 dark:shadow-none dark:hover:bg-indigo-400"
                >
                  {isTimerActive ? "Cancel" : "Close"}
                </button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
