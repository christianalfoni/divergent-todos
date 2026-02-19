import { Transition } from "@headlessui/react";
import {
  XMarkIcon,
  CalendarDaysIcon,
  PlusCircleIcon,
  LinkIcon,
  PencilSquareIcon,
  ArrowsRightLeftIcon,
  TrashIcon,
  LightBulbIcon,
  ClipboardIcon,
  ClipboardDocumentCheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HashtagIcon,
  DocumentDuplicateIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { useOnboarding } from "./contexts/OnboardingContext";
import { useEditProfile } from "./hooks/useEditProfile";
import { useState } from "react";

export default function OnboardingNotification() {
  const {
    isOnboarding,
    currentStep,
    currentStepIndex,
    totalSteps,
    previousStep,
    nextStep,
    completeOnboarding,
  } = useOnboarding();
  const [{ isEditing }, editProfile] = useEditProfile();
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleDismiss = () => {
    editProfile({ isOnboarded: true });
    completeOnboarding();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText("https://example.com/task");
      setCopiedUrl(true);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  const getContent = () => {
    switch (currentStep) {
      case "workdays":
        return {
          icon: (
            <CalendarDaysIcon
              aria-hidden="true"
              className="size-6 text-[var(--color-accent-primary)]"
            />
          ),
          title: "Toggle between view modes",
          message:
            "Press TAB to flip between different calendar views. Try it now to see how it works!",
          actionLabel: "Press TAB",
          requiresTab: true,
        };
      case "add-todo":
        return {
          icon: (
            <PlusCircleIcon
              aria-hidden="true"
              className="size-6 text-[var(--color-accent-primary)]"
            />
          ),
          title: "Let's add your first todo",
          message:
            "Try adding a todo by clicking on any day. You can also press N to quickly add a todo to active day. Tip: Add empty line (SHIFT+ENTER twice) and the text will be collapsed. Select and press T to toggle collapse.",
          actionLabel: "Add a todo",
          requiresAddTodo: true,
        };
      case "add-todo-with-tag":
        return {
          icon: (
            <HashtagIcon
              aria-hidden="true"
              className="size-6 text-[var(--color-accent-primary)]"
            />
          ),
          title: "Add a todo with a tag",
          message:
            "Tags help you organize your todos. Type #some-text and press space or enter to create a tag. Try adding a todo with a tag now!",
          actionLabel: "Add a todo with a tag",
          requiresAddTodoWithTag: true,
        };
      case "add-todo-with-url":
        return {
          icon: (
            <LinkIcon
              aria-hidden="true"
              className="size-6 text-[var(--color-accent-primary)]"
            />
          ),
          title: "Add a todo with a URL",
          message:
            "Todos can include URLs. Copy a sample URL, then paste it into a new todo description. Tip: Right-click any link to copy its URL!",
          actionLabel: "Add a todo with URL",
          requiresAddTodoWithUrl: true,
          showCopyButton: true,
        };
      case "edit-todo":
        return {
          icon: (
            <PencilSquareIcon
              aria-hidden="true"
              className="size-6 text-[var(--color-accent-primary)]"
            />
          ),
          title: "Select and edit todos",
          message:
            "Click a todo to select it, or use arrow keys to navigate. Press E or right-click and select Edit to edit. Press Enter or click outside to save, ESC to cancel.",
          actionLabel: "Edit and save a todo",
          requiresEditTodo: true,
        };
      case "move-todo":
        return {
          icon: (
            <ArrowsRightLeftIcon
              aria-hidden="true"
              className="size-6 text-[var(--color-accent-primary)]"
            />
          ),
          title: "Move todos around",
          message:
            "Drag and drop todos to reorder them within a day or move them to different days. Try moving the todo you just focused on - if you don't complete it, you'll see a 'shadow todo' creating a feeling of momentum on unfinished todos!",
          actionLabel: "Move a todo",
          requiresMoveTodo: true,
        };
      case "copy-todo":
        return {
          icon: (
            <DocumentDuplicateIcon
              aria-hidden="true"
              className="size-6 text-[var(--color-accent-primary)]"
            />
          ),
          title: "Copy todo by dragging",
          message:
            "Hold SHIFT while dragging a todo to create a copy instead of moving it.",
          actionLabel: "Hold SHIFT and drag to copy",
          requiresCopyTodo: true,
        };
      case "delete-todo":
        return {
          icon: (
            <TrashIcon
              aria-hidden="true"
              className="size-6 text-[var(--color-accent-primary)]"
            />
          ),
          title: "Delete todo",
          message:
            "Select a todo and press DEL or BACKSPACE to delete it. You can also right-click and select Delete, or edit the todo and remove all text.",
          actionLabel: "Delete a todo",
          requiresDeleteTodo: true,
        };
      case "timebox":
        return {
          icon: (
            <LightBulbIcon
              aria-hidden="true"
              className="size-6 text-[var(--color-accent-primary)]"
            />
          ),
          title: "Focus on your work",
          message:
            "Double-click a todo or select it and press F to open the Focus dialog. For now, just click 'End Session' to continue. You can toggle 'No distractions' to track focused work sessions. Your weekly reflection will show how much time you spent in deep focus.",
          actionLabel: "Open Focus and end session",
          requiresTimebox: true,
        };
      case "reflection":
        return {
          icon: (
            <ChartBarIcon
              aria-hidden="true"
              className="size-6 text-[var(--color-accent-primary)]"
            />
          ),
          title: "Weekly reflection",
          message:
            "Every week, a summary of your work is automatically created. It highlights your focused work and helps you see patterns in your distraction time, so you can improve your ability to stay focused. You've now completed the onboarding and know all the core features of Divergent Todos. Take back your attention by planning it!",
          actionLabel: "",
          hideActionLabel: true,
        };
      default:
        return null;
    }
  };

  const content = getContent();

  if (!content) return null;

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 flex items-start px-4 pt-20 sm:items-start sm:p-6 sm:pt-20 z-[5]"
    >
      <div className="flex w-full flex-col items-end space-y-4">
        <Transition show={isOnboarding}>
          <div className="pointer-events-auto w-full max-w-sm rounded-lg bg-white shadow-lg outline-1 outline-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0 dark:bg-gray-800 dark:-outline-offset-1 dark:outline-white/10">
            <div className="p-4">
              <div className="flex items-start">
                <div className="w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-x-2">
                    <div className="shrink-0">{content.icon}</div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {content.title}
                    </p>
                  </div>
                  <div className="mt-3 mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {content.message}
                    </p>
                    {!content.hideActionLabel && content.actionLabel && (
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <ClipboardDocumentCheckIcon
                          aria-hidden="true"
                          className="size-4 text-gray-500 dark:text-gray-400 shrink-0"
                        />
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          {content.actionLabel}
                        </span>
                        {content.showCopyButton && (
                          <button
                            type="button"
                            onClick={handleCopyUrl}
                            className="inline-flex items-center gap-x-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400 dark:hover:bg-indigo-400/20 dark:focus-visible:outline-indigo-500"
                          >
                            <ClipboardIcon
                              aria-hidden="true"
                              className="size-3"
                            />
                            {copiedUrl ? "Copied!" : "Copy URL"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    {/* Navigation arrows on the left */}
                    <div className="flex items-center gap-x-2">
                      <button
                        type="button"
                        onClick={previousStep}
                        disabled={currentStepIndex === 0}
                        className="inline-flex items-center justify-center rounded-md p-1 text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-[var(--color-accent-primary)] disabled:opacity-30 dark:hover:text-white"
                        title="Previous step"
                      >
                        <span className="sr-only">Previous step</span>
                        <ChevronLeftIcon
                          aria-hidden="true"
                          className="size-5"
                        />
                      </button>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {currentStepIndex + 1} / {totalSteps}
                      </span>
                      <button
                        type="button"
                        onClick={nextStep}
                        disabled={currentStepIndex === totalSteps - 1}
                        className="inline-flex items-center justify-center rounded-md p-1 text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-[var(--color-accent-primary)] disabled:opacity-30 dark:hover:text-white"
                        title="Next step"
                      >
                        <span className="sr-only">Next step</span>
                        <ChevronRightIcon
                          aria-hidden="true"
                          className="size-5"
                        />
                      </button>
                    </div>

                    {/* Action buttons on the right */}
                    <div className="flex items-center gap-x-2">
                      {currentStep === "reflection" ? (
                        <button
                          type="button"
                          onClick={handleDismiss}
                          disabled={isEditing}
                          className="rounded-md text-sm font-medium text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--color-accent-primary)] disabled:opacity-50"
                        >
                          {isEditing ? "Loading..." : "Complete"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleDismiss}
                          disabled={isEditing}
                          className="rounded-md text-sm font-medium text-gray-700 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-[var(--color-accent-primary)] dark:text-gray-300 dark:hover:text-white disabled:opacity-50"
                        >
                          Skip tutorial
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex shrink-0">
                  <button
                    type="button"
                    onClick={
                      currentStep === "reflection"
                        ? handleDismiss
                        : completeOnboarding
                    }
                    className="inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-[var(--color-accent-primary)] dark:hover:text-white"
                  >
                    <span className="sr-only">Close</span>
                    <XMarkIcon aria-hidden="true" className="size-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  );
}
