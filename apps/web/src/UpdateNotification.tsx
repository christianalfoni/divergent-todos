import { useEffect, useState } from 'react';

interface UpdateInfo {
  version: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

type UpdateState =
  | { type: 'idle' }
  | { type: 'checking' }
  | { type: 'available', info: UpdateInfo }
  | { type: 'downloading', progress: DownloadProgress }
  | { type: 'downloaded', info: UpdateInfo }
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

    const unsubscribeAvailable = window.native.updater.onAvailable((info) => {
      setUpdateState({ type: 'available', info });
    });

    const unsubscribeNotAvailable = window.native.updater.onNotAvailable(() => {
      setUpdateState({ type: 'idle' });
    });

    const unsubscribeError = window.native.updater.onError((message) => {
      setUpdateState({ type: 'error', message });
      // Reset after 5 seconds
      setTimeout(() => setUpdateState({ type: 'idle' }), 5000);
    });

    const unsubscribeProgress = window.native.updater.onDownloadProgress((progress) => {
      setUpdateState({ type: 'downloading', progress });
    });

    const unsubscribeDownloaded = window.native.updater.onDownloaded((info) => {
      setUpdateState({ type: 'installing', info });
      // Automatically install when download completes
      window.native!.updater.install();
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

  if (!isDesktop || updateState.type === 'idle' || updateState.type === 'checking') {
    return null;
  }

  const handleClick = () => {
    if (updateState.type === 'available') {
      // Immediately set to downloading state
      setUpdateState({ type: 'downloading', progress: { percent: 0, bytesPerSecond: 0, total: 0, transferred: 0 } });
      window.native!.updater.download();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={updateState.type === 'downloading' || updateState.type === 'installing'}
      className="flex items-center gap-x-2 rounded-md px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-menu-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {updateState.type === 'downloading' || updateState.type === 'installing' ? (
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
          <span>{updateState.type === 'installing' ? 'Installing...' : 'Downloading...'}</span>
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
