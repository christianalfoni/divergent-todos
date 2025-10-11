import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import {
  trackOnboardingStarted,
  trackOnboardingStepCompleted,
  trackOnboardingCompleted,
  trackOnboardingSkipped,
} from "../firebase/analytics";

export type OnboardingStep =
  | "workdays"
  | "add-todo"
  | "add-todo-with-url"
  | "edit-todo"
  | "move-todo"
  | "delete-todo"
  | "timebox"
  | "congratulations"
  | null;

interface OnboardingContextValue {
  isOnboarding: boolean;
  currentStep: OnboardingStep;
  startOnboarding: () => void;
  nextStep: () => void;
  completeOnboarding: () => void;
  notifyTodoEditCompleted: () => void;
  notifyWeekModeToggled: () => void;
  notifyTodoMoved: () => void;
  notifyTodoDeleted: () => void;
  notifyTimeboxClosed: () => void;
  notifyTodoAdded: () => void;
  notifyTodoAddedWithUrl: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(
  undefined
);

const ONBOARDING_STEPS: OnboardingStep[] = [
  "workdays",
  "add-todo",
  "add-todo-with-url",
  "edit-todo",
  "move-todo",
  "delete-todo",
  "timebox",
  "congratulations",
];

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(null);

  const isOnboarding = currentStep !== null;

  const startOnboarding = () => {
    trackOnboardingStarted();
    setCurrentStep(ONBOARDING_STEPS[0]);
  };

  const nextStep = () => {
    const currentIndex = ONBOARDING_STEPS.indexOf(currentStep!);

    // Track step completion before advancing
    if (currentStep) {
      trackOnboardingStepCompleted(currentStep);
    }

    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(ONBOARDING_STEPS[currentIndex + 1]);
    } else {
      setCurrentStep(null);
    }
  };

  const completeOnboarding = () => {
    // Track if onboarding was skipped or completed
    if (currentStep === "congratulations") {
      trackOnboardingCompleted();
    } else if (currentStep) {
      trackOnboardingSkipped(currentStep);
    }

    setCurrentStep(null);
  };

  const notifyTodoAdded = () => {
    if (currentStep === "add-todo") {
      nextStep();
    }
  };

  const notifyTodoAddedWithUrl = () => {
    if (currentStep === "add-todo-with-url") {
      nextStep();
    }
  };

  const notifyTodoEditCompleted = () => {
    if (currentStep === "edit-todo") {
      nextStep();
    }
  };

  const notifyWeekModeToggled = () => {
    if (currentStep === "workdays") {
      // Complete the step on any TAB press
      nextStep();
    }
  };

  const notifyTodoMoved = () => {
    if (currentStep === "move-todo") {
      nextStep();
    }
  };

  const notifyTodoDeleted = () => {
    if (currentStep === "delete-todo") {
      nextStep();
    }
  };

  const notifyTimeboxClosed = () => {
    if (currentStep === "timebox") {
      nextStep();
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        isOnboarding,
        currentStep,
        startOnboarding,
        nextStep,
        completeOnboarding,
        notifyTodoEditCompleted,
        notifyWeekModeToggled,
        notifyTodoMoved,
        notifyTodoDeleted,
        notifyTimeboxClosed,
        notifyTodoAdded,
        notifyTodoAddedWithUrl,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
