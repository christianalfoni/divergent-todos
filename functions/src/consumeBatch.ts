import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  checkBatchStatus,
  downloadBatchOutput,
  parseBatchResponse,
} from "./lib/openai-batch.js";
import { getCompletedTodosForWeek, getWeekDateRange } from "./lib/activity-data.js";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const ADMIN_UID = "iaSsqsqb99Zemast8LN3dGCxB7o2";

/**
 * Callable function to consume a completed batch job
 * Downloads results and writes to Firestore
 */
export const consumeBatch = onCall(
  {
    secrets: [OPENAI_API_KEY],
    memory: "512MiB",
    timeoutSeconds: 300, // 5 minutes
  },
  async (req) => {
    const db = getFirestore();
    const callerUid = req.auth?.uid;

    // Check admin access
    if (callerUid !== ADMIN_UID) {
      logger.warn("Unauthorized consumeBatch attempt", { uid: callerUid });
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { batchId } = req.data;

    if (!batchId || typeof batchId !== "string") {
      throw new HttpsError("invalid-argument", "batchId is required");
    }

    logger.info("Starting batch consumption", { batchId, callerUid });

    try {
      // Step 1: Check if batch is completed
      const status = await checkBatchStatus(OPENAI_API_KEY.value(), batchId);

      if (status.status !== "completed") {
        throw new HttpsError(
          "failed-precondition",
          `Batch is not completed. Current status: ${status.status}`
        );
      }

      if (!status.outputFileId) {
        throw new HttpsError(
          "failed-precondition",
          "Batch completed but no output file available"
        );
      }

      logger.info("Batch is completed, downloading results", {
        batchId,
        outputFileId: status.outputFileId,
      });

      // Step 2: Download results
      const outputContent = await downloadBatchOutput(
        OPENAI_API_KEY.value(),
        status.outputFileId
      );

      // Step 3: Parse results
      const results = parseBatchResponse(outputContent);
      logger.info(`Parsed ${results.size} results`);

      // Step 4: Write to Firestore
      logger.info("Writing results to Firestore...");
      let successCount = 0;
      let errorCount = 0;
      const errors: Array<{ customId: string; error: string }> = [];

      for (const [customId, result] of results.entries()) {
        try {
          // Parse custom_id format: userId_year_week
          const [userId, yearStr, weekStr] = customId.split("_");
          const year = parseInt(yearStr, 10);
          const week = parseInt(weekStr, 10);

          if (result instanceof Error) {
            logger.error(`AI generation failed for ${customId}`, {
              error: result.message,
            });
            errors.push({ customId, error: result.message });
            errorCount++;
            continue;
          }

          // Get week start for month calculation
          const { start: weekStart } = getWeekDateRange(year, week);
          const month = weekStart.getMonth();

          // Get completed todos for this user/week
          const completedTodos = await getCompletedTodosForWeek(
            db,
            userId,
            week,
            year
          );

          // Write activity document
          const activityDocId = `${userId}_${year}_${week}`;
          await db
            .collection("activity")
            .doc(activityDocId)
            .set({
              userId,
              year,
              week,
              month,
              completedTodos,
              aiSummary: result.formalSummary,
              aiPersonalSummary: result.personalSummary,
              aiSummaryGeneratedAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            });

          successCount++;
          logger.info(`✓ Successfully wrote activity for ${customId}`);
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : String(error);
          logger.error(`✗ Failed to write activity for ${customId}`, error);
          errors.push({ customId, error: errorMsg });
          errorCount++;
        }
      }

      logger.info("Batch consumption completed", {
        batchId,
        successCount,
        errorCount,
      });

      return {
        success: true,
        batchId,
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      logger.error("Error consuming batch", { batchId, error });

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to consume batch: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);
