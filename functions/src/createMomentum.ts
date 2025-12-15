import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { generateTaskMomentum } from "./lib/openai-create-momentum.js";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

interface CreateMomentumRequest {
  todoText: string;
  userContext?: string;
  moveCount?: number;
}

interface CreateMomentumResult {
  success: boolean;
  suggestions: string[];
}

/**
 * Firebase Cloud Function to help users create momentum by suggesting 2-3 tiny first steps
 * Uses OpenAI GPT-4o-mini to analyze the task and suggest small actions (5-15 min each)
 */
export const createMomentum = onCall(
  {
    secrets: [OPENAI_API_KEY],
    region: "us-central1",
  },
  async (request) => {
    // Auth check
    if (!request.auth) {
      logger.warn("Unauthenticated createMomentum attempt");
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Input validation
    const { todoText, userContext, moveCount } = request.data as CreateMomentumRequest;
    if (!todoText || typeof todoText !== "string") {
      throw new HttpsError("invalid-argument", "todoText is required");
    }

    if (todoText.length > 2000) {
      throw new HttpsError("invalid-argument", "todoText is too long (max 2000 characters)");
    }

    if (userContext && userContext.length > 1000) {
      throw new HttpsError("invalid-argument", "userContext is too long (max 1000 characters)");
    }

    logger.info("Finding first step suggestions for momentum", {
      uid: request.auth.uid,
      todoLength: todoText.length,
      hasContext: !!userContext,
      moveCount,
    });

    try {
      // Call OpenAI to generate suggestions
      const suggestions = await generateTaskMomentum(
        OPENAI_API_KEY.value(),
        todoText,
        userContext,
        moveCount
      );

      logger.info("First step suggestions generated", {
        uid: request.auth.uid,
        suggestionCount: suggestions.length,
      });

      return {
        success: true,
        suggestions,
      } as CreateMomentumResult;
    } catch (error) {
      logger.error("Error in createMomentum", error);
      throw new HttpsError("internal", `Failed to generate suggestions: ${error}`);
    }
  }
);
