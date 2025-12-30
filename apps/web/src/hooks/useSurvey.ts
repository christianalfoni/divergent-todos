import { useState, useEffect, useCallback } from "react";
import { posthog, type Survey } from "../posthog";
import type { Profile } from "../firebase";

interface UseSurveyOptions {
  profile: Profile | null;
  userId: string | null;
}

export function useSurvey({ userId }: UseSurveyOptions) {
  const [activeSurvey, setActiveSurvey] = useState<Survey | null>(null);
  const isDev = import.meta.env.DEV;

  // Dev mode event listener for testing
  useEffect(() => {
    if (!isDev) return;

    const handleShowSurvey = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { survey } = customEvent.detail;
      if (survey) {
        setActiveSurvey(survey);

        // Capture event (skip for mock surveys)
        if (survey.id !== "dev-mock-survey") {
          posthog.capture("survey shown", {
            $survey_id: survey.id,
            $survey_name: survey.name,
          });
        }
      }
    };

    window.addEventListener("dev:show-survey", handleShowSurvey);
    return () => window.removeEventListener("dev:show-survey", handleShowSurvey);
  }, [isDev]);

  // Production: Check PostHog for surveys when user is authenticated
  useEffect(() => {
    if (!userId) return;

    const checkSurveys = async () => {
      try {
        // PostHog evaluates all targeting rules and returns matching surveys
        const surveys = await posthog.getActiveMatchingSurveys();

        if (surveys.length > 0) {
          const survey = surveys[0];
          setActiveSurvey(survey);

          // Capture survey shown event
          posthog.capture("survey shown", {
            $survey_id: survey.id,
            $survey_name: survey.name,
          });
        }
      } catch (error) {
        console.error("[useSurvey] Failed to fetch surveys:", error);
      }
    };

    // Check 5 seconds after mount to avoid disrupting app startup
    const timer = setTimeout(checkSurveys, 5000);
    return () => clearTimeout(timer);
  }, [userId]);

  const dismissSurvey = useCallback(async () => {
    if (!activeSurvey) return;

    try {
      // Capture dismiss event (PostHog tracks this automatically)
      posthog.capture("survey dismissed", {
        $survey_id: activeSurvey.id,
        $survey_name: activeSurvey.name,
      });

      // Clear active survey
      setActiveSurvey(null);
    } catch (error) {
      console.error("[useSurvey] Failed to dismiss survey:", error);
    }
  }, [activeSurvey]);

  const submitSurvey = useCallback(
    async (response: string) => {
      if (!activeSurvey) return;

      try {
        // Format response according to PostHog requirements
        const surveyResponse = activeSurvey.questions.map((question) => ({
          key: question.question,
          value: response,
        }));

        // Capture survey sent event (PostHog tracks this automatically)
        posthog.capture("survey sent", {
          $survey_id: activeSurvey.id,
          $survey_name: activeSurvey.name,
          $survey_response: surveyResponse,
        });

        // Clear active survey
        setActiveSurvey(null);
      } catch (error) {
        console.error("[useSurvey] Failed to submit survey:", error);
      }
    },
    [activeSurvey]
  );

  return { activeSurvey, dismissSurvey, submitSurvey };
}
