interface OldTodosButtonProps {
  count: number;
  onMoveOldTodos: () => void;
}

export default function OldTodosButton({ count, onMoveOldTodos }: OldTodosButtonProps) {
  if (count === 0) return null;

  return (
    <button
      onClick={onMoveOldTodos}
      className="group flex items-center gap-x-3 rounded-md p-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-menu-hover)] hover:text-[var(--color-accent-text-hover)]"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="size-6 shrink-0 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-accent-text-hover)]"
      >
        <path
          d="M10 3V17M10 17L14 13M10 17L6 13"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Move {count} uncompleted todo{count === 1 ? "" : "s"}
    </button>
  );
}
