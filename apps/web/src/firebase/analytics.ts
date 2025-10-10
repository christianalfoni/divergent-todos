import { logEvent, setUserId, setUserProperties } from "firebase/analytics";
import { analytics } from "./index";

// User tracking
export function trackUser(userId: string | null) {
  if (userId) {
    setUserId(analytics, userId);
  }
}

export function trackUserProperties(properties: Record<string, string>) {
  setUserProperties(analytics, properties);
}

// Authentication events
export function trackSignIn(method: "google" | "anonymous") {
  logEvent(analytics, "login", { method });
}

export function trackSignUp(method: "google" | "anonymous") {
  logEvent(analytics, "sign_up", { method });
}

export function trackAccountLink() {
  logEvent(analytics, "account_linked");
}

// Todo events
export function trackTodoCreated(params?: {
  hasUrl?: boolean;
  isOnboarding?: boolean;
}) {
  logEvent(analytics, "todo_created", params);
}

export function trackTodoCompleted(params?: { isOnboarding?: boolean }) {
  logEvent(analytics, "todo_completed", params);
}

export function trackTodoUncompleted(params?: { isOnboarding?: boolean }) {
  logEvent(analytics, "todo_uncompleted", params);
}

export function trackTodoEdited(params?: { isOnboarding?: boolean }) {
  logEvent(analytics, "todo_edited", params);
}

export function trackTodoDeleted(params?: { isOnboarding?: boolean }) {
  logEvent(analytics, "todo_deleted", params);
}

export function trackTodoMoved(params?: {
  sameDay?: boolean;
  isOnboarding?: boolean;
}) {
  logEvent(analytics, "todo_moved", params);
}

export function trackBulkTodoMove(count: number) {
  logEvent(analytics, "todos_bulk_moved", { count });
}

export function trackDayTodosMoved(count: number) {
  logEvent(analytics, "day_todos_moved", { count });
}

// Feature usage
export function trackTimeboxOpened() {
  logEvent(analytics, "timebox_opened");
}

export function trackTimeboxClosed() {
  logEvent(analytics, "timebox_closed");
}

export function trackViewModeChanged(mode: "one-week" | "two-weeks") {
  logEvent(analytics, "view_mode_changed", { mode });
}

export function trackThemeChanged(theme: "light" | "dark" | "system") {
  logEvent(analytics, "theme_changed", { theme });
}

export function trackWeekendToggled(includeWeekends: boolean) {
  logEvent(analytics, "weekend_toggled", { include_weekends: includeWeekends });
}

// Onboarding events
export function trackOnboardingStarted() {
  logEvent(analytics, "onboarding_started");
}

export function trackOnboardingStepCompleted(step: string) {
  logEvent(analytics, "onboarding_step_completed", { step });
}

export function trackOnboardingCompleted() {
  logEvent(analytics, "onboarding_completed");
}

export function trackOnboardingSkipped(atStep: string) {
  logEvent(analytics, "onboarding_skipped", { step: atStep });
}

// Subscription events (use Firebase's predefined events)
export function trackSubscriptionStarted(value: number = 2) {
  logEvent(analytics, "begin_checkout", { value, currency: "USD" });
}

export function trackSubscriptionPurchased(value: number = 2) {
  logEvent(analytics, "purchase", {
    value,
    currency: "USD",
    transaction_id: `sub_${Date.now()}`,
  });
}

export function trackSubscriptionCanceled() {
  logEvent(analytics, "subscription_canceled");
}

export function trackSubscriptionResumed() {
  logEvent(analytics, "subscription_resumed");
}

export function trackSubscriptionPaymentFailed() {
  logEvent(analytics, "subscription_payment_failed");
}

export function trackFreeLimitReached(todoCount: number) {
  logEvent(analytics, "free_limit_reached", { todo_count: todoCount });
}

// App events
export function trackAppOpened(isElectron: boolean) {
  logEvent(analytics, "app_opened", { is_electron: isElectron });
}

export function trackAppDownloadInitiated() {
  logEvent(analytics, "app_download_initiated");
}

// Menu navigation events
export function trackMenuItemClicked(item: string) {
  logEvent(analytics, "menu_item_clicked", { item });
}

// Feedback events
export function trackFeedbackSubmitted() {
  logEvent(analytics, "feedback_submitted");
}

export function trackFeedbackSubmissionFailed(error: string) {
  logEvent(analytics, "feedback_submission_failed", { error });
}
