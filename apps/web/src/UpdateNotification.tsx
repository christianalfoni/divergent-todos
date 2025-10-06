import { useEffect, useState } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';

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
  | { type: 'error', message: string };

export default function UpdateNotification() {
  const [updateState, setUpdateState] = useState<UpdateState>({ type: 'idle' });
  const isDesktop = typeof window.native?.updater !== 'undefined';

  useEffect(() => {
    if (!isDesktop) return;

    // Set up event listeners and collect cleanup functions
    const unsubscribeChecking = window.native!.updater.onChecking(() => {
      setUpdateState({ type: 'checking' });
    });

    const unsubscribeAvailable = window.native!.updater.onAvailable((info) => {
      setUpdateState({ type: 'available', info });
    });

    const unsubscribeNotAvailable = window.native!.updater.onNotAvailable(() => {
      setUpdateState({ type: 'idle' });
    });

    const unsubscribeError = window.native!.updater.onError((message) => {
      setUpdateState({ type: 'error', message });
      // Reset after 5 seconds
      setTimeout(() => setUpdateState({ type: 'idle' }), 5000);
    });

    const unsubscribeProgress = window.native!.updater.onDownloadProgress((progress) => {
      setUpdateState({ type: 'downloading', progress });
    });

    const unsubscribeDownloaded = window.native!.updater.onDownloaded((info) => {
      setUpdateState({ type: 'downloaded', info });
    });

    // Cleanup all listeners on unmount
    return () => {
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

  const handleDownload = () => {
    if (updateState.type === 'available') {
      window.native!.updater.download();
    }
  };

  const handleInstall = () => {
    if (updateState.type === 'downloaded') {
      window.native!.updater.install();
    }
  };

  return (
    <Menu as="div" className="relative ml-3">
      <MenuButton className="relative flex items-center justify-center size-8 rounded-full hover:bg-[var(--color-bg-menu-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)]">
        <span className="sr-only">Update available</span>
        {updateState.type === 'downloading' ? (
          // Animated download icon
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
              className="animate-pulse"
            />
          </svg>
        ) : updateState.type === 'downloaded' ? (
          // Ready to install - pulsing indicator
          <div className="relative">
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-[var(--color-accent-primary)] animate-ping" />
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-[var(--color-accent-primary)]" />
          </div>
        ) : (
          // Update available
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
        )}
      </MenuButton>

      <MenuItems
        transition
        className="absolute right-0 z-10 mt-2 w-72 origin-top-right rounded-md bg-[var(--color-bg-primary)] py-1 shadow-lg outline outline-[var(--color-outline)] transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:shadow-none dark:-outline-offset-1"
      >
        {updateState.type === 'available' && (
          <>
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                Update Available
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Version {updateState.info.version} is ready to download
              </p>
            </div>
            <div className="my-1 h-px bg-[var(--color-border-primary)]" />
            <MenuItem>
              <button
                onClick={handleDownload}
                className="block w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
              >
                Download Update
              </button>
            </MenuItem>
          </>
        )}

        {updateState.type === 'downloading' && (
          <>
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                Downloading Update
              </p>
              <div className="mt-2">
                <div className="w-full bg-[var(--color-bg-secondary)] rounded-full h-2">
                  <div
                    className="bg-[var(--color-accent-primary)] h-2 rounded-full transition-all duration-300"
                    style={{ width: `${updateState.progress.percent}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                  {updateState.progress.percent.toFixed(0)}% ({(updateState.progress.transferred / 1024 / 1024).toFixed(1)}MB / {(updateState.progress.total / 1024 / 1024).toFixed(1)}MB)
                </p>
              </div>
            </div>
          </>
        )}

        {updateState.type === 'downloaded' && (
          <>
            <div className="px-4 py-3">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                Update Ready
              </p>
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                Version {updateState.info.version} is ready to install
              </p>
            </div>
            <div className="my-1 h-px bg-[var(--color-border-primary)]" />
            <MenuItem>
              <button
                onClick={handleInstall}
                className="block w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
              >
                Install and Restart
              </button>
            </MenuItem>
          </>
        )}

        {updateState.type === 'error' && (
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-red-500">
              Update Error
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">
              {updateState.message}
            </p>
          </div>
        )}
      </MenuItems>
    </Menu>
  );
}
