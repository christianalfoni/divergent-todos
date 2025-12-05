import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SmartEditor, { type SmartEditorRef } from "./SmartEditor";
import type { Todo } from "./App";

interface TodoItemProps {
  todo: Todo;
  isCopyMode: boolean;
  onToggleTodoComplete: (todoId: string) => void;
  onUpdateTodo?: (todoId: string, text: string) => void;
  onDeleteTodo?: (todoId: string) => void;
  onOpenTimeBox?: (todo: Todo) => void;
  availableTags?: string[];
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
  isCopyMode,
  onToggleTodoComplete,
  onUpdateTodo,
  onDeleteTodo,
  onOpenTimeBox,
  availableTags = [],
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingHtml, setEditingHtml] = useState<string>(todo.text);
  const [isPressed, setIsPressed] = useState(false);
  const [dragEnabled, setDragEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<SmartEditorRef>(null);
  const originalHtmlRef = useRef<string>(todo.text);
  const lastClickTimeRef = useRef<number>(0);
  const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: todo.id,
      animateLayoutChanges: () => false,
      disabled: !dragEnabled,
    });

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

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Cancel any pending single-click edit activation
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }

    if (!todo.completed) {
      onOpenTimeBox?.(todo);
    }
  };

  const handleMouseDown = () => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    lastClickTimeRef.current = now;

    // If this is a potential double-click (within 300ms), temporarily disable drag
    if (timeSinceLastClick < 300) {
      setDragEnabled(false);
      // Re-enable drag after a short delay
      setTimeout(() => setDragEnabled(true), 100);
      return;
    }

    setDragEnabled(true);
    setIsPressed(true);
  };

  const handleContainerClick = (_e: React.MouseEvent) => {
    // Delay edit mode activation to allow for double-click
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }

    clickTimeoutRef.current = setTimeout(() => {
      // Save original content when entering edit mode
      originalHtmlRef.current = todo.text;
      setEditingHtml(todo.text);
      setIsEditing(true);
      clickTimeoutRef.current = null;
    }, 250);
  };

  if (isEditing) {
    return (
      <div className="mt-2 px-3 py-1" ref={containerRef}>
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`mt-2 relative ${
        isDragging && !isCopyMode ? "opacity-0" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        onClick={handleContainerClick}
        onDoubleClick={handleDoubleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        className={`group/todo relative flex gap-3 text-xs/5 transition-colors px-3 py-1 select-none focus:outline-none cursor-default hover:bg-[var(--color-bg-hover)] ${
          isPressed ? "bg-[var(--color-bg-hover)]" : ""
        } ${todo.completed ? "opacity-60" : ""}`}
      >
        <div className="flex h-5 shrink-0 items-center" onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
          <div className="group/checkbox relative grid size-4 grid-cols-1">
            <input
              id={`todo-${todo.id}`}
              name="todo"
              type="checkbox"
              checked={todo.completed}
              onChange={() => onToggleTodoComplete(todo.id)}
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
              onClick={(e) => {
                e.stopPropagation();
                onToggleTodoComplete(todo.id);
              }}
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
        </div>
      </div>
    </div>
  );
}
