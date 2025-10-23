interface YearNavigationProps {
  year: number;
  onYearChange: (year: number) => void;
}

export default function YearNavigation({ year, onYearChange }: YearNavigationProps) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 pointer-events-none">
      <button
        onClick={() => onYearChange(year - 1)}
        className="p-1 hover:bg-[var(--color-bg-menu-hover)] rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors pointer-events-auto"
        aria-label="Previous year"
      >
        ←
      </button>
      <span className="text-lg font-semibold text-[var(--color-text-primary)] min-w-[80px] text-center pointer-events-auto">
        {year}
      </span>
      <button
        onClick={() => onYearChange(year + 1)}
        disabled={year >= currentYear}
        className="p-1 hover:bg-[var(--color-bg-menu-hover)] rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed pointer-events-auto"
        aria-label="Next year"
      >
        →
      </button>
    </div>
  );
}
