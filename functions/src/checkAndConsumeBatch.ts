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
 * Scheduled function that runs multiple times on Saturday and Sunday
 * Checks for pending batch jobs and consumes completed ones
 *
 * Runs every 3 hours starting Saturday 3am through Sunday 9pm (24+ hour window)
 * to handle OpenAI's up-to-24-hour batch processing time
 */
export const checkAndConsumeBatch = onSchedule(
  {
    schedule: "0 3,6,9,12,15,18,21 * * 6,0", // Saturday & Sunday every 3 hours UTC
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
