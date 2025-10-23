import { useEffect, useState } from 'react';
import { getActivityColor } from './utils/activity';

interface MondayMotivationDialogProps {
  summary: string;
  week: number;
  year: number;
  todoCount: number;
  tags: string[];
  dailyCounts: [number, number, number, number, number]; // [Mon, Tue, Wed, Thu, Fri]
  onClose: () => void;
}

export default function MondayMotivationDialog({
  summary,
  week,
  todoCount,
  tags,
  dailyCounts,
  onClose,
}: MondayMotivationDialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200); // Wait for fade-out animation
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div
      className={`monday-dialog-overlay ${isVisible ? 'visible' : ''}`}
      onClick={handleClose}
    >
      <div
        className={`monday-dialog ${isVisible ? 'visible' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="monday-dialog-header">
          <h2>
            <svg className="monday-dialog-icon" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
            </svg>
            Your Week {week} Recap
          </h2>
          <button
            className="monday-dialog-close"
            onClick={handleClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="monday-dialog-content">
          {/* Stats section */}
          <div className="monday-dialog-stats">
            <div className="monday-dialog-stat">
              <span className="monday-dialog-stat-value">{todoCount}</span>
              <span className="monday-dialog-stat-label">
                {todoCount === 1 ? 'todo completed' : 'todos completed'}
              </span>
            </div>

            {/* Daily activity heatmap */}
            <div className="monday-dialog-daily-activity">
              <div className="monday-dialog-day-labels">
                {['M', 'T', 'W', 'T', 'F'].map((label, index) => (
                  <div key={index} className="monday-dialog-day-label">
                    {label}
                  </div>
                ))}
              </div>
              <div className="monday-dialog-day-squares">
                {dailyCounts.map((count, index) => (
                  <div
                    key={index}
                    className={`monday-dialog-day-square ${getActivityColor(count)}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Tags list */}
          {tags.length > 0 && (
            <div className="monday-dialog-tags">
              {tags.map((tag) => (
                <span key={tag} className="monday-dialog-tag">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* AI Summary as testimonial */}
          <figure className="monday-dialog-testimonial">
            <blockquote className="monday-dialog-blockquote">
              <p>"{summary}"</p>
            </blockquote>
          </figure>
        </div>
      </div>
    </div>
  );
}
