import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

export interface CreateMomentumRequest {
  todoText: string;
  userContext?: string;
  moveCount?: number;
}

export interface CreateMomentumResult {
  success: boolean;
  suggestions: string[];
}

/**
 * Call Firebase function to get 2-3 suggested first steps to create momentum
 */
export async function createMomentum(
  todoText: string,
  userContext?: string,
  moveCount?: number
): Promise<string[]> {
  const fn = httpsCallable<CreateMomentumRequest, CreateMomentumResult>(
    functions,
    "createMomentum"
  );

  const result = await fn({
    todoText,
    userContext,
    moveCount,
  });

  return result.data.suggestions;
}
