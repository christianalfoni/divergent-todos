import { useEffect, useState } from 'react';

interface UpdateInfo {
  version: string;
}

type UpdateState =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'downloading' } // Auto-downloading in background
  | { type: 'downloaded', info: UpdateInfo } // Ready to install
  | { type: 'installing', info: UpdateInfo }
  | { type: 'error', message: string };

export default function UpdateNotification() {
  const [updateState, setUpdateState] = useState<UpdateState>({ type: 'idle' });
  const isDesktop = typeof window.native?.updater !== 'undefined';

  useEffect(() => {
    if (!isDesktop || !window.native?.updater) return;

    // Set up event listeners and collect cleanup functions
    const unsubscribeReset = window.native.updater.onReset(() => {
      setUpdateState({ type: 'idle' });
    });

    const unsubscribeChecking = window.native.updater.onChecking(() => {
      setUpdateState({ type: 'checking' });
    });

    const unsubscribeAvailable = window.native.updater.onAvailable(() => {
      // Auto-download is enabled, so download starts automatically in background
      setUpdateState({ type: 'downloading' });
    });

    const unsubscribeNotAvailable = window.native.updater.onNotAvailable(() => {
      setUpdateState({ type: 'idle' });
    });

    const unsubscribeError = window.native.updater.onError((message) => {
      setUpdateState({ type: 'error', message });
      // Reset after 5 seconds
      setTimeout(() => setUpdateState({ type: 'idle' }), 5000);
    });

    const unsubscribeProgress = window.native.updater.onDownloadProgress(() => {
      // Keep state as 'downloading', don't show progress in UI
      setUpdateState({ type: 'downloading' });
    });

    const unsubscribeDownloaded = window.native.updater.onDownloaded((info) => {
      // Show the update button when download is complete
      setUpdateState({ type: 'downloaded', info });
    });

    // Cleanup all listeners on unmount
    return () => {
      unsubscribeReset();
      unsubscribeChecking();
      unsubscribeAvailable();
      unsubscribeNotAvailable();
      unsubscribeError();
      unsubscribeProgress();
      unsubscribeDownloaded();
    };
  }, [isDesktop]);

  // Only show UI when update is ready to install or currently installing
  if (!isDesktop || updateState.type === 'idle' || updateState.type === 'checking' || updateState.type === 'downloading') {
    return null;
  }

  const handleClick = () => {
    if (updateState.type === 'downloaded') {
      // Install the downloaded update
      setUpdateState({ type: 'installing', info: updateState.info });
      window.native!.updater.install();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={updateState.type === 'installing'}
      className="flex items-center gap-x-2 rounded-md px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-menu-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:opacity-50"
    >
      {updateState.type === 'installing' ? (
        <>
          {/* Spinner icon */}
          <svg
            className="size-5 text-[var(--color-accent-primary)] animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Installing...</span>
        </>
      ) : (
        <>
          {/* Download icon */}
          <svg
            className="size-5 text-[var(--color-accent-primary)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
          <span>Update app</span>
        </>
      )}
    </button>
  );
}
