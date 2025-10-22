import { useEffect, useState, useRef } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { activityWeekConverter, type ActivityWeek } from "../firebase/types/activity";
import { useAuthentication } from "./useAuthentication";

// Cache for activity data: userId-year -> ActivityWeek[]
const activityCache = new Map<string, ActivityWeek[]>();

export function useActivity(year: number) {
  const [authentication] = useAuthentication();
  const userRef = useRef(authentication.user);
  const [activityWeeks, setActivityWeeks] = useState<ActivityWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  userRef.current = authentication.user;

  useEffect(() => {
    const user = userRef.current;

    if (!user) {
      setActivityWeeks([]);
      setLoading(false);
      return;
    }

    let unsubscribed = false;
    const userId = user.uid;
    const cacheKey = `${userId}-${year}`;

    async function fetchActivity() {
      try {
        // Check cache first
        const cachedData = activityCache.get(cacheKey);
        if (cachedData) {
          // Immediately show cached data
          setActivityWeeks(cachedData);
          setLoading(false);

          // Then refetch in background
          const activityRef = collection(db, "activity").withConverter(activityWeekConverter);
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
            activityCache.set(cacheKey, weeks);
          }
        } else {
          // No cache, show loading
          setLoading(true);
          setError(null);

          const activityRef = collection(db, "activity").withConverter(activityWeekConverter);
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
            activityCache.set(cacheKey, weeks);
            setLoading(false);
          }
        }
      } catch (err) {
        if (!unsubscribed) {
          setError(err instanceof Error ? err : new Error("Failed to fetch activity"));
          setLoading(false);
        }
      }
    }

    fetchActivity();

    return () => {
      unsubscribed = true;
    };
  }, [year]);

  return { activityWeeks, loading, error };
}
