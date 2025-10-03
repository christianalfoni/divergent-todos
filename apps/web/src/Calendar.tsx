import { useEffect, useState, useMemo } from 'react'
import { DndContext, DragOverlay } from '@dnd-kit/core'
import DayCell from './DayCell'
import { useAuthentication } from './hooks/useAuthentication'
import { useTodoDragAndDrop } from './hooks/useTodoDragAndDrop'
import { getWeekdaysForThreeWeeks, isToday, getDateId } from './utils/calendar'
import type { Todo } from './App'

interface CalendarProps {
  todos: Todo[]
  onAddTodo: (todo: Omit<Todo, 'id'>) => void
  onToggleTodoComplete: (todoId: string) => void
  onMoveTodo: (todoId: string, newDate: string, newIndex?: number) => void
}

export default function Calendar({ todos, onAddTodo, onToggleTodoComplete, onMoveTodo }: CalendarProps) {
  const [authentication] = useAuthentication()
  const [showThreeWeeks, setShowThreeWeeks] = useState(true)
  const allWeekdays = useMemo(() => getWeekdaysForThreeWeeks(), [])

  const {
    sensors,
    activeTodo,
    hoveredDayId,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    collisionDetection,
  } = useTodoDragAndDrop({ todos, onMoveTodo })

  const getTodosForDate = (date: Date): Todo[] => {
    const dateString = date.toISOString().split('T')[0]
    return todos.filter(todo => todo.date === dateString)
  }

  const weekdays = useMemo(() => {
    if (showThreeWeeks) {
      return allWeekdays
    }
    // Show only current week (middle 5 days)
    return allWeekdays.slice(5, 10)
  }, [allWeekdays, showThreeWeeks])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        setShowThreeWeeks(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-white dark:bg-gray-900">
        <div className="grid grid-cols-5 gap-px border-b border-gray-300 bg-gray-200 text-center text-xs/6 font-semibold text-gray-700 dark:border-white/5 dark:bg-white/15 dark:text-gray-300">
          <div className="flex justify-center bg-white py-2 dark:bg-gray-900">
            <span>M</span>
            <span className="sr-only sm:not-sr-only">on</span>
          </div>
          <div className="flex justify-center bg-white py-2 dark:bg-gray-900">
            <span>T</span>
            <span className="sr-only sm:not-sr-only">ue</span>
          </div>
          <div className="flex justify-center bg-white py-2 dark:bg-gray-900">
            <span>W</span>
            <span className="sr-only sm:not-sr-only">ed</span>
          </div>
          <div className="flex justify-center bg-white py-2 dark:bg-gray-900">
            <span>T</span>
            <span className="sr-only sm:not-sr-only">hu</span>
          </div>
          <div className="flex justify-center bg-white py-2 dark:bg-gray-900">
            <span>F</span>
            <span className="sr-only sm:not-sr-only">ri</span>
          </div>
        </div>
        <div className={`grid grid-cols-5 ${showThreeWeeks ? 'grid-rows-3' : 'grid-rows-1'} flex-1 gap-px bg-gray-200 dark:bg-white/15`}>
          {weekdays.map((date, index) => {
            const dayId = getDateId(date)
            return (
              <DayCell
                key={index}
                date={date}
                isToday={isToday(date)}
                isAuthenticated={!!authentication.user}
                todos={getTodosForDate(date)}
                onAddTodo={onAddTodo}
                onToggleTodoComplete={onToggleTodoComplete}
                isBeingDraggedOver={hoveredDayId === dayId}
              />
            )
          })}
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {null}
      </DragOverlay>
    </DndContext>
  )
}
