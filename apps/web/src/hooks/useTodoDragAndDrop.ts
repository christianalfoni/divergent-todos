import { useState, useCallback, useRef, useEffect } from 'react'
import {
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import type { Todo } from '../App'

interface UseTodoDragAndDropProps {
  todos: Todo[]
  onMoveTodo: (todoId: string, newDate: string, newIndex?: number) => void
  onCopyTodo: (todoId: string, newDate: string, newIndex?: number) => void
}

export function useTodoDragAndDrop({ todos, onMoveTodo, onCopyTodo }: UseTodoDragAndDropProps) {
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null)
  const [isCopyMode, setIsCopyMode] = useState(false)

  // Use refs to stabilize handler dependencies and prevent recreation during drag
  const todosRef = useRef(todos)
  const onMoveTodoRef = useRef(onMoveTodo)
  const onCopyTodoRef = useRef(onCopyTodo)

  // Keep refs updated with latest values
  useEffect(() => {
    todosRef.current = todos
    onMoveTodoRef.current = onMoveTodo
    onCopyTodoRef.current = onCopyTodo
  }, [todos, onMoveTodo, onCopyTodo])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Track modifier keys during drag
  useEffect(() => {
    if (!activeTodo) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.metaKey) {
        setIsCopyMode(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.altKey && !e.metaKey) {
        setIsCopyMode(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [activeTodo])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const todo = todosRef.current.find(t => t.id === event.active.id)
    if (todo) {
      setActiveTodo(todo)
      // Check if ALT (Windows/Linux) or Meta/CMD (Mac) is pressed
      const nativeEvent = (event.activatorEvent as PointerEvent)
      setIsCopyMode(nativeEvent.altKey || nativeEvent.metaKey)
    }
  }, [])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeTodoId = active.id as string
    const overItemId = over.id as string

    const currentTodos = todosRef.current
    const activeTodo = currentTodos.find(t => t.id === activeTodoId)
    if (!activeTodo) return

    // In copy mode, don't perform visual updates during drag
    // We'll handle the copy on drop
    if (isCopyMode) return

    // Check if we're over a day cell (date string format) vs another todo
    const overTodo = currentTodos.find(t => t.id === overItemId)

    if (!overTodo) {
      // We're over an empty day cell
      const overDayId = overItemId
      if (activeTodo.date !== overDayId) {
        // Cross-day move to empty cell - update immediately for visual feedback
        onMoveTodoRef.current(activeTodoId, overDayId)
      }
    } else {
      // We're over another todo
      if (activeTodo.date !== overTodo.date) {
        // Moving to different day - update immediately for visual feedback
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
  }, [isCopyMode])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    const wasCopyMode = isCopyMode
    setActiveTodo(null)
    setIsCopyMode(false)

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

      if (activeTodo.date === overTodo.date) {
        // Same-day operation
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
          // In copy mode, don't do anything when dropping on same day
          if (!wasCopyMode) {
            onMoveTodoRef.current(activeTodoId, activeTodo.date, newIndex)
          }
        }
        return
      } else {
        // Different day - calculate target index
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

    // If same date, do nothing
    if (activeTodo.date === targetDate) return

    // Handle copy vs move
    if (wasCopyMode) {
      onCopyTodoRef.current(activeTodoId, targetDate, targetIndex)
    } else {
      onMoveTodoRef.current(activeTodoId, targetDate, targetIndex)
    }
  }, [isCopyMode])

  return {
    sensors,
    activeTodo,
    isCopyMode,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }
}
