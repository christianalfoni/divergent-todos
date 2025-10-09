import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

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

export interface OnboardingTodo {
  id: string;
  description: string;
  completed: boolean;
  date: Date;
  position: string;
}

interface OnboardingContextValue {
  isOnboarding: boolean;
  currentStep: OnboardingStep;
  todos: OnboardingTodo[];
  addTodo: (todo: Omit<OnboardingTodo, "id">) => void;
  editTodo: (id: string, updates: Partial<Omit<OnboardingTodo, "id">>) => void;
  deleteTodo: (id: string) => void;
  startOnboarding: () => void;
  nextStep: () => void;
  completeOnboarding: () => void;
  notifyTodoEditCompleted: () => void;
  notifyWeekModeToggled: (isThreeWeeks: boolean) => void;
  notifyTodoMoved: () => void;
  notifyTodoDeleted: () => void;
  notifyTimeboxClosed: () => void;
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
  const [todos, setTodos] = useState<OnboardingTodo[]>([]);

  const isOnboarding = currentStep !== null;

  const startOnboarding = () => {
    setCurrentStep(ONBOARDING_STEPS[0]);
    setTodos([]); // Reset todos when starting onboarding
  };

  const nextStep = () => {
    const currentIndex = ONBOARDING_STEPS.indexOf(currentStep!);
    if (currentIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(ONBOARDING_STEPS[currentIndex + 1]);
    } else {
      setCurrentStep(null);
    }
  };

  const completeOnboarding = () => {
    setCurrentStep(null);
    setTodos([]); // Clear todos when completing onboarding
  };

  const addTodo = (todo: Omit<OnboardingTodo, "id">) => {
    const newTodo: OnboardingTodo = {
      ...todo,
      id: crypto.randomUUID(),
    };
    setTodos((prev) => [...prev, newTodo]);
  };

  const editTodo = (
    id: string,
    updates: Partial<Omit<OnboardingTodo, "id">>
  ) => {
    setTodos((prev) =>
      prev.map((todo) => (todo.id === id ? { ...todo, ...updates } : todo))
    );
  };

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((todo) => todo.id !== id));
  };

  const notifyTodoEditCompleted = () => {
    if (currentStep === "edit-todo") {
      nextStep();
    }
  };

  const notifyWeekModeToggled = (isTwoWeeks: boolean) => {
    if (currentStep === "workdays") {
      // If they've toggled and are now in 2-week mode, complete the step
      if (isTwoWeeks) {
        nextStep();
      }
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
        todos,
        addTodo,
        editTodo,
        deleteTodo,
        startOnboarding,
        nextStep,
        completeOnboarding,
        notifyTodoEditCompleted,
        notifyWeekModeToggled,
        notifyTodoMoved,
        notifyTodoDeleted,
        notifyTimeboxClosed,
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
