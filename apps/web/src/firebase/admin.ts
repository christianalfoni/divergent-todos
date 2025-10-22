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

/**
 * Global admin object for running privileged scripts
 * Only accessible to admin UID: iaSsqsqb99Zemast8LN3dGCxB7o2
 */
export const admin = {
  scripts: {
    /**
     * Generate AI summaries for a specific week's activity
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
