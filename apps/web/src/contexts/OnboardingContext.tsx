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
  | "add-todo-with-tag"
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
  currentStepIndex: number;
  totalSteps: number;
  startOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  completeOnboarding: () => void;
  notifyTodoEditCompleted: () => void;
  notifyWeekModeToggled: () => void;
  notifyTodoMoved: () => void;
  notifyTodoDeleted: () => void;
  notifyTimeboxClosed: () => void;
  notifyTodoAdded: () => void;
  notifyTodoAddedWithTag: () => void;
  notifyTodoAddedWithUrl: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(
  undefined
);

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

interface OnboardingProviderProps {
  children: ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(null);

  const isOnboarding = currentStep !== null;
  const currentStepIndex = currentStep ? ONBOARDING_STEPS.indexOf(currentStep) : -1;
  const totalSteps = ONBOARDING_STEPS.length;

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

  const previousStep = () => {
    const currentIndex = ONBOARDING_STEPS.indexOf(currentStep!);
    if (currentIndex > 0) {
      setCurrentStep(ONBOARDING_STEPS[currentIndex - 1]);
    }
  };

  const goToStep = (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < ONBOARDING_STEPS.length) {
      setCurrentStep(ONBOARDING_STEPS[stepIndex]);
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

  const notifyTodoAddedWithTag = () => {
    if (currentStep === "add-todo-with-tag") {
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
        currentStepIndex,
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
