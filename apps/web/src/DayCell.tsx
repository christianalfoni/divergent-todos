import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TodoItem from './TodoItem'
import type { Todo } from './App'

interface DayCellProps {
  date: Date
  isToday: boolean
  isAuthenticated: boolean
  todos: Todo[]
  onAddTodo: (todo: Omit<Todo, 'id'>) => void
  onToggleTodoComplete: (todoId: string) => void
  onUpdateTodo: (todoId: string, text: string) => void
  onDeleteTodo: (todoId: string) => void
  onOpenTimeBox: (todo: Todo) => void
  isBeingDraggedOver: boolean
}

function isValidUrl(text: string): boolean {
  try {
    new URL(text)
    return true
  } catch {
    return false
  }
}

export default function DayCell({ date, isToday, isAuthenticated, todos, onAddTodo, onToggleTodoComplete, onUpdateTodo, onDeleteTodo, onOpenTimeBox, isBeingDraggedOver }: DayCellProps) {
  const [attachedUrl, setAttachedUrl] = useState<string>('')
  const [isAddingTodo, setIsAddingTodo] = useState(false)
  const dayId = date.toISOString().split('T')[0]
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isPastDay = date < today

  const { setNodeRef } = useDroppable({
    id: dayId,
  })

  const handlePaste = async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const pastedText = e.clipboardData.getData('text')
    if (isValidUrl(pastedText)) {
      e.preventDefault()
      setAttachedUrl(pastedText)
    } else {
      // For plain text paste, prevent default and insert as plain text
      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')
      document.execCommand('insertText', false, text)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setAttachedUrl('')
      e.currentTarget.textContent = ''
      setIsAddingTodo(false)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const text = e.currentTarget.textContent?.trim() || ''
      if (text) {
        onAddTodo({
          text,
          url: attachedUrl || undefined,
          completed: false,
          date: date.toISOString().split('T')[0],
        })
        e.currentTarget.textContent = ''
        setAttachedUrl('')
        // Keep isAddingTodo true so user can quickly add another todo
      }
    }
  }

  const handleBlur = () => {
    setAttachedUrl('')
    setIsAddingTodo(false)
  }

  const handleToggleComplete = (todoId: string) => {
    onToggleTodoComplete(todoId)
  }

  const dayNumber = date.getDate()
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col bg-gray-50 dark:bg-gray-900 py-2 group h-full overflow-hidden transition-all"
    >
      <div className="flex justify-between items-start mb-2 px-3">
        <time
          dateTime={date.toISOString().split('T')[0]}
          className={`text-xs font-semibold w-fit shrink-0 ${
            isToday
              ? 'flex size-6 items-center justify-center rounded-full bg-indigo-600 text-white dark:bg-indigo-500'
              : 'text-gray-900 dark:text-white'
          }`}
        >
          {isToday ? dayNumber : `${month} ${dayNumber}`}
        </time>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {dayName}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggleTodoComplete={onToggleTodoComplete}
              onUpdateTodo={onUpdateTodo}
              onDeleteTodo={onDeleteTodo}
              onOpenTimeBox={onOpenTimeBox}
            />
          ))}
        </SortableContext>
        {isAuthenticated && !isAddingTodo && !isPastDay && (
          <button
            onClick={() => setIsAddingTodo(true)}
            className="mt-2 px-3 flex items-center gap-2 text-xs/5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors w-full"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4 h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            <span>Add to-do</span>
          </button>
        )}
        {isAuthenticated && isAddingTodo && !isPastDay && (
          <div className="mt-2 px-3">
            <div className="flex gap-3">
              <div className="flex h-5 shrink-0 items-center">
                <div className="group/checkbox grid size-4 grid-cols-1">
                  <input
                    disabled
                    id={`todo-${date.toISOString()}`}
                    name="todo"
                    type="checkbox"
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
                  aria-label="Add a todo"
                  data-placeholder="Add a todo..."
                  className="block w-full text-xs/5 text-gray-900 dark:text-white focus:outline-none bg-transparent empty:before:content-[attr(data-placeholder)] empty:before:text-gray-500 dark:empty:before:text-gray-400"
                  onPaste={handlePaste}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  ref={(el) => el && el.focus()}
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
                        ? 'text-indigo-600 dark:text-indigo-500'
                        : 'text-gray-300 dark:text-white/10'
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
        )}
      </div>
    </div>
  )
}
