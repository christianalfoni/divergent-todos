import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SmartLinksEditor from "./SmartLinksEditor";
import type { Todo } from "./App";

interface TodoItemProps {
  todo: Todo;
  onToggleTodoComplete: (todoId: string) => void;
  onUpdateTodo?: (todoId: string, text: string) => void;
  onDeleteTodo?: (todoId: string) => void;
  onOpenTimeBox?: (todo: Todo) => void;
}

export default function TodoItem({
  todo,
  onToggleTodoComplete,
  onUpdateTodo,
  onDeleteTodo,
  onOpenTimeBox,
}: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingHtml, setEditingHtml] = useState<string>(todo.text);
  const [isPressed, setIsPressed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useSortable({
      id: todo.id,
      animateLayoutChanges: () => false,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isEditing &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        if (editingHtml !== todo.text) {
          onUpdateTodo?.(todo.id, editingHtml);
        }
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing, todo.id, todo.text, editingHtml, onUpdateTodo]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      setEditingHtml(todo.text);
      setIsEditing(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (editingHtml.trim()) {
        onUpdateTodo?.(todo.id, editingHtml);
        setIsEditing(false);
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!todo.completed) {
      onOpenTimeBox?.(todo);
    }
  };

  const handleTextClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
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
          <div className="flex-1 min-w-0 text-xs/5 font-semibold text-[var(--color-text-primary)]">
            <SmartLinksEditor
              html={editingHtml}
              editing={true}
              onChange={setEditingHtml}
              autoFocus={true}
              onKeyDown={handleKeyDown}
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
        isDragging ? "z-50" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        onDoubleClick={handleDoubleClick}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
        className={`group/todo relative flex gap-3 text-xs/5 transition-colors px-3 py-1 select-none focus:outline-none ${
          isDragging ? "bg-[var(--color-bg-active)]" :
          isPressed ? "bg-[var(--color-bg-active)]" :
          "hover:bg-[var(--color-bg-hover)]"
        }`}
      >
        <div className="flex h-5 shrink-0 items-center" onDoubleClick={(e) => e.stopPropagation()}>
          <div className="group/checkbox grid size-4 grid-cols-1">
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
          </div>
        </div>
        <div
          onClick={handleTextClick}
          className={`flex-1 min-w-0 text-xs/5 font-semibold select-none ${
            todo.completed
              ? "line-through text-[var(--color-text-secondary)]"
              : "text-[var(--color-accent-text)]"
          }`}
        >
          <SmartLinksEditor html={todo.text} editing={false} />
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteTodo?.(todo.id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex h-5 shrink-0 items-center opacity-0 group-hover/todo:opacity-100 transition-opacity"
          aria-label="Delete todo"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
