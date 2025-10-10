import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

/**
 * Submit user feedback
 */
export async function submitFeedback(feedback: string): Promise<void> {
  const fn = httpsCallable(functions, "submitFeedback");
  await fn({ feedback });
}
