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
        className="fixed inset-0 backdrop-blur-md bg-[var(--color-overlay)] transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-800 dark:outline dark:-outline-offset-1 dark:outline-white/10"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-center justify-center">
              <DialogTitle
                as="h2"
                className="text-xl font-semibold text-[var(--color-text-primary)] m-0 flex items-center gap-2"
              >
                <SunIcon
                  aria-hidden="true"
                  className="w-6 h-6 text-[var(--color-warning-text)]"
                />
                It's the Weekend!
              </DialogTitle>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              <p className="text-lg/7 font-semibold text-[var(--color-text-primary)] text-center">
                Take a well-deserved break. Rest, recharge, and focus on the things that matter outside of work. Your well-being is just as important as your productivity.
              </p>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-6 flex justify-end dark:bg-gray-700/25">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex justify-center rounded-md bg-[var(--color-warning-button)] px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[var(--color-warning-button-hover)] dark:shadow-none"
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
