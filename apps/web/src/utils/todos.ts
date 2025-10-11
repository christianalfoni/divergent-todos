import type { Todo as FirebaseTodo } from "../firebase";
import type { Todo } from "../App";

export function sortTodosByPosition<T extends { position: string }>(todos: T[]): T[] {
  return todos.slice().sort((a, b) => {
    // Use standard string comparison, not localeCompare, to match fractional-indexing library
    if (a.position < b.position) return -1;
    if (a.position > b.position) return 1;
    return 0;
  });
}

export function getCurrentWeekMonday(): Date {
  const today = new Date();
  const currentDay = today.getDay();
  const isWeekend = currentDay === 0 || currentDay === 6;

  let daysToMonday: number;
  if (isWeekend) {
    // If it's weekend, return next Monday instead of current Monday
    // Saturday (6) -> +2 days, Sunday (0) -> +1 day
    daysToMonday = currentDay === 0 ? 1 : 2;
  } else {
    // Weekday -> go back to Monday of current week
    daysToMonday = -(currentDay - 1);
  }

  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function getOldUncompletedTodos(todos: Todo[]): Todo[] {
  const currentWeekMonday = getCurrentWeekMonday();
  return todos.filter((todo) => {
    if (todo.completed) return false;
    const todoDate = new Date(todo.date);
    return todoDate < currentWeekMonday;
  });
}

export function getNextWorkday(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();

  let targetDate = new Date(today);

  // If it's Saturday (6), move to Monday (+2 days)
  // If it's Sunday (0), move to Monday (+1 day)
  // Otherwise, use today
  if (dayOfWeek === 6) {
    targetDate.setDate(today.getDate() + 2);
  } else if (dayOfWeek === 0) {
    targetDate.setDate(today.getDate() + 1);
  }

  return targetDate;
}

export function convertFirebaseTodoToAppTodo(todo: FirebaseTodo): Todo {
  return {
    id: todo.id,
    text: todo.description,
    url: undefined,
    completed: todo.completed,
    date: todo.date.toISOString().split("T")[0],
    position: todo.position,
  };
}
