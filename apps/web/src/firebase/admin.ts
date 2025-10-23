import { httpsCallable } from "firebase/functions";
import { functions } from "./index";

const ADMIN_UID = "iaSsqsqb99Zemast8LN3dGCxB7o2";

interface GenerateWeekSummaryParams {
  userId: string;
  week: number;
  year?: number;
}

interface GenerateWeekSummaryResult {
  success: boolean;
  docId: string;
  weekStart: string;
  weekEnd: string;
  totalTodos: number;
  formalSummary: string;
  personalSummary: string;
}

interface TriggerWeeklySummariesParams {
  week?: number;
  year?: number;
}

interface TriggerWeeklySummariesResult {
  success: boolean;
  batchId?: string;
  week: number;
  year: number;
  totalUsers: number;
  requestsSubmitted: number;
  successCount?: number;
  errorCount?: number;
  skippedUsers?: string[];
  errors?: Array<{ customId: string; error: string }>;
  message?: string;
}

interface CheckBatchStatusParams {
  batchId: string;
}

interface CheckBatchStatusResult {
  batchId: string;
  status: string;
  outputFileId?: string;
  errorFileId?: string;
  requestCounts?: {
    total: number;
    completed: number;
    failed: number;
  };
}

interface ConsumeBatchParams {
  batchId: string;
}

interface ConsumeBatchResult {
  success: boolean;
  batchId: string;
  successCount: number;
  errorCount: number;
  errors?: Array<{ customId: string; error: string }>;
}

/**
 * Global admin object for running privileged scripts
 * Only accessible to admin UID: iaSsqsqb99Zemast8LN3dGCxB7o2
 */
export const admin = {
  scripts: {
    /**
     * Trigger batch AI summary generation for all users (scheduled function simulation)
     * @param week - Optional week number (1-53), defaults to previous week
     * @param year - Optional year, defaults to current year
     */
    async triggerWeeklySummaries(
      week?: number,
      year?: number
    ): Promise<void> {
      console.group(`🔧 Admin Script: Trigger Weekly Summaries (Batch)`);
      console.log(`Week: ${week || "previous week (auto)"}`);
      console.log(`Year: ${year || "current"}`);
      console.log(`Starting batch processing...`);

      try {
        const callable = httpsCallable<
          TriggerWeeklySummariesParams,
          TriggerWeeklySummariesResult
        >(functions, "triggerWeeklySummaries");

        const result = await callable({ week, year });

        console.log(`✅ Batch job completed!`);
        console.log(`\nWeek: ${result.data.week}, Year: ${result.data.year}`);
        console.log(`Total Users: ${result.data.totalUsers}`);
        console.log(`Batch Requests Submitted: ${result.data.requestsSubmitted}`);

        if (result.data.batchId) {
          console.log(`\nOpenAI Batch ID: ${result.data.batchId}`);
        }

        if (result.data.successCount !== undefined) {
          console.log(`\n✓ Success: ${result.data.successCount}`);
          console.log(`✗ Errors: ${result.data.errorCount}`);
        }

        if (result.data.skippedUsers && result.data.skippedUsers.length > 0) {
          console.log(`\nSkipped Users (no todos): ${result.data.skippedUsers.length}`);
        }

        if (result.data.errors && result.data.errors.length > 0) {
          console.log(`\nErrors:`);
          result.data.errors.forEach(e => {
            console.log(`  - ${e.customId}: ${e.error}`);
          });
        }

        if (result.data.message) {
          console.log(`\nNote: ${result.data.message}`);
        }

        console.groupEnd();
      } catch (error: any) {
        console.error(`❌ Error:`, error.message);
        if (error.code === "permission-denied") {
          console.error(
            `This script is only available to admin UID: ${ADMIN_UID}`
          );
        }
        console.groupEnd();
        throw error;
      }
    },

    /**
     * Check the status of a batch job
     * @param batchId - OpenAI batch ID from triggerWeeklySummaries
     */
    async checkBatchStatus(batchId: string): Promise<void> {
      console.group(`🔧 Admin Script: Check Batch Status`);
      console.log(`Batch ID: ${batchId}`);

      try {
        const callable = httpsCallable<
          CheckBatchStatusParams,
          CheckBatchStatusResult
        >(functions, "checkBatchStatus");

        const result = await callable({ batchId });

        console.log(`\n📊 Status: ${result.data.status}`);
        console.log(`Batch ID: ${result.data.batchId}`);

        if (result.data.requestCounts) {
          console.log(`\nProgress:`);
          console.log(`  Total: ${result.data.requestCounts.total}`);
          console.log(`  Completed: ${result.data.requestCounts.completed}`);
          console.log(`  Failed: ${result.data.requestCounts.failed}`);
        }

        if (result.data.outputFileId) {
          console.log(`\n✅ Output File: ${result.data.outputFileId}`);
          console.log(`\n💡 Batch is ready! Use admin.scripts.consumeBatch("${batchId}") to process results.`);
        } else if (result.data.status === "in_progress" || result.data.status === "validating") {
          console.log(`\n⏳ Batch is still processing. Check again in a few minutes.`);
        } else if (result.data.status === "failed") {
          console.log(`\n❌ Batch failed.`);
          if (result.data.errorFileId) {
            console.log(`Error File: ${result.data.errorFileId}`);
          }
        }

        console.groupEnd();
      } catch (error: any) {
        console.error(`❌ Error:`, error.message);
        if (error.code === "permission-denied") {
          console.error(
            `This script is only available to admin UID: ${ADMIN_UID}`
          );
        }
        console.groupEnd();
        throw error;
      }
    },

    /**
     * Consume a completed batch job and write results to Firestore
     * @param batchId - OpenAI batch ID from triggerWeeklySummaries
     */
    async consumeBatch(batchId: string): Promise<void> {
      console.group(`🔧 Admin Script: Consume Batch Results`);
      console.log(`Batch ID: ${batchId}`);
      console.log(`Downloading and processing results...`);

      try {
        const callable = httpsCallable<
          ConsumeBatchParams,
          ConsumeBatchResult
        >(functions, "consumeBatch");

        const result = await callable({ batchId });

        console.log(`\n✅ Batch consumed successfully!`);
        console.log(`\n✓ Success: ${result.data.successCount}`);
        console.log(`✗ Errors: ${result.data.errorCount}`);

        if (result.data.errors && result.data.errors.length > 0) {
          console.log(`\nErrors:`);
          result.data.errors.forEach(e => {
            console.log(`  - ${e.customId}: ${e.error}`);
          });
        }

        console.groupEnd();
      } catch (error: any) {
        console.error(`❌ Error:`, error.message);
        if (error.code === "permission-denied") {
          console.error(
            `This script is only available to admin UID: ${ADMIN_UID}`
          );
        }
        console.groupEnd();
        throw error;
      }
    },

    /**
     * Generate AI summaries for a specific user's week (single user)
     * @param userId - Target user ID
     * @param week - Week number (1-53)
     * @param year - Optional year (defaults to current year)
     */
    async generateWeekSummary(
      userId: string,
      week: number,
      year?: number
    ): Promise<void> {
      console.group(`🔧 Admin Script: Generate Week Summary`);
      console.log(`User ID: ${userId}`);
      console.log(`Week: ${week}`);
      console.log(`Year: ${year || "current"}`);
      console.log(`Starting...`);

      try {
        const callable = httpsCallable<
          GenerateWeekSummaryParams,
          GenerateWeekSummaryResult
        >(functions, "generateWeekSummary");

        const result = await callable({
          userId,
          week,
          year,
        });

        console.log(`✅ Success!`);
        console.log(`\nActivity Document ID: ${result.data.docId}`);
        console.log(`Week Range: ${result.data.weekStart} to ${result.data.weekEnd}`);
        console.log(`Total Todos: ${result.data.totalTodos}`);
        console.log(`\nFormal Summary:`);
        console.log(result.data.formalSummary);
        console.log(`\nPersonal Summary:`);
        console.log(result.data.personalSummary);
        console.groupEnd();
      } catch (error: any) {
        console.error(`❌ Error:`, error.message);
        if (error.code === "permission-denied") {
          console.error(
            `This script is only available to admin UID: ${ADMIN_UID}`
          );
        }
        console.groupEnd();
        throw error;
      }
    },
  },
};

// Expose to window for console access
declare global {
  interface Window {
    admin: typeof admin;
  }
}

if (typeof window !== "undefined") {
  window.admin = admin;
  console.log("💡 Admin tools loaded. Use window.admin.scripts to access admin functions.");
}
