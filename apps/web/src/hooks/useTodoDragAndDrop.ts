import { useState } from 'react'
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
}

export function useTodoDragAndDrop({ todos, onMoveTodo }: UseTodoDragAndDropProps) {
  const [activeTodo, setActiveTodo] = useState<Todo | null>(null)

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
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event
    if (!over) return

    const activeTodoId = active.id as string
    const overItemId = over.id as string

    const activeTodo = todos.find(t => t.id === activeTodoId)
    if (!activeTodo) return

    // Check if we're over a day cell (date string format) vs another todo
    const overTodo = todos.find(t => t.id === overItemId)

    if (!overTodo) {
      // We're over an empty day cell
      const overDayId = overItemId
      if (activeTodo.date !== overDayId) {
        onMoveTodo(activeTodoId, overDayId)
      }
    } else {
      // We're over another todo
      if (activeTodo.date !== overTodo.date) {
        // Moving to different day - move immediately
        const todosInTargetDay = todos
          .filter(t => t.date === overTodo.date && t.id !== activeTodoId)
          .sort((a, b) => {
            if (a.position < b.position) return -1;
            if (a.position > b.position) return 1;
            return 0;
          })

        const newIndex = todosInTargetDay.findIndex(t => t.id === overItemId)
        onMoveTodo(activeTodoId, overTodo.date, newIndex >= 0 ? newIndex : undefined)
      }
      // If same day, let SortableContext handle the reordering
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTodo(null)

    if (!over) return

    const activeTodoId = active.id as string
    const overItemId = over.id as string

    if (activeTodoId === overItemId) return

    const activeTodo = todos.find(t => t.id === activeTodoId)
    if (!activeTodo) return

    // Check if we're dropping over another todo (for reordering within same day)
    const overTodo = todos.find(t => t.id === overItemId)

    if (overTodo && activeTodo.date === overTodo.date) {
      // Reordering within the same day
      const todosInDay = todos
        .filter(t => t.date === activeTodo.date)
        .sort((a, b) => {
          if (a.position < b.position) return -1;
          if (a.position > b.position) return 1;
          return 0;
        })

      const oldIndex = todosInDay.findIndex(t => t.id === activeTodoId)
      const newIndex = todosInDay.findIndex(t => t.id === overItemId)

      if (oldIndex !== newIndex) {
        onMoveTodo(activeTodoId, activeTodo.date, newIndex)
      }
    }
    // Cross-day moves are already handled in handleDragOver
  }

  return {
    sensors,
    activeTodo,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  }
}
