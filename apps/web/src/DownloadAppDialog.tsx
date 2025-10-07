import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

interface DownloadAppDialogProps {
  open: boolean;
  onClose: () => void;
  downloadUrl: string | null;
}

export default function DownloadAppDialog({
  open,
  onClose,
  downloadUrl,
}: DownloadAppDialogProps) {
  const handleDownload = () => {
    if (downloadUrl) {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-10">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-[var(--color-overlay)] transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-[var(--color-bg-primary)] px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-sm sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 outline -outline-offset-1 outline-[var(--color-outline)]"
          >
            <div>
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--color-accent-light)]">
                <ArrowDownTrayIcon
                  aria-hidden="true"
                  className="size-6 text-[var(--color-accent-text)]"
                />
              </div>
              <div className="mt-3 text-center sm:mt-5">
                <DialogTitle
                  as="h3"
                  className="text-base font-semibold text-[var(--color-text-primary)]"
                >
                  Download Desktop App
                </DialogTitle>
                <div className="mt-2">
                  <p className="text-sm text-[var(--color-text-secondary)]">
                    Browser tabs are often distracting and overwhelming. The
                    desktop app gives you direct access to Divergent Todos.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!downloadUrl}
                className="inline-flex w-full justify-center rounded-md bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Download App
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex w-full justify-center rounded-md border border-[var(--color-border-primary)] bg-[var(--color-bg-primary)] px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] shadow-xs hover:bg-[var(--color-bg-menu-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)]"
              >
                Cancel
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
