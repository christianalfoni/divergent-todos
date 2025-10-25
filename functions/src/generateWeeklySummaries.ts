import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";
import { Resend } from "resend";
import {
  getTodosForWeek,
  getUsersWithActiveSubscription,
  getPreviousWeekSummary,
  getUserAccountCreationDate,
} from "./lib/activity-data.js";
import {
  createBatchRequest,
  batchRequestsToJsonl,
  submitBatchJob,
} from "./lib/openai-batch.js";
import { createBatchJob } from "./lib/batch-jobs.js";

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
 * Scheduled function that runs every Saturday at 6pm UTC
 * Submits batch job to OpenAI for AI summary generation (no polling)
 *
 * Why 6pm UTC?
 * - Ensures Friday has ended in ALL timezones (including UTC-12)
 * - At 6pm UTC Saturday, it's already Saturday everywhere:
 *   - UTC-12 (Baker Island): Saturday 6am
 *   - UTC-10 (Hawaii): Saturday 8am
 *   - UTC-8 (Pacific): Saturday 10am
 * - Gives users in western timezones full Friday workday + evening
 *   to complete their todos before weekly summary generation
 */
export const generateWeeklySummaries = onSchedule(
  {
    schedule: "0 18 * * 6", // 6pm every Saturday (cron format)
    timeZone: "UTC",
    secrets: [OPENAI_API_KEY, RESEND_API_KEY],
    memory: "512MiB",
    timeoutSeconds: 120, // Only need 2 minutes to submit
  },
  async (event) => {
    const db = getFirestore();
    const now = new Date();
    const currentYear = now.getFullYear();

    // Calculate previous week number
    const previousWeek = getCurrentWeek(now) - 1;
    const targetYear = previousWeek < 1 ? currentYear - 1 : currentYear;
    const targetWeek = previousWeek < 1 ? 52 : previousWeek;

    logger.info("Starting weekly summary batch submission", {
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
            // Get previous week's summary for continuity
            const previousWeekSummary = await getPreviousWeekSummary(
              db,
              userId,
              targetWeek,
              targetYear
            );

            // Get user's account creation date
            const accountCreationDate = await getUserAccountCreationDate(userId);

            const request = createBatchRequest(
              userId,
              completedTodos,
              incompleteTodos,
              targetWeek,
              targetYear,
              previousWeekSummary,
              accountCreationDate
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

      logger.info(`✅ Batch job submitted successfully`, { batchId });

      // Step 4: Save batch job to Firestore for tracking
      await createBatchJob(db, batchId, targetWeek, targetYear, batchRequests.length);

      logger.info("Batch job saved to Firestore", {
        batchId,
        week: targetWeek,
        year: targetYear,
        totalRequests: batchRequests.length,
      });

      // Send confirmation email
      const resend = new Resend(RESEND_API_KEY.value());
      await resend.emails.send({
        from: "post@divergent-todos.com",
        to: "christianalfoni@gmail.com",
        subject: "[Divergent Todos] Weekly Summary Batch Submitted",
        html: `
          <h2>✅ Weekly Summary Batch Submitted</h2>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Batch ID:</strong> ${batchId}</p>
          <p><strong>Week:</strong> ${targetWeek}, ${targetYear}</p>
          <p><strong>Total Users:</strong> ${userIds.length}</p>
          <p><strong>Batch Requests:</strong> ${batchRequests.length}</p>
          <hr>
          <p>The batch will be automatically checked and consumed by the scheduled check function.</p>
        `,
      });

      logger.info("Confirmation email sent");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : "";

      logger.error("Error in generateWeeklySummaries", {
        error: errorMessage,
        stack: errorStack,
      });

      // Send error notification email
      await sendErrorEmail(
        RESEND_API_KEY.value(),
        "Weekly Summary Batch Submission Failed",
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
