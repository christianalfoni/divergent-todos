import { useState, useEffect } from 'react';
import { Transition } from '@headlessui/react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface DisconnectedNotificationProps {
  isDisconnected: boolean;
}

export default function DisconnectedNotification({ isDisconnected }: DisconnectedNotificationProps) {
  const [show, setShow] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

  // Show notification when disconnected (but respect dismissal)
  useEffect(() => {
    if (isDisconnected && !hasBeenDismissed) {
      setShow(true);
    } else if (!isDisconnected) {
      // Reset dismissal when reconnected
      setShow(false);
      setHasBeenDismissed(false);
    }
  }, [isDisconnected, hasBeenDismissed]);

  const handleDismiss = () => {
    setShow(false);
    setHasBeenDismissed(true);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed top-16 left-0 right-0 flex justify-end px-4 py-3 z-50"
    >
      <div className="flex w-full max-w-sm">
        <Transition show={show}>
          <div className="pointer-events-auto w-full overflow-hidden rounded-lg bg-white shadow-lg outline-1 outline-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:-translate-y-2 data-leave:duration-100 data-leave:ease-in dark:bg-gray-800 dark:-outline-offset-1 dark:outline-white/10">
            <div className="p-4">
              <div className="flex items-start">
                <div className="shrink-0">
                  <ExclamationTriangleIcon className="size-6 text-red-500 dark:text-red-400" aria-hidden="true" />
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Connection Lost</p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Your todos may not sync. Try refreshing the app to reconnect.
                  </p>
                  <div className="mt-3 flex space-x-3">
                    <button
                      type="button"
                      onClick={handleRefresh}
                      className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm outline outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:outline-white/15 dark:hover:bg-white/15"
                    >
                      Refresh
                    </button>
                    <button
                      type="button"
                      onClick={handleDismiss}
                      className="rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm outline outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:outline-white/15 dark:hover:bg-white/15"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                <div className="ml-4 flex shrink-0">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="inline-flex rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 dark:bg-gray-800 dark:hover:text-gray-300 dark:focus:outline-indigo-400"
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon className="size-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  );
}
