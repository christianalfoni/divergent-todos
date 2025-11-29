import { amplitude } from "./amplitude";

// User tracking
export function trackUser(userId: string | null) {
  if (userId) {
    amplitude.setUserId(userId);
  } else {
    amplitude.reset();
  }
}

export function trackUserProperties(properties: Record<string, string | number | boolean>) {
  const identify = new amplitude.Identify();
  Object.entries(properties).forEach(([key, value]) => {
    identify.set(key, value);
  });
  amplitude.identify(identify);
}

// Authentication events
export function trackSignIn(method: "google" | "anonymous") {
  amplitude.track("login", { method });
}

export function trackSignUp(method: "google" | "anonymous") {
  amplitude.track("sign_up", { method });
}

export function trackAccountLink() {
  amplitude.track("account_linked");
}

// Todo events
export function trackTodoCreated(params?: {
  hasUrl?: boolean;
  isOnboarding?: boolean;
}) {
  amplitude.track("todo_created", params);
}

export function trackTodoCompleted(params?: { isOnboarding?: boolean }) {
  amplitude.track("todo_completed", params);
}

export function trackTodoUncompleted(params?: { isOnboarding?: boolean }) {
  amplitude.track("todo_uncompleted", params);
}

export function trackTodoEdited(params?: { isOnboarding?: boolean }) {
  amplitude.track("todo_edited", params);
}

export function trackTodoDeleted(params?: { isOnboarding?: boolean }) {
  amplitude.track("todo_deleted", params);
}

export function trackTodoMoved(params?: {
  sameDay?: boolean;
  isOnboarding?: boolean;
}) {
  amplitude.track("todo_moved", params);
}

export function trackTodoCopied(params?: { isOnboarding?: boolean }) {
  amplitude.track("todo_copied", params);
}

export function trackBulkTodoMove(count: number) {
  amplitude.track("todos_bulk_moved", { count });
}

export function trackDayTodosMoved(count: number) {
  amplitude.track("day_todos_moved", { count });
}

// Feature usage
export function trackTimeboxOpened() {
  amplitude.track("timebox_opened");
}

export function trackTimeboxClosed() {
  amplitude.track("timebox_closed");
}

export function trackViewModeChanged(mode: "one-week" | "two-weeks") {
  amplitude.track("view_mode_changed", { mode });
}

export function trackThemeChanged(theme: "light" | "dark" | "system") {
  amplitude.track("theme_changed", { theme });
}

export function trackFontSizeChanged(fontSize: "small" | "medium" | "large") {
  amplitude.track("font_size_changed", { font_size: fontSize });
}

export function trackWeekendToggled(includeWeekends: boolean) {
  amplitude.track("weekend_toggled", { include_weekends: includeWeekends });
}

// Onboarding events
export function trackOnboardingStarted() {
  amplitude.track("onboarding_started");
}

export function trackOnboardingStepCompleted(step: string) {
  amplitude.track("onboarding_step_completed", { step });
}

export function trackOnboardingCompleted() {
  amplitude.track("onboarding_completed");
}

export function trackOnboardingSkipped(atStep: string) {
  amplitude.track("onboarding_skipped", { step: atStep });
}

// Subscription events
export function trackSubscriptionStarted(value: number = 2) {
  amplitude.track("begin_checkout", { value, currency: "USD" });
}

export function trackSubscriptionPurchased(value: number = 2) {
  amplitude.track("purchase", {
    value,
    currency: "USD",
    transaction_id: `sub_${Date.now()}`,
  });
}

export function trackSubscriptionCanceled() {
  amplitude.track("subscription_canceled");
}

export function trackSubscriptionResumed() {
  amplitude.track("subscription_resumed");
}

export function trackSubscriptionPaymentFailed() {
  amplitude.track("subscription_payment_failed");
}

export function trackFreeLimitReached(todoCount: number) {
  amplitude.track("free_limit_reached", { todo_count: todoCount });
}

// App events
export function trackAppOpened(isElectron: boolean) {
  amplitude.track("app_opened", { is_electron: isElectron });
}

export function trackAppDownloadInitiated() {
  amplitude.track("app_download_initiated");
}

// Menu navigation events
export function trackMenuItemClicked(item: string) {
  amplitude.track("menu_item_clicked", { item });
}

// Feedback events
export function trackFeedbackSubmitted() {
  amplitude.track("feedback_submitted");
}

export function trackFeedbackSubmissionFailed(error: string) {
  amplitude.track("feedback_submission_failed", { error });
}
