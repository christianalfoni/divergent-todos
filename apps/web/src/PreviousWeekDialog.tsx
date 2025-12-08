import { useEffect, useState } from 'react';
import { getActivityColor } from './utils/activity';
import { getTagColor } from './SmartEditor';

interface WeekNote {
  title: string;
  summary: string;
  tags: string[];
}

interface PreviousWeekDialogProps {
  notes: WeekNote[];
  week: number;
  year: number;
  todoCount: number;
  dailyCounts: [number, number, number, number, number]; // [Mon, Tue, Wed, Thu, Fri]
  onClose: () => void;
}

export default function PreviousWeekDialog({
  notes,
  week,
  todoCount,
  dailyCounts,
  onClose,
}: PreviousWeekDialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`previous-week-dialog-overlay ${isVisible ? 'visible' : ''}`}
      onClick={onClose}
    >
      <div
        className={`previous-week-dialog ${isVisible ? 'visible' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="previous-week-dialog-header">
          <h2>
            <svg className="previous-week-dialog-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
            Your Week {week} Recap
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="bg-transparent border-0 text-2xl text-[var(--color-text-secondary)] p-0 w-8 h-8 flex items-center justify-center rounded-md transition-all duration-150 hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="previous-week-dialog-content">
          {/* Stats section */}
          <div className="previous-week-dialog-stats">
            <div className="previous-week-dialog-stat">
              <span className="previous-week-dialog-stat-value">{todoCount}</span>
              <span className="previous-week-dialog-stat-label">
                {todoCount === 1 ? 'focus completed' : 'focus completed'}
              </span>
            </div>

            {/* Daily activity heatmap */}
            <div className="previous-week-dialog-daily-activity">
              <div className="previous-week-dialog-day-labels">
                {['M', 'T', 'W', 'T', 'F'].map((label, index) => (
                  <div key={index} className="previous-week-dialog-day-label">
                    {label}
                  </div>
                ))}
              </div>
              <div className="previous-week-dialog-day-squares">
                {dailyCounts.map((count, index) => (
                  <div
                    key={index}
                    className={`previous-week-dialog-day-square ${getActivityColor(count)}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Week Reflection Notes Section */}
          <div className="px-4">
            {/* Divider with "Week Reflection" label */}
            <div className="flex items-center mb-4">
              <div aria-hidden="true" className="w-full border-t border-gray-300 dark:border-white/15" />
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-sm font-semibold text-[var(--color-text-secondary)] whitespace-nowrap dark:bg-[var(--color-bg-primary)]">
                  Week Reflection Notes
                </span>
              </div>
              <div aria-hidden="true" className="w-full border-t border-gray-300 dark:border-white/15" />
            </div>

            {/* Notes List */}
            <ul role="list" className="divide-y divide-gray-100 dark:divide-white/5">
              {notes.map((note, index) => (
                <li key={index} className="flex items-center gap-x-6 py-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-x-3">
                      <p className="text-sm/6 font-semibold text-gray-900 dark:text-white">{note.title}</p>
                      {note.tags.map((tag) => {
                        const color = getTagColor(tag);
                        return (
                          <span key={tag} className={`tag-pill tag-pill-${color} text-xs`}>
                            {tag}
                          </span>
                        );
                      })}
                    </div>
                    <p className="mt-1 text-sm/5 text-gray-500 dark:text-gray-400">
                      {note.summary}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
