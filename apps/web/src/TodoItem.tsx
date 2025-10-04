import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
  const [attachedUrl, setAttachedUrl] = useState<string>(todo.url || "");
  const containerRef = useRef<HTMLDivElement>(null);
  const lastClickTimeRef = useRef<number>(0);
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
        const textEl = containerRef.current.querySelector(
          "[contenteditable]"
        ) as HTMLDivElement;
        const text = textEl?.textContent?.trim() || "";
        if (text && text !== todo.text) {
          onUpdateTodo?.(todo.id, text);
        }
        setAttachedUrl(todo.url || "");
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isEditing, todo.id, todo.text, todo.url, onUpdateTodo]);

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const pastedText = e.clipboardData.getData("text");
    try {
      new URL(pastedText);
      e.preventDefault();
      setAttachedUrl(pastedText);
    } catch {
      e.preventDefault();
      const text = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      setAttachedUrl(todo.url || "");
      e.currentTarget.textContent = todo.text;
      setIsEditing(false);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const text = e.currentTarget.textContent?.trim() || "";
      if (text) {
        onUpdateTodo?.(todo.id, text);
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
                className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 indeterminate:border-indigo-600 indeterminate:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-50 disabled:checked:bg-gray-50 forced-colors:appearance-auto dark:border-white/10 dark:bg-white/5 dark:checked:border-indigo-500 dark:checked:bg-indigo-500 dark:disabled:border-white/5 dark:disabled:bg-white/5"
              />
              <svg
                fill="none"
                viewBox="0 0 14 14"
                className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled/checkbox:stroke-gray-500 dark:group-has-disabled/checkbox:stroke-gray-400"
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
          <div className="flex-1 min-w-0">
            <div
              contentEditable
              role="textbox"
              aria-label="Edit todo"
              suppressContentEditableWarning
              className="block w-full text-xs/5 font-semibold text-gray-900 dark:text-white focus:outline-none bg-transparent"
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              ref={(el) => {
                if (el) {
                  el.textContent = todo.text;
                  el.focus();
                  // Move cursor to end
                  const range = document.createRange();
                  const sel = window.getSelection();
                  range.selectNodeContents(el);
                  range.collapse(false);
                  sel?.removeAllRanges();
                  sel?.addRange(range);
                }
              }}
            />
          </div>
          <div className="flex h-5 shrink-0 items-center">
            <div className="relative group/url">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className={`w-4 h-4 ${
                  attachedUrl
                    ? "text-indigo-600 dark:text-indigo-500"
                    : "text-gray-300 dark:text-white/10"
                }`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                />
              </svg>
              {attachedUrl && (
                <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/url:opacity-100 pointer-events-none z-10 border border-gray-300 dark:border-white/10">
                  {attachedUrl}
                </div>
              )}
            </div>
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
        isDragging ? "opacity-50 z-50 bg-white dark:bg-gray-900" : ""
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        onDoubleClick={handleDoubleClick}
        className="group/todo relative flex gap-3 text-xs/5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 px-3 py-1 cursor-grab active:cursor-grabbing"
      >
        <div className="flex h-5 shrink-0 items-center" onDoubleClick={(e) => e.stopPropagation()}>
          <div className="group/checkbox grid size-4 grid-cols-1">
            <input
              id={`todo-${todo.id}`}
              name="todo"
              type="checkbox"
              checked={todo.completed}
              onChange={() => onToggleTodoComplete(todo.id)}
              className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 indeterminate:border-indigo-600 indeterminate:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-50 disabled:checked:bg-gray-50 forced-colors:appearance-auto dark:border-white/10 dark:bg-white/5 dark:checked:border-indigo-500 dark:checked:bg-indigo-500 dark:disabled:border-white/5 dark:disabled:bg-white/5"
            />
            <svg
              fill="none"
              viewBox="0 0 14 14"
              className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled/checkbox:stroke-gray-500 dark:group-has-disabled/checkbox:stroke-gray-400"
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
        <div className="flex-1 min-w-0">
          <p
            className={`font-semibold select-none ${
              todo.completed
                ? "line-through text-gray-500 dark:text-gray-400"
                : "text-indigo-600 dark:text-indigo-400"
            }`}
          >
            {todo.text}
          </p>
        </div>
        {todo.url && (
          <div className="flex h-5 shrink-0 items-center">
            <div className="relative group/url">
              <button
                onClick={() => window.open(todo.url, "_blank")}
                className="hover:opacity-80 transition-opacity"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={`w-4 h-4 ${
                    todo.completed
                      ? "text-gray-500 dark:text-gray-400"
                      : "text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                  }`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                  />
                </svg>
              </button>
              <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-50 text-gray-900 dark:bg-gray-800 dark:text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/url:opacity-100 pointer-events-none z-10 border border-gray-300 dark:border-white/10">
                {todo.url}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setIsEditing(true)
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="flex h-5 shrink-0 items-center opacity-0 group-hover/todo:opacity-100 transition-opacity"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-4 h-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
            />
          </svg>
        </button>
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
            className="w-4 h-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
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
