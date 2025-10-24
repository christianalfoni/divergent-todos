import { onCall, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";
import { getFirestore } from "firebase-admin/firestore";
import { getBatchJob } from "./lib/batch-jobs.js";

const ADMIN_UID = "iaSsqsqb99Zemast8LN3dGCxB7o2";

/**
 * Callable function to list recent batch jobs
 * Shows last 10 batch jobs ordered by submission time
 */
export const listBatchJobs = onCall(
  {
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (req) => {
    const db = getFirestore();
    const callerUid = req.auth?.uid;

    // Check admin access
    if (callerUid !== ADMIN_UID) {
      logger.warn("Unauthorized listBatchJobs attempt", { uid: callerUid });
      throw new HttpsError("permission-denied", "Admin access required");
    }

    logger.info("Listing batch jobs", { callerUid });

    try {
      // Query last 10 batch jobs
      const snapshot = await db
        .collection("batch_jobs")
        .orderBy("submittedAt", "desc")
        .limit(10)
        .get();

      const jobs = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: data.id,
          type: data.type,
          week: data.week,
          year: data.year,
          status: data.status,
          submittedAt: data.submittedAt?.toDate().toISOString(),
          completedAt: data.completedAt?.toDate().toISOString(),
          totalRequests: data.totalRequests,
          successCount: data.successCount,
          errorCount: data.errorCount,
        };
      });

      logger.info(`Found ${jobs.length} batch jobs`);

      return {
        success: true,
        jobs,
      };
    } catch (error) {
      logger.error("Error listing batch jobs", error);

      throw new HttpsError(
        "internal",
        `Failed to list batch jobs: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

/**
 * Callable function to get details of a specific batch job
 */
export const getBatchJobDetails = onCall(
  {
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (req) => {
    const db = getFirestore();
    const callerUid = req.auth?.uid;

    // Check admin access
    if (callerUid !== ADMIN_UID) {
      logger.warn("Unauthorized getBatchJobDetails attempt", { uid: callerUid });
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { batchId } = req.data;

    if (!batchId || typeof batchId !== "string") {
      throw new HttpsError("invalid-argument", "batchId is required");
    }

    logger.info("Getting batch job details", { batchId, callerUid });

    try {
      const job = await getBatchJob(db, batchId);

      if (!job) {
        throw new HttpsError("not-found", `Batch job ${batchId} not found`);
      }

      return {
        success: true,
        job: {
          id: job.id,
          type: job.type,
          week: job.week,
          year: job.year,
          status: job.status,
          submittedAt: job.submittedAt?.toDate().toISOString(),
          completedAt: job.completedAt?.toDate().toISOString(),
          totalRequests: job.totalRequests,
          successCount: job.successCount,
          errorCount: job.errorCount,
          errors: job.errors,
          outputFileId: job.outputFileId,
          errorFileId: job.errorFileId,
        },
      };
    } catch (error) {
      logger.error("Error getting batch job details", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      throw new HttpsError(
        "internal",
        `Failed to get batch job details: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);
