import { httpsCallable } from "firebase/functions";
import { functions } from "./index";

const ADMIN_UID = "iaSsqsqb99Zemast8LN3dGCxB7o2";

interface GenerateWeekSummaryParams {
  userId: string;
  week: number;
  year?: number;
  customAnalysisInstructions?: string;
}

interface GenerateWeekSummaryResult {
  success: boolean;
  docId: string;
  weekStart: string;
  weekEnd: string;
  totalTodos: number;
  formalSummary: string;
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

interface GetSummaryDataParams {
  userId: string;
  week: number;
  year?: number;
}

interface CompletedTodo {
  date: string;
  text: string;
  createdAt: string;
  completedAt: string;
  moveCount: number;
  completedWithTimeBox: boolean;
  hasUrl: boolean;
  tags: string[];
}

interface IncompleteTodo {
  date: string;
  text: string;
  createdAt: string;
  moveCount: number;
  hasUrl: boolean;
  tags: string[];
}

interface GetSummaryDataResult {
  success: boolean;
  week: number;
  year: number;
  weekStart: string;
  weekEnd: string;
  completedTodos: CompletedTodo[];
  incompleteTodos: IncompleteTodo[];
  previousWeekSummary: string | null;
  accountCreationDate: string | null;
  fullPrompt: string; // The complete formatted prompt with data and instructions
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
     * Get all summary data for a specific user's week (for testing prompts)
     * Returns the raw data (todos, previous summary, etc.) AND the formatted prompt
     * The fullPrompt field shows exactly what gets sent to OpenAI, so you can experiment with different instructions
     * @param userId - Target user ID
     * @param week - Week number (1-53)
     * @param year - Optional year (defaults to current year)
     */
    async getSummaryData(
      userId: string,
      week: number,
      year?: number
    ): Promise<GetSummaryDataResult> {
      console.group(`🔧 Admin Script: Get Summary Data`);
      console.log(`User ID: ${userId}`);
      console.log(`Week: ${week}`);
      console.log(`Year: ${year || "current"}`);
      console.log(`Fetching data...`);

      try {
        const callable = httpsCallable<
          GetSummaryDataParams,
          GetSummaryDataResult
        >(functions, "getSummaryData");

        const result = await callable({
          userId,
          week,
          year,
        });

        console.log(`✅ Data retrieved successfully!`);
        console.log(`\nWeek Range: ${result.data.weekStart} to ${result.data.weekEnd}`);
        console.log(`Completed Todos: ${result.data.completedTodos.length}`);
        console.log(`Incomplete Todos: ${result.data.incompleteTodos.length}`);
        console.log(`Has Previous Week Summary: ${!!result.data.previousWeekSummary}`);
        console.log(`Account Creation Date: ${result.data.accountCreationDate || "N/A"}`);

        console.log(`\n📊 Summary of completed todos:`);
        const tagCounts = result.data.completedTodos.reduce((acc, todo) => {
          todo.tags.forEach(tag => {
            acc[tag] = (acc[tag] || 0) + 1;
          });
          return acc;
        }, {} as Record<string, number>);
        if (Object.keys(tagCounts).length > 0) {
          console.log(`Tags:`, tagCounts);
        }

        const focusedSessions = result.data.completedTodos.filter(t => t.completedWithTimeBox).length;
        console.log(`Focused sessions: ${focusedSessions}`);

        const withUrls = result.data.completedTodos.filter(t => t.hasUrl).length;
        console.log(`Todos with URLs: ${withUrls}`);

        console.log(`\n📝 Full Prompt (${result.data.fullPrompt.length} chars):`);
        console.log(`\n${result.data.fullPrompt}`);

        console.groupEnd();

        return result.data;
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
     * Generate AI summaries for a specific user's week (single user)
     * @param userId - Target user ID
     * @param week - Week number (1-53)
     * @param year - Optional year (defaults to current year)
     * @param customAnalysisInstructions - Optional custom analysis instructions to override the default
     */
    async generateWeekSummary(
      userId: string,
      week: number,
      year?: number,
      customAnalysisInstructions?: string
    ): Promise<void> {
      console.group(`🔧 Admin Script: Generate Week Summary`);
      console.log(`User ID: ${userId}`);
      console.log(`Week: ${week}`);
      console.log(`Year: ${year || "current"}`);
      if (customAnalysisInstructions) {
        console.log(`Custom Instructions: ${customAnalysisInstructions.substring(0, 100)}...`);
      }
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
          customAnalysisInstructions,
        });

        console.log(`✅ Success!`);
        console.log(`\nActivity Document ID: ${result.data.docId}`);
        console.log(`Week Range: ${result.data.weekStart} to ${result.data.weekEnd}`);
        console.log(`Total Todos: ${result.data.totalTodos}`);
        console.log(`\nAttention Reflection Summary:`);
        console.log(result.data.formalSummary);
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
