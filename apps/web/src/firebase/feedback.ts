import { getFunctions, httpsCallable } from "firebase/functions";

/**
 * Submit user feedback
 */
export async function submitFeedback(feedback: string): Promise<void> {
  const functions = getFunctions();

  const fn = httpsCallable(functions, "submitFeedback");
  await fn({ feedback });
}
