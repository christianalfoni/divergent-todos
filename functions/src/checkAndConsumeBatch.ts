import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { Resend } from "resend";
import {
  checkBatchStatus,
  downloadBatchOutput,
  parseBatchResponse,
} from "./lib/openai-batch.js";
import { getTodosForWeek, getWeekDateRange } from "./lib/activity-data.js";
import {
  getPendingBatchJobs,
  updateBatchJobStatus,
  completeBatchJob,
  failBatchJob,
  cleanupOldBatchJobs,
} from "./lib/batch-jobs.js";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

/**
 * Send success notification email
 */
async function sendSuccessEmail(
  resendApiKey: string,
  batchId: string,
  week: number,
  year: number,
  successCount: number,
  errorCount: number,
  errors?: Array<{ customId: string; error: string }>
): Promise<void> {
  try {
    const resend = new Resend(resendApiKey);

    const errorSection = errors && errors.length > 0
      ? `
        <h3>⚠️ Errors (${errorCount}):</h3>
        <ul>
          ${errors.map(e => `<li><strong>${e.customId}</strong>: ${e.error}</li>`).join("")}
        </ul>
      `
      : "";

    await resend.emails.send({
      from: "post@divergent-todos.com",
      to: "christianalfoni@gmail.com",
      subject: `[Divergent Todos] ✅ Weekly Summary Batch Completed`,
      html: `
        <h2>✅ Weekly Summary Batch Successfully Consumed</h2>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Batch ID:</strong> ${batchId}</p>
        <p><strong>Week:</strong> ${week}, ${year}</p>
        <hr>
        <h3>Results:</h3>
        <p>✓ <strong>Success:</strong> ${successCount} users</p>
        <p>✗ <strong>Errors:</strong> ${errorCount} users</p>
        ${errorSection}
      `,
    });
    logger.info("Success notification email sent");
  } catch (emailError) {
    logger.error("Failed to send success notification email", emailError);
  }
}

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
        <h2>Weekly Summary Batch Error</h2>
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
 * Send attempt notification email
 */
async function sendAttemptEmail(
  resendApiKey: string,
  pendingJobCount: number,
  scheduledTime: string
): Promise<void> {
  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "post@divergent-todos.com",
      to: "christianalfoni@gmail.com",
      subject: `[Divergent Todos] 🔍 Checking for Batch Results`,
      html: `
        <h2>🔍 Batch Check Started</h2>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Scheduled Time:</strong> ${scheduledTime}</p>
        <p><strong>Pending Batches Found:</strong> ${pendingJobCount}</p>
        <hr>
        ${pendingJobCount > 0
          ? `<p>Checking status of ${pendingJobCount} pending batch job(s)...</p>`
          : `<p>No pending batch jobs to check.</p>`
        }
      `,
    });
    logger.info("Attempt notification email sent");
  } catch (emailError) {
    logger.error("Failed to send attempt notification email", emailError);
  }
}

/**
 * Send still processing notification email
 */
async function sendStillProcessingEmail(
  resendApiKey: string,
  batchId: string,
  status: string,
  week: number,
  year: number
): Promise<void> {
  try {
    const resend = new Resend(resendApiKey);
    await resend.emails.send({
      from: "post@divergent-todos.com",
      to: "christianalfoni@gmail.com",
      subject: `[Divergent Todos] ⏳ Batch Still Processing`,
      html: `
        <h2>⏳ Batch Still Processing</h2>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Batch ID:</strong> ${batchId}</p>
        <p><strong>Week:</strong> ${week}, ${year}</p>
        <p><strong>OpenAI Status:</strong> ${status}</p>
        <hr>
        <p>The batch is still being processed by OpenAI. Will check again in 3 hours.</p>
      `,
    });
    logger.info("Still processing notification email sent");
  } catch (emailError) {
    logger.error("Failed to send still processing notification email", emailError);
  }
}

/**
 * Scheduled function that runs multiple times on Saturday and Sunday
 * Checks for pending batch jobs and consumes completed ones
 *
 * Batch is created Saturday 6pm UTC (18:00)
 * First check is Saturday 9pm UTC (21:00) - 3 hours after submission
 * Continues checking every 3 hours through Sunday 9pm (30 hour window total)
 *
 * Cron Schedule: Saturday & Sunday at 12am, 3am, 9am, 12pm, 3pm, 9pm UTC
 * Guard: Skips execution on Saturday before 21:00 (batch not created yet)
 */
export const checkAndConsumeBatch = onSchedule(
  {
    schedule: "0 0,3,9,12,15,21 * * 6,0", // Sat & Sun every 3 hours (excluding 6pm) UTC
    timeZone: "UTC",
    secrets: [OPENAI_API_KEY, RESEND_API_KEY],
    memory: "512MiB",
    timeoutSeconds: 300, // 5 minutes
  },
  async (event) => {
    const db = getFirestore();

    logger.info("Starting batch check and consume cycle", {
      scheduledTime: event.scheduleTime,
    });

    // Skip execution on Saturday before 21:00 UTC (batch is created at 18:00, first check at 21:00)
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const hourUTC = now.getUTCHours();

    if (dayOfWeek === 6 && hourUTC < 21) {
      logger.info("Skipping check on Saturday before 21:00 UTC (batch not created yet)", {
        dayOfWeek,
        hourUTC,
      });
      return;
    }

    try {
      // Step 1: Get pending batch jobs from Firestore
      const pendingJobs = await getPendingBatchJobs(db);

      if (pendingJobs.length === 0) {
        logger.info("No pending batch jobs found");
        // Clean up old completed jobs
        const cleanedUp = await cleanupOldBatchJobs(db);
        if (cleanedUp > 0) {
          logger.info(`Cleaned up ${cleanedUp} old batch jobs`);
        }
        return;
      }

      // Send email notification about the check attempt
      await sendAttemptEmail(
        RESEND_API_KEY.value(),
        pendingJobs.length,
        event.scheduleTime
      );

      logger.info(`Found ${pendingJobs.length} pending batch job(s)`);

      // Step 2: Process each pending batch
      for (const job of pendingJobs) {
        logger.info(`Checking batch ${job.id}`, {
          status: job.status,
          week: job.week,
          year: job.year,
        });

        try {
          // Check OpenAI status
          const status = await checkBatchStatus(OPENAI_API_KEY.value(), job.id);

          logger.info(`Batch status from OpenAI`, {
            batchId: job.id,
            status: status.status,
          });

          if (status.status === "completed" && status.outputFileId) {
            // Batch completed! Download and consume
            logger.info(`Batch ${job.id} completed, downloading results...`);

            // Update status in Firestore
            await updateBatchJobStatus(
              db,
              job.id,
              "processing",
              status.outputFileId,
              status.errorFileId
            );

            // Download results
            const outputContent = await downloadBatchOutput(
              OPENAI_API_KEY.value(),
              status.outputFileId
            );

            const results = parseBatchResponse(outputContent);
            logger.info(`Parsed ${results.size} results`);

            // Write results to Firestore
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
                logger.info(`✓ Successfully wrote reflection for ${customId}`);
              } catch (error) {
                const errorMsg = error instanceof Error ? error.message : String(error);
                logger.error(`✗ Failed to write activity for ${customId}`, error);
                errors.push({ customId, error: errorMsg });
                errorCount++;
              }
            }

            // Mark batch as completed in Firestore
            await completeBatchJob(db, job.id, successCount, errorCount, errors);

            logger.info("✅ Batch processing completed successfully", {
              batchId: job.id,
              week: job.week,
              year: job.year,
              successCount,
              errorCount,
            });

            // Send success email
            await sendSuccessEmail(
              RESEND_API_KEY.value(),
              job.id,
              job.week,
              job.year,
              successCount,
              errorCount,
              errors.length > 0 ? errors : undefined
            );
          } else if (status.status === "failed" || status.status === "cancelled") {
            // Batch failed
            logger.error(`Batch ${job.id} ${status.status}`);
            await failBatchJob(db, job.id, `OpenAI batch ${status.status}`);

            await sendErrorEmail(
              RESEND_API_KEY.value(),
              `Batch Job ${status.status}`,
              `Batch ID: ${job.id}\nWeek: ${job.week}, ${job.year}\nStatus: ${status.status}`
            );
          } else {
            // Still processing (validating or in_progress)
            logger.info(`Batch ${job.id} still processing`, {
              status: status.status,
            });

            // Send email notification that batch is still processing
            await sendStillProcessingEmail(
              RESEND_API_KEY.value(),
              job.id,
              status.status,
              job.week,
              job.year
            );

            // Update status in Firestore if it changed
            if (status.status !== job.status) {
              await updateBatchJobStatus(db, job.id, status.status as any);
            }
          }
        } catch (error) {
          logger.error(`Error processing batch ${job.id}`, error);
          // Don't mark as failed yet - might be transient error
          // Will retry on next scheduled run
        }
      }

      // Clean up old completed jobs
      const cleanedUp = await cleanupOldBatchJobs(db);
      if (cleanedUp > 0) {
        logger.info(`Cleaned up ${cleanedUp} old batch jobs`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : "";

      logger.error("Error in checkAndConsumeBatch", {
        error: errorMessage,
        stack: errorStack,
      });

      // Send error notification email
      await sendErrorEmail(
        RESEND_API_KEY.value(),
        "Batch Check/Consume Failed",
        `Error: ${errorMessage}\n\nStack trace:\n${errorStack}`
      );

      throw error;
    }
  }
);
