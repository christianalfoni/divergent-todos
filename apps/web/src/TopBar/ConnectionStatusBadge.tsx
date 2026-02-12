import type { ConnectionStatus } from '../hooks/useTodos';

interface ConnectionStatusBadgeProps {
  status: ConnectionStatus;
}

export default function ConnectionStatusBadge({ status }: ConnectionStatusBadgeProps) {
  // Don't show anything when connected
  if (status === 'connected') {
    return null;
  }

  const isReconnecting = status === 'connecting';
  const isDisconnected = status === 'disconnected';

  return (
    <span className="inline-flex items-center gap-x-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-900 inset-ring inset-ring-gray-200 dark:text-white dark:inset-ring-white/10">
      {isReconnecting && (
        <>
          <svg viewBox="0 0 6 6" aria-hidden="true" className="size-1.5 fill-yellow-500 dark:fill-yellow-400">
            <circle r={3} cx={3} cy={3} />
          </svg>
          Reconnecting
        </>
      )}
      {isDisconnected && (
        <>
          <svg viewBox="0 0 6 6" aria-hidden="true" className="size-1.5 fill-red-500 dark:fill-red-400">
            <circle r={3} cx={3} cy={3} />
          </svg>
          Disconnected
        </>
      )}
    </span>
  );
}
