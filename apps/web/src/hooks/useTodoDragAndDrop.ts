import { useState, useCallback, useRef, useEffect } from 'react'
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { generateKeyBetween } from 'fractional-indexing'
import type { Todo } from '../App'
import { trackTodoCopied } from '../firebase/analytics'

interface UseTodoDragAndDropProps {
  todos: Todo[]
  onMoveTodo: (todoId: string, newDate: string, newIndex?: number) => void
  onCopyTodo: (todoId: string, newDate: string, newIndex?: number) => void
  onResetTodoForCopy: (todoId: string) => void
  onAddTodoWithState: (todo: { text: string; date: string; completed: boolean; position?: string }) => void
}

export function useTodoDragAndDrop({ todos, onMoveTodo, onCopyTodo, onResetTodoForCopy, onAddTodoWithState }: UseTodoDragAndDropProps) {
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null)
  const [isCopyMode, setIsCopyMode] = useState(false)

  // Track the current container to prevent redundant updates
  const currentContainerRef = useRef<string | null>(null)
  // Track the original date when drag starts (for copy mode detection)
  const originalDateRef = useRef<string | null>(null)

  // Use refs to stabilize handler dependencies and prevent recreation during drag
  const todosRef = useRef(todos)
  const onMoveTodoRef = useRef(onMoveTodo)
  const onCopyTodoRef = useRef(onCopyTodo)
  const onResetTodoForCopyRef = useRef(onResetTodoForCopy)
  const onAddTodoWithStateRef = useRef(onAddTodoWithState)

  // Keep refs updated with latest values
  useEffect(() => {
    todosRef.current = todos
    onMoveTodoRef.current = onMoveTodo
    onCopyTodoRef.current = onCopyTodo
    onResetTodoForCopyRef.current = onResetTodoForCopy
    onAddTodoWithStateRef.current = onAddTodoWithState
  }, [todos, onMoveTodo, onCopyTodo, onResetTodoForCopy, onAddTodoWithState])

  // Track CMD/ALT key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.altKey) {
        setIsCopyMode(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.altKey) {
        setIsCopyMode(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const todo = todosRef.current.find(t => t.id === event.active.id)
    if (todo) {
      setActiveTodo(todo)
      // Initialize the current container to the starting date
      currentContainerRef.current = todo.date
      // Store the original date for later comparison
      originalDateRef.current = todo.date

      // Check if CMD/ALT is held from the actual pointer event
      const pointerEvent = event.activatorEvent as PointerEvent
      const isCopyModeDuringDrag = pointerEvent?.metaKey || pointerEvent?.altKey || isCopyMode

      // If in copy mode, immediately create an optimistic copy at the source and reset the dragged todo
      if (isCopyModeDuringDrag) {
        // Find todos on the same day, sorted by position
        const todosInDay = todosRef.current
          .filter(t => t.date === todo.date)
          .sort((a, b) => {
            if (a.position < b.position) return -1;
            if (a.position > b.position) return 1;
            return 0;
          })

        // Find the index of the current todo
        const currentIndex = todosInDay.findIndex(t => t.id === todo.id)

        // Calculate a new position between the previous todo and current todo
        const beforeTodo = currentIndex > 0 ? todosInDay[currentIndex - 1] : null
        const newPosition = generateKeyBetween(beforeTodo?.position || null, todo.position)

        // Create optimistic copy at source with original state
        onAddTodoWithStateRef.current({
          text: todo.text,
          date: todo.date,
          completed: todo.completed,
          position: newPosition,
        })

        // Reset the dragged todo to incomplete (will apply when drag ends)
        onResetTodoForCopyRef.current(todo.id)

        // Track CMD+drag copy
        trackTodoCopied({ method: 'drag' })
      }
    }
  }, [isCopyMode])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeTodoId = active.id as string
    const overItemId = over.id as string

    const currentTodos = todosRef.current
    const activeTodo = currentTodos.find(t => t.id === activeTodoId)
    if (!activeTodo) return

    // Check if we're over a day cell (date string format) vs another todo
    const overTodo = currentTodos.find(t => t.id === overItemId)

    if (!overTodo) {
      // We're over an empty day cell
      const overDayId = overItemId
      // Only update if we're moving to a different container AND we're not already in that container
      if (activeTodo.date !== overDayId && currentContainerRef.current !== overDayId) {
        // Cross-day move to empty cell - update immediately for visual feedback
        currentContainerRef.current = overDayId
        onMoveTodoRef.current(activeTodoId, overDayId)
      }
    } else {
      // We're over another todo
      // Only update if we're moving to a different day AND we're not already in that container
      if (activeTodo.date !== overTodo.date && currentContainerRef.current !== overTodo.date) {
        // Moving to different day - update immediately for visual feedback
        currentContainerRef.current = overTodo.date
        const todosInTargetDay = currentTodos
          .filter(t => t.date === overTodo.date && t.id !== activeTodoId)
          .sort((a, b) => {
            if (a.position < b.position) return -1;
            if (a.position > b.position) return 1;
            return 0;
          })

        const newIndex = todosInTargetDay.findIndex(t => t.id === overItemId)
        onMoveTodoRef.current(activeTodoId, overTodo.date, newIndex >= 0 ? newIndex : undefined)
      }
      // If same day, let SortableContext handle the reordering
    }
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    const originalDate = originalDateRef.current

    setActiveTodo(null)
    // Reset the current container tracker
    currentContainerRef.current = null
    originalDateRef.current = null

    if (!over) return

    const activeTodoId = active.id as string
    const overItemId = over.id as string

    if (activeTodoId === overItemId) return

    const currentTodos = todosRef.current
    const activeTodo = currentTodos.find(t => t.id === activeTodoId)
    if (!activeTodo) return

    // Check if we're dropping over another todo (for reordering within same day)
    const overTodo = currentTodos.find(t => t.id === overItemId)

    // Determine target date
    let targetDate: string
    let targetIndex: number | undefined

    if (overTodo) {
      targetDate = overTodo.date

      // Use original date for comparison, not current date (which may have been updated by handleDragOver)
      if (originalDate === overTodo.date) {
        // Same-day reordering
        const todosInDay = currentTodos
          .filter(t => t.date === activeTodo.date)
          .sort((a, b) => {
            if (a.position < b.position) return -1;
            if (a.position > b.position) return 1;
            return 0;
          })

        const oldIndex = todosInDay.findIndex(t => t.id === activeTodoId)
        const newIndex = todosInDay.findIndex(t => t.id === overItemId)

        if (oldIndex !== newIndex) {
          onMoveTodoRef.current(activeTodoId, activeTodo.date, newIndex)
        }
        return
      } else {
        // Cross-day drop - calculate target index
        const todosInTargetDay = currentTodos
          .filter(t => t.date === overTodo.date && t.id !== activeTodoId)
          .sort((a, b) => {
            if (a.position < b.position) return -1;
            if (a.position > b.position) return 1;
            return 0;
          })
        targetIndex = todosInTargetDay.findIndex(t => t.id === overItemId)
        targetIndex = targetIndex >= 0 ? targetIndex : undefined
      }
    } else {
      // Dropping over empty day cell
      targetDate = overItemId
      targetIndex = undefined
    }

    // Check if we're dropping on the same date as we started from
    if (originalDate === targetDate) return

    // Finalize the move (reset was already queued in handleDragStart if copy mode)
    onMoveTodoRef.current(activeTodoId, targetDate, targetIndex)
  }, [isCopyMode])

  return {
    sensors,
    activeTodo,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }
}
