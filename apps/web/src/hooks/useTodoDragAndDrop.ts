import { useState, useRef } from 'react'
import {
  pointerWithin,
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
}

export function useTodoDragAndDrop({ todos, onMoveTodo }: UseTodoDragAndDropProps) {
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null)
  const [hoveredDayId, setHoveredDayId] = useState<string | null>(null)
  const lastOverIdRef = useRef<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const todo = todos.find(t => t.id === event.active.id)
    if (todo) {
      setActiveTodo(todo)
      lastOverIdRef.current = null
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) {
      setHoveredDayId(null)
      return
    }

    const activeTodoId = active.id as string
    const overItemId = over.id as string

    // Prevent redundant updates
    if (lastOverIdRef.current === overItemId) return
    lastOverIdRef.current = overItemId

    const activeTodo = todos.find(t => t.id === activeTodoId)
    if (!activeTodo) return

    // Check if we're over a day cell (date string format) vs another todo
    const overTodo = todos.find(t => t.id === overItemId)

    if (!overTodo) {
      // We're over a day cell
      const overDayId = overItemId
      setHoveredDayId(overDayId)
      if (activeTodo.date !== overDayId) {
        onMoveTodo(activeTodoId, overDayId)
      }
    } else {
      // We're over another todo - set hovered day to that todo's day
      setHoveredDayId(overTodo.date)
      // Only move to different day during drag, not for reordering within same day
      // Reordering will be handled in handleDragEnd
      if (activeTodo.date !== overTodo.date) {
        onMoveTodo(activeTodoId, overTodo.date)
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTodo(null)
    setHoveredDayId(null)
    lastOverIdRef.current = null

    if (!over) return

    const activeTodoId = active.id as string
    const overItemId = over.id as string

    const activeTodo = todos.find(t => t.id === activeTodoId)
    if (!activeTodo) return

    // Check if we're dropping over another todo
    const overTodo = todos.find(t => t.id === overItemId)
    if (overTodo) {
      // Dropped over another todo
      const todosInTargetDay = todos
        .filter(t => t.date === overTodo.date)
        .sort((a, b) => {
          // Use standard string comparison, not localeCompare, to match fractional-indexing library
          if (a.position < b.position) return -1;
          if (a.position > b.position) return 1;
          return 0;
        })

      const newIndex = todosInTargetDay.findIndex(t => t.id === overItemId)

      if (activeTodo.date === overTodo.date) {
        // Reordering within the same day
        const oldIndex = todosInTargetDay.findIndex(t => t.id === activeTodoId)
        if (oldIndex !== newIndex) {
          onMoveTodo(activeTodoId, activeTodo.date, newIndex)
        }
      } else {
        // Moving to a different day - place at the position of the todo we dropped on
        onMoveTodo(activeTodoId, overTodo.date, newIndex)
      }
    } else {
      // Dropped on an empty day cell - no specific index, will go to end
      const overDayId = overItemId
      if (activeTodo.date !== overDayId) {
        onMoveTodo(activeTodoId, overDayId)
      }
    }
  }

  return {
    sensors,
    activeTodo,
    hoveredDayId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    collisionDetection: pointerWithin,
  }
}
