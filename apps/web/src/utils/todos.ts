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

export function getOldUncompletedTodos(todos: Todo[]): Todo[] {
  const targetDate = getNextWorkday();
  const targetDateString = targetDate.toISOString().split("T")[0];
  return todos.filter((todo) => {
    if (todo.completed) return false;
    return todo.date < targetDateString;
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

export function getNextWorkdayAfterDate(date: Date): Date {
  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);
  const dayOfWeek = nextDay.getDay();

  // If next day is Saturday (6), move to Monday (+2 more days from next day)
  // If next day is Sunday (0), move to Monday (+1 more day from next day)
  // Otherwise, use next day
  if (dayOfWeek === 6) {
    nextDay.setDate(nextDay.getDate() + 2);
  } else if (dayOfWeek === 0) {
    nextDay.setDate(nextDay.getDate() + 1);
  }

  return nextDay;
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
