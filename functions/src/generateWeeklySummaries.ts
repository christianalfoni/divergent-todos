import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";
import { Resend } from "resend";
import {
  getTodosForWeek,
  getUsersWithActiveSubscription,
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
        <h2>Weekly Reflections Generation Error</h2>
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
 * Send no-op notification email (when batch wasn't created)
 */
async function sendNoOpEmail(
  resendApiKey: string,
  reason: string,
  week: number,
  year: number,
  details: string
): Promise<void> {
  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "post@divergent-todos.com",
      to: "christianalfoni@gmail.com",
      subject: `[Divergent Todos] ⚠️ No Batch Created`,
      html: `
        <h2>⚠️ Weekly Reflections Batch NOT Created</h2>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Week:</strong> ${week}, ${year}</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <hr>
        <h3>Details:</h3>
        <pre style="background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto;">${details}</pre>
      `,
    });
    logger.info("No-op notification email sent");
  } catch (emailError) {
    logger.error("Failed to send no-op notification email", emailError);
  }
}

/**
 * Scheduled function that runs every Saturday at 6pm UTC
 * Submits batch job to OpenAI for AI notes generation (no polling)
 *
 * Why 6pm UTC?
 * - Ensures Friday has ended in ALL timezones (including UTC-12)
 * - At 6pm UTC Saturday, it's already Saturday everywhere:
 *   - UTC-12 (Baker Island): Saturday 6am
 *   - UTC-10 (Hawaii): Saturday 8am
 *   - UTC-8 (Pacific): Saturday 10am
 * - Gives users in western timezones full Friday workday + evening
 *   to complete their todos before weekly reflection generation
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

    logger.info("Starting weekly reflections batch submission", {
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
        await sendNoOpEmail(
          RESEND_API_KEY.value(),
          "No Active Subscribers",
          targetWeek,
          targetYear,
          "No users with active subscriptions were found in the database.\n\nQuery: profiles collection where subscription.status === 'active'"
        );
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
        await sendNoOpEmail(
          RESEND_API_KEY.value(),
          "No Completed Todos",
          targetWeek,
          targetYear,
          `Found ${userIds.length} active subscribers, but NONE had completed todos for Week ${targetWeek}.\n\nAll users were skipped because they had 0 completed todos for the target week.`
        );
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
        subject: "[Divergent Todos] Weekly Reflections Batch Submitted",
        html: `
          <h2>✅ Weekly Reflections Batch Submitted</h2>
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
        "Weekly Reflections Batch Submission Failed",
        `Error: ${errorMessage}\n\nStack trace:\n${errorStack}`
      );

      throw error;
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
