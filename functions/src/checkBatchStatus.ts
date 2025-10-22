import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions";
import { checkBatchStatus as checkStatus } from "./lib/openai-batch.js";

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const ADMIN_UID = "iaSsqsqb99Zemast8LN3dGCxB7o2";

/**
 * Callable function to check batch job status
 */
export const checkBatchStatus = onCall(
  { secrets: [OPENAI_API_KEY] },
  async (req) => {
    const callerUid = req.auth?.uid;

    // Check admin access
    if (callerUid !== ADMIN_UID) {
      logger.warn("Unauthorized checkBatchStatus attempt", { uid: callerUid });
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { batchId } = req.data;

    if (!batchId || typeof batchId !== "string") {
      throw new HttpsError("invalid-argument", "batchId is required");
    }

    logger.info("Checking batch status", { batchId, callerUid });

    try {
      const status = await checkStatus(OPENAI_API_KEY.value(), batchId);

      logger.info("Batch status retrieved", {
        batchId,
        status: status.status,
      });

      return {
        batchId,
        status: status.status,
        outputFileId: status.outputFileId,
        errorFileId: status.errorFileId,
        requestCounts: status.requestCounts,
      };
    } catch (error) {
      logger.error("Error checking batch status", { batchId, error });
      throw new HttpsError(
        "internal",
        `Failed to check batch status: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);
