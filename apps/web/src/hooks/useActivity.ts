import { useEffect, useState, useRef } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import {
  activityWeekConverter,
  type ActivityWeek,
} from "../firebase/types/activity";
import { createAuthentication } from "./useAuthentication";

export function useActivity(year: number) {
  const [authentication] = createAuthentication();
  // Keep track of the last fetched data to avoid unnecessary re-renders
  const lastFetchRef = useRef<{
    year: number;
    userId: string;
    data: ActivityWeek[];
  } | null>(null);
  const [activityWeeks, setActivityWeeks] = useState<ActivityWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const user = authentication.user;

    if (!user) {
      setActivityWeeks([]);
      setLoading(false);
      return;
    }

    let unsubscribed = false;
    const userId = user.uid;

    async function fetchActivity() {
      try {
        // Check if we already have this data in ref (same user, same year)
        if (
          lastFetchRef.current?.userId === userId &&
          lastFetchRef.current?.year === year
        ) {
          setActivityWeeks(lastFetchRef.current.data);
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);

        const activityRef = collection(db, "activity").withConverter(
          activityWeekConverter
        );
        const q = query(
          activityRef,
          where("userId", "==", userId),
          where("year", "==", year)
        );

        const querySnapshot = await getDocs(q);
        const weeks: ActivityWeek[] = [];

        querySnapshot.forEach((doc) => {
          weeks.push(doc.data());
        });

        if (!unsubscribed) {
          setActivityWeeks(weeks);
          lastFetchRef.current = { year, userId, data: weeks };
          setLoading(false);
        }
      } catch (err) {
        if (!unsubscribed) {
          setError(
            err instanceof Error ? err : new Error("Failed to fetch activity")
          );
          setLoading(false);
        }
      }
    }

    fetchActivity();

    return () => {
      unsubscribed = true;
    };
  }, [authentication.user, year]);

  return { activityWeeks, loading, error };
}
