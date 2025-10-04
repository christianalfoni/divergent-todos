import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { SunIcon } from "@heroicons/react/24/outline";

interface WeekendDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function WeekendDialog({ open, onClose }: WeekendDialogProps) {
  return (
    <Dialog open={open} onClose={() => {}} className="relative z-10">
      <DialogBackdrop
        transition
        className="fixed inset-0 backdrop-blur-md bg-gray-500/90 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in dark:bg-gray-900/50"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-800 dark:outline dark:-outline-offset-1 dark:outline-white/10"
          >
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4 dark:bg-gray-800">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-100 sm:mx-0 sm:size-10 dark:bg-amber-500/10">
                  <SunIcon
                    aria-hidden="true"
                    className="size-6 text-amber-600 dark:text-amber-400"
                  />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                  <DialogTitle
                    as="h3"
                    className="text-base font-semibold text-gray-900 dark:text-white"
                  >
                    It's the Weekend!
                  </DialogTitle>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Take a well-deserved break. Rest, recharge, and focus on the things that matter outside of work. Your well-being is just as important as your productivity.
                    </p>
                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                      Remember: the best work comes from a well-rested mind.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 dark:bg-gray-700/25">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex w-full justify-center rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-amber-500 sm:ml-3 sm:w-auto dark:bg-amber-500 dark:shadow-none dark:hover:bg-amber-400"
              >
                I just have to...
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
