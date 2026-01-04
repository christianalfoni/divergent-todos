import { posthog } from "./posthog";

// User tracking
export function trackUser(userId: string | null) {
  if (userId) {
    posthog.identify(userId);
  } else {
    posthog.reset();
  }
}

export function trackUserProperties(properties: Record<string, string | number | boolean>) {
  posthog.setPersonProperties(properties);
}

// Authentication events
export function trackSignIn(method: "google" | "anonymous") {
  posthog.capture("login", { method });
}

export function trackSignUp(method: "google" | "anonymous") {
  posthog.capture("sign_up", { method });
}

export function trackAccountLink() {
  posthog.capture("account_linked");
}

// Todo events
export function trackTodoCreated(params?: {
  hasUrl?: boolean;
  isOnboarding?: boolean;
}) {
  posthog.capture("todo_created", params);
}

export function trackTodoCompleted(params?: { isOnboarding?: boolean }) {
  posthog.capture("todo_completed", params);
}

export function trackTodoUncompleted(params?: { isOnboarding?: boolean }) {
  posthog.capture("todo_uncompleted", params);
}

export function trackTodoEdited(params?: { isOnboarding?: boolean }) {
  posthog.capture("todo_edited", params);
}

export function trackTodoDeleted(params?: { isOnboarding?: boolean }) {
  posthog.capture("todo_deleted", params);
}

export function trackTodoMoved(params?: {
  sameDay?: boolean;
  isOnboarding?: boolean;
}) {
  posthog.capture("todo_moved", params);
}

export function trackTodoCopied(params?: {
  isOnboarding?: boolean;
  method?: "drag" | "complete-to-next-day" | "other";
}) {
  posthog.capture("todo_copied", params);
}

export function trackBulkTodoMove(count: number) {
  posthog.capture("todos_bulk_moved", { count });
}

export function trackDayTodosMoved(count: number) {
  posthog.capture("day_todos_moved", { count });
}

// Feature usage
export function trackFocusOpened() {
  posthog.capture("focus_opened");
}

export function trackFocusClosed() {
  posthog.capture("focus_closed");
}

export function trackViewModeChanged(mode: "one-week" | "two-weeks") {
  posthog.capture("view_mode_changed", { mode });
}

export function trackThemeChanged(theme: "light" | "dark" | "system") {
  posthog.capture("theme_changed", { theme });
}

export function trackFontSizeChanged(fontSize: "small" | "medium" | "large") {
  posthog.capture("font_size_changed", { font_size: fontSize });
}

export function trackWeekendToggled(includeWeekends: boolean) {
  posthog.capture("weekend_toggled", { include_weekends: includeWeekends });
}

// Onboarding events
export function trackOnboardingStarted() {
  posthog.capture("onboarding_started");
}

export function trackOnboardingStepCompleted(step: string) {
  posthog.capture("onboarding_step_completed", { step });
}

export function trackOnboardingCompleted() {
  posthog.capture("onboarding_completed");
}

export function trackOnboardingSkipped(atStep: string) {
  posthog.capture("onboarding_skipped", { step: atStep });
}

// Subscription events
export function trackSubscriptionStarted(value: number = 2) {
  posthog.capture("begin_checkout", { value, currency: "USD" });
}

export function trackSubscriptionPurchased(value: number = 2) {
  posthog.capture("purchase", {
    value,
    currency: "USD",
    transaction_id: `sub_${Date.now()}`,
  });
}

export function trackSubscriptionCanceled() {
  posthog.capture("subscription_canceled");
}

export function trackSubscriptionResumed() {
  posthog.capture("subscription_resumed");
}

export function trackSubscriptionPaymentFailed() {
  posthog.capture("subscription_payment_failed");
}

export function trackFreeLimitReached(todoCount: number) {
  posthog.capture("free_limit_reached", { todo_count: todoCount });
}

// App events
export function trackAppOpened(isElectron: boolean) {
  posthog.capture("app_opened", { is_electron: isElectron });
}

export function trackAppDownloadInitiated() {
  posthog.capture("app_download_initiated");
}

// Menu navigation events
export function trackMenuItemClicked(item: string) {
  posthog.capture("menu_item_clicked", { item });
}

// Feedback events
export function trackFeedbackSubmitted() {
  posthog.capture("feedback_submitted");
}

export function trackFeedbackSubmissionFailed(error: string) {
  posthog.capture("feedback_submission_failed", { error });
}
