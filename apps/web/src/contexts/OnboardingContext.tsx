import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";

export type OnboardingStep = "workdays" | "add-todo" | "add-todo-with-url" | "edit-todo" | "morning-sun" | "icon-cloud" | null;

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
}

const OnboardingContext = createContext<OnboardingContextValue | undefined>(
  undefined
);

const ONBOARDING_STEPS: OnboardingStep[] = ["workdays", "add-todo", "add-todo-with-url", "edit-todo", "morning-sun", "icon-cloud"];

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

  const editTodo = (id: string, updates: Partial<Omit<OnboardingTodo, "id">>) => {
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
