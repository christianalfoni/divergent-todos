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
            className="relative transform overflow-hidden rounded-lg bg-[var(--color-bg-dialog)] text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:outline dark:-outline-offset-1 dark:outline-white/10"
          >
            {/* Header */}
            <div className="px-6 py-6 border-b border-[var(--color-border-primary)] flex items-center justify-between">
              <DialogTitle
                as="h2"
                className="text-xl font-semibold text-[var(--color-text-primary)] m-0 flex items-center gap-2"
              >
                <ArrowDownTrayIcon
                  aria-hidden="true"
                  className="w-6 h-6 text-[var(--color-accent-primary)]"
                />
                Download Desktop App
              </DialogTitle>
              <button
                type="button"
                onClick={onClose}
                className="bg-transparent border-0 text-2xl text-[var(--color-text-secondary)] p-0 w-8 h-8 flex items-center justify-center rounded-md transition-all duration-150 hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-6">
              <p className="text-sm text-[var(--color-text-secondary)]">
                Browser tabs are often distracting and overwhelming. The
                desktop app gives you direct access to Divergent Todos.
              </p>
            </div>

            {/* Footer */}
            <div className="bg-[var(--color-bg-dialog-footer)] px-6 py-6 flex justify-end">
              <button
                type="button"
                onClick={handleDownload}
                disabled={!downloadUrl}
                className="inline-flex w-full justify-center items-center gap-3 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:inset-ring-transparent disabled:opacity-50 dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
              >
                <ArrowDownTrayIcon aria-hidden="true" className="h-5 w-5" />
                Download App
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
