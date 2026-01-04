import { useState, useRef, useEffect, useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TrashIcon, PencilIcon, ClockIcon, LightBulbIcon } from "@heroicons/react/20/solid";
import SmartEditor, { type SmartEditorRef } from "./SmartEditor";
import ContextMenu from "./ContextMenu";
import type { Todo } from "./App";
import { useCurrentTime } from "./contexts/TimeContext";

interface TodoItemProps {
  todo: Todo;
  onToggleTodoComplete: (todoId: string) => void;
  onCopyTodo?: (todoId: string, newDate: string) => void;
  onUpdateTodo?: (todoId: string, text: string) => void;
  onDeleteTodo?: (todoId: string) => void;
  onOpenFocus?: (todo: Todo) => void;
  onOpenBreakDown?: (todo: Todo) => void;
  availableTags?: string[];
  isSelected?: boolean;
  onSelect?: () => void;
  shouldEnterEditMode?: boolean;
  onEditModeEntered?: () => void;
  todoRef?: (el: HTMLDivElement | null) => void;
}

// Helper function to check if HTML content is empty
function isHtmlEmpty(html: string): boolean {
  // Create a temporary div to parse the HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;
  // Get the text content and check if it's empty after trimming
  return temp.textContent?.trim() === '';
}

export default function TodoItem({
  todo,
  onToggleTodoComplete,
  onCopyTodo,
  onUpdateTodo,
  onDeleteTodo,
  onOpenFocus,
  onOpenBreakDown,
  availableTags = [],
  isSelected = false,
  onSelect,
  shouldEnterEditMode = false,
  onEditModeEntered,
  todoRef,
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingHtml, setEditingHtml] = useState<string>(todo.text);
  const [isPressed, setIsPressed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<SmartEditorRef>(null);
  const originalHtmlRef = useRef<string>(todo.text);
  const currentTime = useCurrentTime();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: todo.id,
      animateLayoutChanges: () => false,
    });

  // Calculate session statistics
  const sessionStats = useMemo(() => {
    if (!todo.sessions || todo.sessions.length === 0) return null;

    const focused = todo.sessions
      .filter((s) => s.deepFocus)
      .reduce((sum, s) => sum + s.minutes, 0);

    const distracted = todo.sessions
      .filter((s) => !s.deepFocus)
      .reduce((sum, s) => sum + s.minutes, 0);

    return { focused, distracted };
  }, [todo.sessions]);

  // Format relative time (depends on currentTime from context)
  const relativeTime = useMemo(() => {
    if (!todo.updatedAt) return "";

    const diffMs = currentTime.getTime() - todo.updatedAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    // Show date for older items
    return todo.updatedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }, [todo.updatedAt, currentTime]);

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only handle actual mouse clicks, not programmatic events or window focus changes
      if (
        isEditing &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        event.target instanceof Node // Ensure it's a real DOM event
      ) {
        if (!isHtmlEmpty(editingHtml)) {
          if (editingHtml !== todo.text) {
            onUpdateTodo?.(todo.id, editingHtml);
          }
        } else {
          // Delete todo if content is empty
          onDeleteTodo?.(todo.id);
        }
        setIsEditing(false);
      }
    };

    if (isEditing) {
      // Use capture phase to ensure we catch the event before any stopPropagation
      document.addEventListener("mousedown", handleClickOutside, true);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [isEditing, todo.id, todo.text, editingHtml, onUpdateTodo, onDeleteTodo]);

  useEffect(() => {
    if (shouldEnterEditMode && !isEditing) {
      originalHtmlRef.current = todo.text;
      setEditingHtml(todo.text);
      setIsEditing(true);
      onEditModeEntered?.();
    }
  }, [shouldEnterEditMode, isEditing, todo.text, onEditModeEntered]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      // Revert to original content
      editorRef.current?.setHtml(originalHtmlRef.current);
      setEditingHtml(originalHtmlRef.current);
      setIsEditing(false);
    } else if (e.key === "Enter" && !e.shiftKey) {
      // Only save on Enter without Shift (SHIFT + ENTER allows newlines)
      e.preventDefault();
      // Get the latest HTML from the editor (includes any tag conversions that just happened)
      const currentHtml = editorRef.current?.getHtml() || editingHtml;
      if (!isHtmlEmpty(currentHtml)) {
        onUpdateTodo?.(todo.id, currentHtml);
        setIsEditing(false);
      } else {
        // Delete todo if content is empty
        onDeleteTodo?.(todo.id);
      }
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    // Check for CMD/ALT + SHIFT + Click (break down shortcut)
    const isBreakDownShortcut = (e.metaKey || e.altKey) && e.shiftKey;

    if (isBreakDownShortcut && !todo.completed && onOpenBreakDown) {
      e.preventDefault();
      e.stopPropagation();
      onOpenBreakDown(todo);
      return;
    }

    // Select the todo on click
    onSelect?.();
  };

  const handleContainerDoubleClick = (e: React.MouseEvent) => {
    // Double-click opens Focus dialog for incomplete todos
    if (!todo.completed && onOpenFocus) {
      e.preventDefault();
      e.stopPropagation();
      onOpenFocus(todo);
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleTodoComplete(todo.id);
  };

  if (isEditing) {
    return (
      <div className="px-3 py-2" ref={containerRef}>
        <div className="flex gap-3">
          <div className="flex h-5 shrink-0 items-center">
            <div className="group/checkbox grid size-4 grid-cols-1">
              <input
                disabled
                type="checkbox"
                checked={todo.completed}
                readOnly
                className="col-start-1 row-start-1 appearance-none rounded-sm border border-[var(--color-border-secondary)] bg-[var(--color-bg-primary)] checked:border-[var(--color-accent-primary)] checked:bg-[var(--color-accent-primary)] indeterminate:border-[var(--color-accent-primary)] indeterminate:bg-[var(--color-accent-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:border-[var(--color-border-secondary)] disabled:bg-[var(--color-bg-secondary)] disabled:checked:bg-[var(--color-bg-secondary)] forced-colors:appearance-auto"
              />
              <svg
                fill="none"
                viewBox="0 0 14 14"
                className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled/checkbox:stroke-[var(--color-text-secondary)]"
              >
                <path
                  d="M3 8L6 11L11 3.5"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-0 group-has-checked/checkbox:opacity-100"
                />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0 text-xs/5 text-[var(--color-text-primary)]">
            <SmartEditor
              ref={editorRef}
              html={editingHtml}
              editing={true}
              onChange={setEditingHtml}
              autoFocus={true}
              onKeyDown={handleKeyDown}
              availableTags={availableTags}
            />
          </div>
        </div>
      </div>
    );
  }

  const contextMenuItems = [
    {
      label: 'Focus',
      icon: <ClockIcon className="size-4" />,
      onClick: () => {
        if (!todo.completed) {
          onOpenFocus?.(todo);
        }
      },
      shortcut: 'F',
    },
    {
      label: 'Edit',
      icon: <PencilIcon className="size-4" />,
      onClick: () => {
        originalHtmlRef.current = todo.text;
        setEditingHtml(todo.text);
        setIsEditing(true);
      },
      shortcut: 'E',
    },
    {
      label: 'Delete',
      icon: <TrashIcon className="size-4" />,
      onClick: () => onDeleteTodo?.(todo.id),
      danger: true,
      shortcut: 'DEL',
    },
  ];

  return (
    <ContextMenu items={contextMenuItems}>
      {(isContextMenuOpen) => (
        <div
          ref={(el) => {
            setNodeRef(el);
            todoRef?.(el);
          }}
          style={style}
          className={`relative ${isDragging ? "opacity-0" : ""}`}
          data-todo-item
        >
          <div
            {...attributes}
            {...listeners}
            onClick={handleContainerClick}
            onDoubleClick={handleContainerDoubleClick}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            className={`group/todo relative flex gap-3 text-xs/5 px-3 py-2 select-none focus:outline-none cursor-default hover:bg-[var(--color-bg-hover)] ${
              isPressed || isContextMenuOpen || isSelected ? "bg-[var(--color-bg-hover)]" : ""
            } ${
              isSelected ? "[box-shadow:inset_0_0_0_1px_var(--color-accent-primary)]" : ""
            } ${todo.completed ? "opacity-60" : ""}`}
          >
          <div className="flex h-5 shrink-0 items-center" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
            <div className="group/checkbox relative grid size-4 grid-cols-1">
              <input
                id={`todo-${todo.id}`}
                name="todo"
                type="checkbox"
                checked={todo.completed}
                onChange={(e) => handleCheckboxClick(e as unknown as React.MouseEvent)}
                className="col-start-1 row-start-1 appearance-none rounded-sm border border-[var(--color-border-secondary)] bg-[var(--color-bg-primary)] checked:border-[var(--color-accent-primary)] checked:bg-[var(--color-accent-primary)] indeterminate:border-[var(--color-accent-primary)] indeterminate:bg-[var(--color-accent-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:border-[var(--color-border-secondary)] disabled:bg-[var(--color-bg-secondary)] disabled:checked:bg-[var(--color-bg-secondary)] forced-colors:appearance-auto"
              />
              <svg
                fill="none"
                viewBox="0 0 14 14"
                className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled/checkbox:stroke-[var(--color-text-secondary)]"
              >
                <path
                  d="M3 8L6 11L11 3.5"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-0 group-has-checked/checkbox:opacity-100"
                />
              </svg>
              {/* Larger click target overlay */}
              <div
                className="absolute inset-0 -m-2 cursor-default"
                onClick={handleCheckboxClick}
                aria-hidden="true"
              />
            </div>
          </div>
          <div
            className={`flex-1 min-w-0 text-xs/5 select-none ${
              todo.completed
                ? "line-through text-[var(--color-text-secondary)]"
                : "text-[var(--color-text-primary)]"
            }`}
          >
            <SmartEditor html={todo.text} editing={false} />
            {/* Footer: updated time on left, session stats on right */}
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-gray-400">
                {relativeTime}
              </span>
              {sessionStats && (
                <div className="flex gap-2">
                  {sessionStats.focused > 0 && (
                    <span className="flex items-center gap-1 text-yellow-500 font-medium">
                      <LightBulbIcon className="size-3" />
                      {sessionStats.focused}min
                    </span>
                  )}
                  {sessionStats.distracted > 0 && (
                    <span className="flex items-center gap-1 text-gray-400">
                      <ClockIcon className="size-3" />
                      {sessionStats.distracted}min
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </ContextMenu>
  );
}
