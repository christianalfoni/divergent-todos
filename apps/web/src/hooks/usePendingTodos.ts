import { useState, useCallback } from "react";
import type { Todo } from "../App";

interface PendingTodo {
  id: string;
  text: string;
  url?: string;
  completed: boolean;
  date: string;
  position: string;
  createdAt: Date;
  isPending: true;
}

export function usePendingTodos() {
  const [pendingTodos, setPendingTodos] = useState<PendingTodo[]>([]);

  const addPending = useCallback((todo: PendingTodo) => {
    setPendingTodos((prev) => [...prev, todo]);
  }, []);

  const removePending = useCallback((id: string) => {
    setPendingTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updatePending = useCallback((id: string, text: string) => {
    setPendingTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, text } : t))
    );
  }, []);

  const clearPending = useCallback(() => {
    setPendingTodos([]);
  }, []);

  // Convert pending todos to regular Todo format for display
  const getPendingAsTodos = useCallback((): Todo[] => {
    return pendingTodos.map((pending) => ({
      id: pending.id,
      text: pending.text,
      url: pending.url,
      completed: pending.completed,
      date: pending.date,
      position: pending.position,
      createdAt: pending.createdAt,
    }));
  }, [pendingTodos]);

  return {
    pendingTodos,
    addPending,
    removePending,
    updatePending,
    clearPending,
    getPendingAsTodos,
  };
}
