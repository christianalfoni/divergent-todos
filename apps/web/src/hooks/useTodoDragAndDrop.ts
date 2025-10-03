import { useState, useRef } from 'react'
import {
  closestCenter,
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
      // Move to that day if different
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

    // Check if we're dropping over another todo (for reordering within the same day)
    const overTodo = todos.find(t => t.id === overItemId)
    if (overTodo) {
      const activeTodo = todos.find(t => t.id === activeTodoId)
      if (activeTodo && activeTodo.date === overTodo.date) {
        // Reordering within the same day
        const todosInDay = todos.filter(t => t.date === activeTodo.date)
        const oldIndex = todosInDay.findIndex(t => t.id === activeTodoId)
        const newIndex = todosInDay.findIndex(t => t.id === overItemId)

        if (oldIndex !== newIndex) {
          onMoveTodo(activeTodoId, activeTodo.date, newIndex)
        }
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
    collisionDetection: closestCenter,
  }
}
