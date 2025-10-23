import { useEffect, useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import SmartEditor from './SmartEditor';

interface ActivityDayPopupProps {
  date: Date;
  todos: Array<{ text: string; url?: string }>;
  position: { x: number; y: number };
  onClose: () => void;
}

export default function ActivityDayPopup({ date, todos, position, onClose }: ActivityDayPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  // Adjust position to stay within viewport bounds
  useEffect(() => {
    if (!popupRef.current) return;

    const popup = popupRef.current;
    const rect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let newX = position.x;
    let newY = position.y;

    // Check right edge
    if (rect.right > viewportWidth) {
      newX = viewportWidth - rect.width / 2 - 16;
    }

    // Check left edge
    if (rect.left < 0) {
      newX = rect.width / 2 + 16;
    }

    // Check bottom edge - if popup goes off bottom, show above the clicked element
    if (rect.bottom > viewportHeight) {
      newY = position.y - rect.height - 16;
    }

    // Check top edge
    if (newY < 0) {
      newY = 16;
    }

    setAdjustedPosition({ x: newX, y: newY });
  }, [position]);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid immediate close from the click that opened it
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formattedDate = `${monthNames[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;

  return (
    <div
      ref={popupRef}
      className="activity-day-popup"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      <div className="activity-day-popup-header">
        <span className="activity-day-popup-date">{formattedDate}</span>
        <button onClick={onClose} className="activity-day-popup-close">
          <span className="sr-only">Close</span>
          <XMarkIcon aria-hidden="true" className="size-5" />
        </button>
      </div>
      <div className="activity-day-popup-content">
        {todos.length === 0 ? (
          <p className="activity-day-popup-empty">No todos completed</p>
        ) : (
          <div className="activity-day-popup-list">
            {todos.map((todo, index) => (
              <div key={index} className="activity-day-popup-item">
                <div className="flex h-5 shrink-0 items-center">
                  <svg
                    fill="none"
                    viewBox="0 0 14 14"
                    className="size-3.5 stroke-[var(--color-accent-primary)]"
                  >
                    <path
                      d="M3 8L6 11L11 3.5"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div className="flex-1 min-w-0 text-xs/5 font-normal text-[var(--color-text-primary)]">
                  <SmartEditor html={todo.text} editing={false} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
