import { useState, useRef, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TodoItem from './TodoItem'
import TodosLoadingPlaceholder from './TodosLoadingPlaceholder'
import SmartEditor, { type SmartEditorRef } from './SmartEditor'
import { useOnboarding } from './contexts/OnboardingContext'
import type { Todo } from './App'

interface DayCellProps {
  date: Date
  isToday: boolean
  isNextMonday: boolean
  isAuthenticated: boolean
  isLoading: boolean
  todos: Todo[]
  onAddTodo: (todo: Omit<Todo, 'id' | 'position'> & { position?: string }) => void
  onToggleTodoComplete: (todoId: string) => void
  onUpdateTodo: (todoId: string, text: string) => void
  onDeleteTodo: (todoId: string) => void
  onOpenTimeBox: (todo: Todo) => void
  onMoveTodosFromDay: (date: Date) => void
}

export default function DayCell({ date, isToday, isAuthenticated, isLoading, todos, onAddTodo, onToggleTodoComplete, onUpdateTodo, onDeleteTodo, onOpenTimeBox, onMoveTodosFromDay }: DayCellProps) {
  const [newTodoHtml, setNewTodoHtml] = useState<string>('')
  const [isAddingTodo, setIsAddingTodo] = useState(false)
  const editorRef = useRef<SmartEditorRef>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { isOnboarding } = useOnboarding()
  const dayId = date.toISOString().split('T')[0]
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const isPastDay = date < today

  // During onboarding, allow adding todos on any day
  const canAddTodo = isOnboarding || !isPastDay

  // Extract all tags from current todos for autocomplete
  const availableTags = todos.flatMap(todo => {
    const temp = document.createElement('div')
    temp.innerHTML = todo.text
    const tagElements = temp.querySelectorAll('[data-tag]')
    return Array.from(tagElements).map(el => (el as HTMLElement).dataset.tag || '')
  }).filter(Boolean)

  const { setNodeRef } = useDroppable({
    id: dayId,
  })

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      editorRef.current?.clear()
      setNewTodoHtml('')
      setIsAddingTodo(false)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (newTodoHtml.trim()) {
        onAddTodo({
          text: newTodoHtml,
          url: undefined, // URL is now embedded in HTML
          completed: false,
          date: date.toISOString().split('T')[0],
        })
        editorRef.current?.clear()
        setNewTodoHtml('')
        // Keep isAddingTodo true so user can quickly add another todo
      }
    }
  }

  const handleBlur = () => {
    editorRef.current?.clear()
    setNewTodoHtml('')
    setIsAddingTodo(false)
  }

  const handleAddTodoClick = () => {
    setIsAddingTodo(true)
    // Scroll to bottom after state update
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
      }
    }, 0)
  }

  // Keep scroll at bottom while editing new todo
  useEffect(() => {
    if (isAddingTodo && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [isAddingTodo, newTodoHtml])

  const dayNumber = date.getDate()
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })

  // Check if day has uncompleted todos
  const hasUncompletedTodos = todos.some(todo => !todo.completed)

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col bg-[var(--color-bg-secondary)] py-2 group h-full overflow-hidden transition-all"
    >
      <div className="flex justify-between items-start mb-2 px-3">
        <time
          dateTime={date.toISOString().split('T')[0]}
          className={`text-xs font-semibold w-fit shrink-0 ${
            isToday
              ? 'text-[var(--color-accent-primary)]'
              : 'text-[var(--color-text-primary)]'
          }`}
        >
          {`${month} ${dayNumber}`}
        </time>
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          {dayName}
        </span>
      </div>
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto min-h-0 pb-16">
        {isLoading ? (
          <TodosLoadingPlaceholder />
        ) : (
          <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
            {todos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggleTodoComplete={onToggleTodoComplete}
                onUpdateTodo={onUpdateTodo}
                onDeleteTodo={onDeleteTodo}
                onOpenTimeBox={onOpenTimeBox}
                availableTags={availableTags}
              />
            ))}
          </SortableContext>
        )}
        {isAuthenticated && !isAddingTodo && !isLoading && (
          <>
            {canAddTodo ? (
              <button
                onClick={handleAddTodoClick}
                className="mt-2 px-3 flex items-center gap-3 text-xs/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors w-full"
              >
                <div className="flex h-5 w-4 shrink-0 items-center justify-center">
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
                </div>
                <span>Add to-do</span>
              </button>
            ) : hasUncompletedTodos ? (
              <button
                onClick={() => onMoveTodosFromDay(date)}
                className="mt-2 px-3 flex items-center gap-3 text-xs/5 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors w-full"
              >
                <div className="flex h-5 w-4 shrink-0 items-center justify-center">
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
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </div>
                <span>Move uncompleted to-dos</span>
              </button>
            ) : null}
          </>
        )}
        {isAuthenticated && isAddingTodo && canAddTodo && (
          <div className="mt-2 px-3">
            <div className="flex gap-3">
              <div className="flex h-5 shrink-0 items-center">
                <div className="group/checkbox grid size-4 grid-cols-1">
                  <input
                    disabled
                    id={`todo-${date.toISOString()}`}
                    name="todo"
                    type="checkbox"
                    className="col-start-1 row-start-1 appearance-none rounded-sm border border-[var(--color-border-secondary)] bg-[var(--color-bg-primary)] checked:border-[var(--color-accent-primary)] checked:bg-[var(--color-accent-primary)] indeterminate:border-[var(--color-accent-primary)] indeterminate:bg-[var(--color-accent-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:border-[var(--color-border-secondary)] disabled:bg-[var(--color-bg-secondary)] disabled:checked:bg-[var(--color-bg-secondary)] forced-colors:appearance-auto"
                  />
                  <svg
                    fill="none"
                    viewBox="0 0 14 14"
                    className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-[var(--color-text-inverse)] group-has-disabled/checkbox:stroke-[var(--color-text-secondary)]"
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
              <div className="flex-1 min-w-0 text-xs/5 text-[var(--color-text-primary)] empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--color-text-secondary)]">
                <SmartEditor
                  ref={editorRef}
                  html={newTodoHtml}
                  editing={true}
                  onChange={setNewTodoHtml}
                  placeholder="Description..."
                  autoFocus={true}
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  availableTags={availableTags}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
