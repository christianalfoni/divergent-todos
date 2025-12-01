import { createContext, useDerived, useState, useView } from "rask-ui";
import {
  trackOnboardingStarted,
  trackOnboardingStepCompleted,
  trackOnboardingCompleted,
  trackOnboardingSkipped,
} from "../firebase/analytics";

export type OnboardingStep =
  | "workdays"
  | "add-todo"
  | "add-todo-with-tag"
  | "add-todo-with-url"
  | "edit-todo"
  | "move-todo"
  | "delete-todo"
  | "timebox"
  | "congratulations"
  | null;

const ONBOARDING_STEPS: OnboardingStep[] = [
  "workdays",
  "add-todo",
  "add-todo-with-tag",
  "add-todo-with-url",
  "edit-todo",
  "move-todo",
  "delete-todo",
  "timebox",
  "congratulations",
];

export const OnboardingContext = createContext(() => {
  const state = useState({
    currentStep: null as OnboardingStep | null,
  });
  const derived = useDerived({
    isOnboarding: () => state.currentStep !== null,
    currentStepIndex: () =>
      state.currentStep ? ONBOARDING_STEPS.indexOf(state.currentStep) : -1,
  });
  const totalSteps = ONBOARDING_STEPS.length;

  const startOnboarding = () => {
    trackOnboardingStarted();
    state.currentStep = ONBOARDING_STEPS[0];
  };

  const nextStep = () => {
    const currentIndex = ONBOARDING_STEPS.indexOf(state.currentStep!);

    // Track step completion before advancing
    if (state.currentStep) {
      trackOnboardingStepCompleted(state.currentStep);
    }

    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      state.currentStep = ONBOARDING_STEPS[currentIndex + 1];
    } else {
      state.currentStep = null;
    }
  };

  const previousStep = () => {
    const currentIndex = ONBOARDING_STEPS.indexOf(state.currentStep!);
    if (currentIndex > 0) {
      state.currentStep = ONBOARDING_STEPS[currentIndex - 1];
    }
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < ONBOARDING_STEPS.length) {
      state.currentStep = ONBOARDING_STEPS[stepIndex];
    }
  };

  const completeOnboarding = () => {
    // Track if onboarding was skipped or completed
    if (state.currentStep === "congratulations") {
      trackOnboardingCompleted();
    } else if (state.currentStep) {
      trackOnboardingSkipped(state.currentStep);
    }

    state.currentStep = null;
  };

  const notifyTodoAdded = () => {
    if (state.currentStep === "add-todo") {
      nextStep();
    }
  };

  const notifyTodoAddedWithTag = () => {
    if (state.currentStep === "add-todo-with-tag") {
      nextStep();
    }
  };

  const notifyTodoAddedWithUrl = () => {
    if (state.currentStep === "add-todo-with-url") {
      nextStep();
    }
  };

  const notifyTodoEditCompleted = () => {
    if (state.currentStep === "edit-todo") {
      nextStep();
    }
  };

  const notifyWeekModeToggled = () => {
    if (state.currentStep === "workdays") {
      // Complete the step on any TAB press
      nextStep();
    }
  };

  const notifyTodoMoved = () => {
    if (state.currentStep === "move-todo") {
      nextStep();
    }
  };

  const notifyTodoDeleted = () => {
    if (state.currentStep === "delete-todo") {
      nextStep();
    }
  };

  const notifyTimeboxClosed = () => {
    if (state.currentStep === "timebox") {
      nextStep();
    }
  };

  return useView(state, derived, {
    totalSteps,
    startOnboarding,
    nextStep,
    previousStep,
    goToStep,
    completeOnboarding,
    notifyTodoEditCompleted,
    notifyWeekModeToggled,
    notifyTodoMoved,
    notifyTodoDeleted,
    notifyTimeboxClosed,
    notifyTodoAdded,
    notifyTodoAddedWithTag,
    notifyTodoAddedWithUrl,
  });
});
