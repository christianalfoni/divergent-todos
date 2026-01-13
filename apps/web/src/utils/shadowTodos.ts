import type { Todo } from '../App';

/**
 * Extracts shadow todos for a given date based on session dates
 * A shadow todo appears on days where sessions were recorded but the todo's actual date is different
 */
export function getShadowTodosForDate(date: Date, allTodos: Todo[]): Todo[] {
  const targetDateStr = date.toISOString().split('T')[0];

  const shadowTodos: Todo[] = [];

  for (const todo of allTodos) {
    // Skip if todo is on the same date (not a shadow)
    if (todo.date === targetDateStr) {
      continue;
    }

    // Check if todo has sessions on this date
    if (todo.sessions && todo.sessions.length > 0) {
      const hasSessionOnDate = todo.sessions.some(session => {
        const sessionDateStr = session.createdAt instanceof Date
          ? session.createdAt.toISOString().split('T')[0]
          : new Date(session.createdAt).toISOString().split('T')[0];
        return sessionDateStr === targetDateStr;
      });

      if (hasSessionOnDate) {
        shadowTodos.push(todo);
      }
    }
  }

  return shadowTodos;
}
