import { httpsCallable } from "firebase/functions";
import { functions } from "./index";

const ADMIN_UID = "iaSsqsqb99Zemast8LN3dGCxB7o2";

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

interface ListBatchJobsResult {
  success: boolean;
  jobs: Array<{
    id: string;
    type: string;
    week: number;
    year: number;
    status: string;
    submittedAt: string;
    completedAt?: string;
    totalRequests: number;
    successCount?: number;
    errorCount?: number;
  }>;
}

interface GetBatchJobDetailsParams {
  batchId: string;
}

interface GetBatchJobDetailsResult {
  success: boolean;
  job: {
    id: string;
    type: string;
    week: number;
    year: number;
    status: string;
    submittedAt: string;
    completedAt?: string;
    totalRequests: number;
    successCount?: number;
    errorCount?: number;
    errors?: Array<{ customId: string; error: string }>;
    outputFileId?: string;
    errorFileId?: string;
  };
}

interface GenerateWeekNotesParams {
  userId: string;
  week: number;
  year?: number;
}

interface WeekNote {
  title: string;
  summary: string;
  tags: string[];
}

interface GenerateWeekNotesResult {
  success: boolean;
  docId: string;
  week: number;
  year: number;
  weekStart: string;
  weekEnd: string;
  totalTodos: number;
  notes: WeekNote[];
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
     * List recent batch jobs from Firestore
     */
    async listBatchJobs(): Promise<void> {
      console.group(`🔧 Admin Script: List Batch Jobs`);
      console.log(`Fetching last 10 batch jobs...`);

      try {
        const callable = httpsCallable<void, ListBatchJobsResult>(
          functions,
          "listBatchJobs"
        );

        const result = await callable();

        console.log(`\n📋 Found ${result.data.jobs.length} batch jobs:`);
        console.table(
          result.data.jobs.map((job) => ({
            ID: job.id.substring(0, 12) + "...",
            Week: `${job.week}/${job.year}`,
            Status: job.status,
            Submitted: new Date(job.submittedAt).toLocaleString(),
            Completed: job.completedAt
              ? new Date(job.completedAt).toLocaleString()
              : "-",
            Total: job.totalRequests,
            Success: job.successCount ?? "-",
            Errors: job.errorCount ?? "-",
          }))
        );

        console.groupEnd();
      } catch (error: unknown) {
        console.error(`❌ Error:`, (error as Error).message);
        if ((error as { code?: string }).code === "permission-denied") {
          console.error(
            `This script is only available to admin UID: ${ADMIN_UID}`
          );
        }
        console.groupEnd();
        throw error;
      }
    },

    /**
     * Get detailed information about a specific batch job
     * @param batchId - OpenAI batch ID
     */
    async getBatchJobDetails(batchId: string): Promise<void> {
      console.group(`🔧 Admin Script: Get Batch Job Details`);
      console.log(`Batch ID: ${batchId}`);

      try {
        const callable = httpsCallable<
          GetBatchJobDetailsParams,
          GetBatchJobDetailsResult
        >(functions, "getBatchJobDetails");

        const result = await callable({ batchId });

        const job = result.data.job;

        console.log(`\n📄 Batch Job Details:`);
        console.log(`ID: ${job.id}`);
        console.log(`Type: ${job.type}`);
        console.log(`Week: ${job.week}, Year: ${job.year}`);
        console.log(`Status: ${job.status}`);
        console.log(`Submitted: ${new Date(job.submittedAt).toLocaleString()}`);
        if (job.completedAt) {
          console.log(
            `Completed: ${new Date(job.completedAt).toLocaleString()}`
          );
        }
        console.log(`\nRequests: ${job.totalRequests}`);
        if (job.successCount !== undefined) {
          console.log(`Success: ${job.successCount}`);
          console.log(`Errors: ${job.errorCount}`);
        }

        if (job.outputFileId) {
          console.log(`\nOutput File ID: ${job.outputFileId}`);
        }
        if (job.errorFileId) {
          console.log(`Error File ID: ${job.errorFileId}`);
        }

        if (job.errors && job.errors.length > 0) {
          console.log(`\n⚠️ Errors:`);
          job.errors.forEach((e) => {
            console.log(`  - ${e.customId}: ${e.error}`);
          });
        }

        console.groupEnd();
      } catch (error: unknown) {
        console.error(`❌ Error:`, (error as Error).message);
        if ((error as { code?: string }).code === "permission-denied") {
          console.error(
            `This script is only available to admin UID: ${ADMIN_UID}`
          );
        }
        console.groupEnd();
        throw error;
      }
    },

    /**
     * Generate AI notes for a specific user's week
     * Groups completed todos into thematic notes with tags
     * @param userId - Target user ID
     * @param week - Week number (1-53)
     * @param year - Optional year (defaults to current year)
     */
    async generateWeekNotes(
      userId: string,
      week: number,
      year?: number
    ): Promise<WeekNote[]> {
      console.group(`🔧 Admin Script: Generate Week Notes`);
      console.log(`User ID: ${userId}`);
      console.log(`Week: ${week}`);
      console.log(`Year: ${year || "current"}`);
      console.log(`Starting...`);

      try {
        const callable = httpsCallable<
          GenerateWeekNotesParams,
          GenerateWeekNotesResult
        >(functions, "generateWeekNotes");

        const result = await callable({
          userId,
          week,
          year,
        });

        console.log(`✅ Success!`);
        console.log(`\nReflection Document ID: ${result.data.docId}`);
        console.log(`Week Range: ${result.data.weekStart} to ${result.data.weekEnd}`);
        console.log(`Total Todos: ${result.data.totalTodos}`);
        console.log(`\n📝 Generated ${result.data.notes.length} notes:\n`);

        result.data.notes.forEach((note, index) => {
          console.log(`\n${index + 1}. ${note.title}`);
          console.log(`   Tags: [${note.tags.join(", ")}]`);
          console.log(`   Summary: ${note.summary}`);
        });

        console.groupEnd();
        return result.data.notes;
      } catch (error: unknown) {
        console.error(`❌ Error:`, (error as Error).message);
        if ((error as { code?: string }).code === "permission-denied") {
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
