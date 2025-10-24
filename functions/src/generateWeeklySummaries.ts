import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { Resend } from "resend";
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
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

/**
 * Send error notification email
 */
async function sendErrorEmail(
  resendApiKey: string,
  subject: string,
  errorDetails: string
): Promise<void> {
  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "post@divergent-todos.com",
      to: "christianalfoni@gmail.com",
      subject: `[Divergent Todos] ${subject}`,
      html: `
        <h2>Weekly Summary Generation Error</h2>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <h3>Error Details:</h3>
        <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto;">${errorDetails}</pre>
      `,
    });
    logger.info("Error notification email sent");
  } catch (emailError) {
    logger.error("Failed to send error notification email", emailError);
  }
}

/**
 * Scheduled function that runs every Saturday at 2am UTC
 * Generates AI summaries for all users with activity in the previous week
 */
export const generateWeeklySummaries = onSchedule(
  {
    schedule: "0 2 * * 6", // 2am every Saturday (cron format)
    timeZone: "UTC",
    secrets: [OPENAI_API_KEY, RESEND_API_KEY],
    memory: "512MiB",
    timeoutSeconds: 540, // 9 minutes (max for 2nd gen)
  },
  async (event) => {
    const db = getFirestore();
    const now = new Date();
    const currentYear = now.getFullYear();

    // Calculate previous week number
    // For simplicity, we'll use a helper to get current week and subtract 1
    const previousWeek = getCurrentWeek(now) - 1;
    const targetYear = previousWeek < 1 ? currentYear - 1 : currentYear;
    const targetWeek = previousWeek < 1 ? 52 : previousWeek;

    logger.info("Starting weekly summary generation", {
      targetYear,
      targetWeek,
      scheduledTime: event.scheduleTime,
    });

    try {
      // Step 1: Get all users with active subscriptions
      logger.info("Fetching users with active subscriptions...");
      const userIds = await getUsersWithActiveSubscription(db);

      if (userIds.length === 0) {
        logger.info("No users with active subscriptions found");
        return;
      }

      logger.info(`Found ${userIds.length} users with active subscriptions`);

      // Step 2: Build batch requests for all users
      logger.info("Building batch requests...");
      const batchRequests = [];

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
          }
        } catch (error) {
          logger.error(`Failed to build request for user ${userId}`, error);
          // Continue with other users
        }
      }

      if (batchRequests.length === 0) {
        logger.info("No batch requests to submit");
        return;
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
                  incompleteCount: incompleteTodos.length,
                  aiSummary: result.formalSummary,
                  aiPersonalSummary: result.personalSummary,
                  aiSummaryGeneratedAt: Timestamp.now(),
                  updatedAt: Timestamp.now(),
                });

              successCount++;
              logger.info(`✓ Successfully wrote activity for ${customId}`);
            } catch (error) {
              const errorMsg = error instanceof Error ? error.message : String(error);
              logger.error(`✗ Failed to write activity for ${customId}`, error);
              errors.push({ customId, error: errorMsg });
              errorCount++;
            }
          }

          logger.info("✅ Batch processing completed successfully", {
            targetWeek,
            targetYear,
            totalUsers: batchRequests.length,
            successCount,
            errorCount,
            batchId,
          });

          // Send notification if there were any errors
          if (errorCount > 0) {
            const errorSummary = errors.map(e => `${e.customId}: ${e.error}`).join("\n");
            await sendErrorEmail(
              RESEND_API_KEY.value(),
              `Weekly Summary: ${errorCount} Errors`,
              `Successfully processed ${successCount} users, but encountered ${errorCount} errors:\n\n${errorSummary}`
            );
          }

          return;
        } else if (status.status === "failed" || status.status === "cancelled") {
          const errorMsg = `Batch job ${status.status}. Batch ID: ${batchId}`;
          logger.error("Batch job failed or cancelled", {
            status: status.status,
            batchId,
          });

          await sendErrorEmail(
            RESEND_API_KEY.value(),
            `Batch Job ${status.status}`,
            errorMsg
          );
          return;
        }
        // Otherwise status is "validating" or "in_progress", continue polling
      }

      // Timeout reached - send notification
      const timeoutMessage = `Batch polling timeout reached after ${pollCount} polls.\nBatch ID: ${batchId}\nWeek: ${targetWeek}, Year: ${targetYear}\nBatch is still processing. Check OpenAI dashboard.`;

      logger.warn("Batch polling timeout reached", {
        batchId,
        pollCount,
        targetWeek,
        targetYear,
      });

      await sendErrorEmail(
        RESEND_API_KEY.value(),
        "Batch Processing Timeout",
        timeoutMessage
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : "";

      logger.error("Error in generateWeeklySummaries", {
        error: errorMessage,
        stack: errorStack,
        targetWeek,
        targetYear,
      });

      // Send error notification email
      await sendErrorEmail(
        RESEND_API_KEY.value(),
        "Weekly Summary Generation Failed",
        `Error: ${errorMessage}\n\nStack trace:\n${errorStack}`
      );

      throw error;
    }
  }
);

/**
 * Calculate current week number (sequential 1-52)
 */
function getCurrentWeek(date: Date): number {
  const year = date.getFullYear();
  let weekNumber = 0;

  for (let m = 0; m < 12; m++) {
    const daysInMonth = new Date(year, m + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, m, day);
      const dayOfWeek = currentDate.getDay();

      // Skip weekends
      if (dayOfWeek === 0 || dayOfWeek === 6) continue;

      // Start of new week (Monday)
      if (dayOfWeek === 1) {
        weekNumber++;
      }

      // Check if this is the target date
      if (
        currentDate.getFullYear() === date.getFullYear() &&
        currentDate.getMonth() === date.getMonth() &&
        currentDate.getDate() === date.getDate()
      ) {
        return weekNumber;
      }
    }
  }

  return weekNumber;
}
