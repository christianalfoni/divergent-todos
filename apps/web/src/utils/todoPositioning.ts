import { generateKeyBetween } from "fractional-indexing";

export interface TodoWithPosition {
  id: string;
  position: string;
  date: Date;
}

/**
 * Calculate the new position for a todo when moving it to a specific index within a date
 */
export function calculateNewPosition<T extends TodoWithPosition>(
  todoId: string,
  targetDate: string,
  allTodos: T[],
  targetIndex?: number
): string {
  // Get todos for target date, sorted by position (excluding the dragged todo)
  const todosInTargetDate = allTodos
    .filter((t) => t.date.toISOString().split("T")[0] === targetDate && t.id !== todoId)
    .slice()
    .sort((a, b) => {
      if (a.position < b.position) return -1;
      if (a.position > b.position) return 1;
      return 0;
    });

  if (targetIndex === undefined || todosInTargetDate.length === 0) {
    // Moving to a date without specific position - place at end
    const lastTodo = todosInTargetDate[todosInTargetDate.length - 1];
    return generateKeyBetween(lastTodo?.position || null, null);
  } else {
    // Moving to specific position
    const beforeTodo = todosInTargetDate[targetIndex - 1];
    const afterTodo = todosInTargetDate[targetIndex];
    return generateKeyBetween(beforeTodo?.position || null, afterTodo?.position || null);
  }
}

/**
 * Calculate new positions for multiple todos being moved to a target date
 * Returns an array of [todoId, newPosition] tuples
 */
export function calculateBatchPositions<T extends TodoWithPosition>(
  todoIds: string[],
  targetDate: string,
  allTodos: T[]
): Array<[string, string]> {
  // Get todos for target date (excluding todos being moved)
  const todosInTargetDate = allTodos
    .filter((t) => t.date.toISOString().split("T")[0] === targetDate && !todoIds.includes(t.id))
    .slice()
    .sort((a, b) => {
      if (a.position < b.position) return -1;
      if (a.position > b.position) return 1;
      return 0;
    });

  // Track the last position to chain the new positions
  let lastPosition = todosInTargetDate.length > 0 ? todosInTargetDate[todosInTargetDate.length - 1].position : null;

  // Calculate positions for each todo
  return todoIds.map((todoId) => {
    const newPosition = generateKeyBetween(lastPosition, null);
    lastPosition = newPosition; // Update for next todo
    return [todoId, newPosition] as [string, string];
  });
}
