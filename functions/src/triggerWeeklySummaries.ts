import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  getTodosForWeek,
  getUsersWithActiveSubscription,
  getWeekDateRange,
} from "./lib/activity-data.js";
import {
  createBatchRequest,
  batchRequestsToJsonl,
  submitBatchJob,
  checkBatchStatus,
  downloadBatchOutput,
  parseBatchResponse,
} from "./lib/openai-batch.js";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const ADMIN_UID = "iaSsqsqb99Zemast8LN3dGCxB7o2";

/**
 * Manual trigger for testing weekly summary generation
 * Callable function - can be invoked from client or Firebase console
 */
export const triggerWeeklySummaries = onCall(
  {
    secrets: [OPENAI_API_KEY],
    memory: "512MiB",
    timeoutSeconds: 540,
  },
  async (req) => {
    const db = getFirestore();
    const callerUid = req.auth?.uid;

    // Check admin access
    if (callerUid !== ADMIN_UID) {
      logger.warn("Unauthorized triggerWeeklySummaries attempt", { uid: callerUid });
      throw new HttpsError("permission-denied", "Admin access required");
    }

    // Allow specifying custom week/year for testing
    const { week, year } = req.data || {};
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetWeek = week || getCurrentWeek(now) - 1; // Default to previous week

    logger.info("Manual trigger: Starting weekly summary generation", {
      targetYear,
      targetWeek,
      triggeredBy: callerUid,
    });

    try {
      // Step 1: Get all users with active subscriptions
      logger.info("Fetching users with active subscriptions...");
      const userIds = await getUsersWithActiveSubscription(db);

      if (userIds.length === 0) {
        logger.info("No users with active subscriptions found");
        return {
          success: true,
          message: "No users with active subscriptions found",
          week: targetWeek,
          year: targetYear,
          totalUsers: 0,
          requestsSubmitted: 0,
        };
      }

      logger.info(`Found ${userIds.length} users with active subscriptions`);

      // Step 2: Build batch requests for all users
      logger.info("Building batch requests...");
      const batchRequests = [];
      const skippedUsers: string[] = [];

      for (const userId of userIds) {
        try {
          const { completedTodos, incompleteTodos } = await getTodosForWeek(
            db,
            userId,
            targetWeek,
            targetYear
          );

          if (completedTodos.length > 0) {
            const request = createBatchRequest(
              userId,
              completedTodos,
              incompleteTodos,
              targetWeek,
              targetYear
            );
            batchRequests.push(request);
          } else {
            skippedUsers.push(userId);
          }
        } catch (error) {
          logger.error(`Failed to build request for user ${userId}`, error);
          skippedUsers.push(userId);
        }
      }

      if (batchRequests.length === 0) {
        logger.info("No batch requests to submit");
        return {
          success: true,
          message: "No batch requests to submit",
          week: targetWeek,
          year: targetYear,
          skippedUsers,
        };
      }

      logger.info(`Built ${batchRequests.length} batch requests`);

      // Step 3: Submit batch job to OpenAI
      logger.info("Submitting batch job to OpenAI...");
      const jsonlContent = batchRequestsToJsonl(batchRequests);
      const batchId = await submitBatchJob(OPENAI_API_KEY.value(), jsonlContent);

      logger.info(`Batch job submitted successfully`, { batchId });

      // Step 4: Poll for completion until done (max 9 minutes due to function timeout)
      logger.info("Polling for batch completion...");
      const maxPolls = 8; // Poll for ~8 minutes (60s intervals)
      const pollInterval = 60000; // 1 minute

      let pollCount = 0;
      let completed = false;

      while (pollCount < maxPolls && !completed) {
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        pollCount++;

        const status = await checkBatchStatus(OPENAI_API_KEY.value(), batchId);
        logger.info(`Batch status check ${pollCount}/${maxPolls}`, {
          status: status.status,
          batchId,
        });

        if (status.status === "completed" && status.outputFileId) {
          completed = true;

          // Step 5: Download and parse results
          logger.info("Downloading batch results...");
          const outputContent = await downloadBatchOutput(
            OPENAI_API_KEY.value(),
            status.outputFileId
          );

          const results = parseBatchResponse(outputContent);
          logger.info(`Parsed ${results.size} results`);

          // Step 6: Write results to Firestore
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

              // Get todos for this user/week
              const { completedTodos, incompleteTodos } = await getTodosForWeek(
                db,
                userId,
                week,
                year
              );

              // Write reflection document
              const reflectionDocId = `${userId}_${year}_${week}`;
              await db
                .collection("reflections")
                .doc(reflectionDocId)
                .set({
                  userId,
                  year,
                  week,
                  month,
                  completedTodos,
                  incompleteCount: incompleteTodos.length,
                  notes: result.notes,
                  notesGeneratedAt: Timestamp.now(),
                  updatedAt: Timestamp.now(),
                });

              successCount++;
              logger.info(`Successfully wrote reflection for ${customId}`);
            } catch (error) {
              logger.error(`Failed to write reflection for ${customId}`, error);
              errors.push({
                customId,
                error: error instanceof Error ? error.message : String(error),
              });
              errorCount++;
            }
          }

          logger.info("Batch processing completed", {
            totalUsers: batchRequests.length,
            successCount,
            errorCount,
          });

          return {
            success: true,
            batchId,
            week: targetWeek,
            year: targetYear,
            totalUsers: userIds.length,
            requestsSubmitted: batchRequests.length,
            successCount,
            errorCount,
            skippedUsers,
            errors: errors.length > 0 ? errors : undefined,
          };
        } else if (status.status === "failed" || status.status === "cancelled") {
          logger.error("Batch job failed or cancelled", {
            status: status.status,
            batchId,
          });
          throw new HttpsError(
            "internal",
            `Batch job ${status.status}: ${batchId}`
          );
        }
        // Otherwise status is "validating" or "in_progress", continue polling
      }

      // Timeout reached
      logger.warn("Batch polling timeout reached", {
        batchId,
        pollCount,
      });

      return {
        success: false,
        batchId,
        week: targetWeek,
        year: targetYear,
        message:
          "Batch is still processing. Check logs later or use checkBatchStatus with batchId.",
        totalUsers: userIds.length,
        requestsSubmitted: batchRequests.length,
      };
    } catch (error) {
      logger.error("Error in triggerWeeklySummaries", error);
      throw new HttpsError(
        "internal",
        `Failed to generate summaries: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

/**
 * Calculate current week number (sequential 1-52)
 * Week 1 = first Monday-Friday in January (may be partial)
 * Matches the implementation in apps/web/src/utils/activity.ts
 */
function getCurrentWeek(date: Date): number {
  const year = date.getFullYear();
  let weekNumber = 0;

  // Normalize target date to midnight for comparison
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  // Iterate through all days from Jan 1 onwards
  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dayOfWeek = currentDate.getDay();

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Start of new week (Monday)
      if (dayOfWeek === 1) {
        weekNumber++;
      }

      // If we've reached or passed the target date, return the current week
      // This handles weekends correctly by returning the week they belong to
      if (currentDate >= targetDate) {
        return weekNumber;
      }
    }
  }

  return weekNumber;
}
