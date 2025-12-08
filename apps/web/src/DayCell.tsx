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
  allTodos: Todo[] // All todos across all days for tag autocomplete
  onAddTodo: (todo: Omit<Todo, 'id' | 'position'> & { position?: string }) => void
  onToggleTodoComplete: (todoId: string) => void
  onUpdateTodo: (todoId: string, text: string) => void
  onDeleteTodo: (todoId: string) => void
  onOpenTimeBox: (todo: Todo) => void
  onMoveIncompleteTodosToToday: () => void
  hasOldUncompletedTodos: boolean
}

export default function DayCell({ date, isToday, isNextMonday, isAuthenticated, isLoading, todos, allTodos, onAddTodo, onToggleTodoComplete, onUpdateTodo, onDeleteTodo, onOpenTimeBox, onMoveIncompleteTodosToToday, hasOldUncompletedTodos }: DayCellProps) {
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

  // Extract all tags from all todos (across all days) for autocomplete
  const availableTags = allTodos.flatMap(todo => {
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
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // Get the current HTML directly from the editor to include any just-converted pills/chips
      const currentHtml = editorRef.current?.getHtml() || ''
      // Check if there's actual text content (not just HTML tags or whitespace)
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = currentHtml
      const textContent = tempDiv.textContent || tempDiv.innerText || ''
      if (textContent.trim()) {
        onAddTodo({
          text: currentHtml,
          url: undefined, // URL is now embedded in HTML
          completed: false,
          date: date.toISOString().split('T')[0],
        })
        editorRef.current?.clear()
        setNewTodoHtml('')
        setIsAddingTodo(false)
      }
    }
  }

  const handleBlur = () => {
    // Convert any pending tags/links before getting the HTML (same as Enter does)
    editorRef.current?.convertPendingTags()

    // Get the current HTML from the editor (now includes any just-converted pills/chips)
    const currentHtml = editorRef.current?.getHtml() || ''
    // Check if there's actual text content (not just HTML tags or whitespace)
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = currentHtml
    const textContent = tempDiv.textContent || tempDiv.innerText || ''

    if (textContent.trim()) {
      // Save the todo if there's content
      onAddTodo({
        text: currentHtml,
        url: undefined,
        completed: false,
        date: date.toISOString().split('T')[0],
      })
    }

    // Clear the editor and close the input
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
      {(isToday || isNextMonday) && isAuthenticated && hasOldUncompletedTodos && (
        <button
          onClick={onMoveIncompleteTodosToToday}
          className="mx-3 mb-2 flex items-center gap-3 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          style={{ fontSize: 'var(--todo-text-size)', lineHeight: '1.25rem' }}
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
                d="M3 9h11m0 0v11m-3-3l3 3m0 0l3-3"
              />
            </svg>
          </div>
          <span>Move incomplete focus</span>
        </button>
      )}
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
        {isAuthenticated && !isAddingTodo && !isLoading && canAddTodo && (
          <button
            onClick={handleAddTodoClick}
            className="mt-2 px-3 flex items-center gap-3 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors w-full"
            style={{ fontSize: 'var(--todo-text-size)', lineHeight: '1.25rem' }}
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
            <span>Add focus</span>
          </button>
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
              <div
                className="flex-1 min-w-0 text-[var(--color-text-primary)] empty:before:content-[attr(data-placeholder)] empty:before:text-[var(--color-text-secondary)]"
                style={{ fontSize: 'var(--todo-text-size)', lineHeight: '1.25rem' }}
              >
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
