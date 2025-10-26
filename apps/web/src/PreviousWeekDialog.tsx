import { useEffect, useState, useRef } from 'react';
import { getActivityColor } from './utils/activity';
import { getTagColor } from './SmartEditor';

interface PreviousWeekDialogProps {
  summary: string;
  week: number;
  year: number;
  todoCount: number;
  tags: string[];
  dailyCounts: [number, number, number, number, number]; // [Mon, Tue, Wed, Thu, Fri]
  onStartWeek: (editedSummary: string) => void;
}

export default function PreviousWeekDialog({
  summary,
  week,
  todoCount,
  tags,
  dailyCounts,
  onStartWeek,
}: PreviousWeekDialogProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [editedSummary, setEditedSummary] = useState(summary);
  const [isEditing, setIsEditing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // Initialize content on mount
  useEffect(() => {
    if (contentRef.current && contentRef.current.textContent === '') {
      contentRef.current.textContent = editedSummary;
    }
  }, [editedSummary]);

  const handleContentClick = () => {
    if (!isEditing) {
      setIsEditing(true);
      // Focus and move cursor to end
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.focus();
          // Move cursor to end only when entering edit mode
          const range = document.createRange();
          const selection = window.getSelection();
          range.selectNodeContents(contentRef.current);
          range.collapse(false);
          selection?.removeAllRanges();
          selection?.addRange(range);
        }
      }, 0);
    }
  };

  const handleContentChange = () => {
    if (contentRef.current) {
      setEditedSummary(contentRef.current.textContent || '');
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  return (
    <div className={`previous-week-dialog-overlay ${isVisible ? 'visible' : ''}`}>
      <div className={`previous-week-dialog ${isVisible ? 'visible' : ''}`}>
        <div className="previous-week-dialog-header">
          <h2>
            <svg className="previous-week-dialog-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
            Your Week {week} Recap
          </h2>
        </div>
        <div className="previous-week-dialog-content">
          {/* Stats section */}
          <div className="previous-week-dialog-stats">
            <div className="previous-week-dialog-stat">
              <span className="previous-week-dialog-stat-value">{todoCount}</span>
              <span className="previous-week-dialog-stat-label">
                {todoCount === 1 ? 'todo completed' : 'todos completed'}
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

          {/* Week Summary Section */}
          <div className="px-4">
            {/* Divider with "Week Summary" label */}
            <div className="flex items-center mb-4">
              <div aria-hidden="true" className="w-full border-t border-gray-300 dark:border-white/15" />
              <div className="relative flex justify-center">
                <span className="bg-white px-4 text-sm font-semibold text-[var(--color-text-secondary)] whitespace-nowrap dark:bg-[var(--color-bg-primary)]">
                  Week Summary
                </span>
              </div>
              <div aria-hidden="true" className="w-full border-t border-gray-300 dark:border-white/15" />
            </div>

            {/* Tags list with colors */}
            {tags.length > 0 && (
              <div className="previous-week-dialog-tags">
                {tags.map((tag) => {
                  const color = getTagColor(tag);
                  return (
                    <span key={tag} className={`tag-pill tag-pill-${color}`}>
                      {tag}
                    </span>
                  );
                })}
              </div>
            )}

            {/* Editable AI Summary - Click to edit */}
            <div
              ref={contentRef}
              contentEditable={isEditing}
              suppressContentEditableWarning
              onClick={handleContentClick}
              onInput={handleContentChange}
              onBlur={handleBlur}
              className={`py-3 text-base text-[var(--color-text-primary)] leading-relaxed rounded-lg transition-all ${
                isEditing
                  ? 'cursor-text'
                  : 'cursor-default'
              }`}
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                outline: isEditing ? '2px solid var(--color-accent-primary)' : 'none',
                outlineOffset: '-2px'
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[var(--color-bg-dialog-footer)] px-6 py-6 flex justify-end">
          <button
            type="button"
            onClick={() => onStartWeek(editedSummary)}
            className="inline-flex justify-center rounded-md bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)]"
          >
            Save week summary
          </button>
        </div>
      </div>
    </div>
  );
}
