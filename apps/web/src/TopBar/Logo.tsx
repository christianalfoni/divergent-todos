export default function Logo() {
  return (
    <div className="flex shrink-0 items-center gap-3">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-auto"
        aria-label="Divergent Todos"
      >
        {/* Upper left corner */}
        <path
          d="M 8 4 L 4 4 L 4 8"
          stroke="var(--color-accent-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Lower right corner */}
        <path
          d="M 24 28 L 28 28 L 28 24"
          stroke="var(--color-accent-primary)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Checkmark - extended to edges */}
        <path
          d="M6 16L12 22L26 8"
          stroke="var(--color-accent-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="text-lg font-light text-[var(--color-text-primary)] font-(logo:--font-logo) tracking-widest">
        Divergent Todos
      </span>
    </div>
  );
}
