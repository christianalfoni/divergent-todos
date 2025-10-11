import { Transition } from "@headlessui/react";
import {
  XMarkIcon,
  CalendarDaysIcon,
  PlusCircleIcon,
  LinkIcon,
  PencilSquareIcon,
  ArrowsRightLeftIcon,
  TrashIcon,
  ClockIcon,
  CheckCircleIcon,
  ClipboardIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";
import { useOnboarding } from "./contexts/OnboardingContext";
import { useEditProfile } from "./hooks/useEditProfile";
import { useState } from "react";

export default function OnboardingNotification() {
  const { isOnboarding, currentStep, completeOnboarding } =
    useOnboarding();
  const [{ isEditing }, editProfile] = useEditProfile();
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleDismiss = async () => {
    await editProfile({ isOnboarded: true });
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
            <CalendarDaysIcon aria-hidden="true" className="size-6 text-blue-500 dark:text-blue-400" />
          ),
          title: "Toggle between view modes",
          message: "Press TAB to flip between different calendar views. Try it now to see how it works!",
          actionLabel: "Press TAB to continue",
          requiresTab: true,
        };
      case "add-todo":
        return {
          icon: (
            <PlusCircleIcon aria-hidden="true" className="size-6 text-green-500 dark:text-green-400" />
          ),
          title: "Let's add your first todo",
          message:
            "Try adding a todo by clicking on any day.",
          actionLabel: "Add a todo to continue",
          requiresAddTodo: true,
        };
      case "add-todo-with-url":
        return {
          icon: (
            <LinkIcon aria-hidden="true" className="size-6 text-purple-500 dark:text-purple-400" />
          ),
          title: "Add a todo with a URL",
          message:
            "Todos can include URLs. Click the button below to copy a sample URL, then paste it into a new todo description.",
          actionLabel: "Add a todo with URL to continue",
          requiresAddTodoWithUrl: true,
          showCopyButton: true,
        };
      case "edit-todo":
        return {
          icon: (
            <PencilSquareIcon aria-hidden="true" className="size-6 text-orange-500 dark:text-orange-400" />
          ),
          title: "Edit your todos anytime",
          message:
            "Click on any todo to edit its text. Links don't activate edit mode, so click next to them. During edit mode, use backspace to remove links. Click outside the todo to save your changes.",
          actionLabel: "Edit and save a todo to continue",
          requiresEditTodo: true,
        };
      case "move-todo":
        return {
          icon: (
            <ArrowsRightLeftIcon aria-hidden="true" className="size-6 text-indigo-500 dark:text-indigo-400" />
          ),
          title: "Move todos around",
          message:
            "Drag and drop todos to reorder them within a day or move them to different days.",
          actionLabel: "Move a todo to continue",
          requiresMoveTodo: true,
        };
      case "delete-todo":
        return {
          icon: (
            <TrashIcon aria-hidden="true" className="size-6 text-red-500 dark:text-red-400" />
          ),
          title: "Delete todos",
          message:
            "To delete a todo, click on it to edit, then remove all the text content and press Enter.",
          actionLabel: "Delete a todo to continue",
          requiresDeleteTodo: true,
        };
      case "timebox":
        return {
          icon: (
            <ClockIcon aria-hidden="true" className="size-6 text-pink-500 dark:text-pink-400" />
          ),
          title: "Use the timebox feature",
          message:
            "Double-click on any todo to open the timebox. This helps you focus on one task at a time with a timer.",
          actionLabel: "Open and close timebox to continue",
          requiresTimebox: true,
        };
      case "congratulations":
        return {
          icon: (
            <CheckCircleIcon aria-hidden="true" className="size-6 text-green-500 dark:text-green-400" />
          ),
          title: "Congratulations!",
          message:
            "You've completed the onboarding. You now know all the core features of Divergent Todos. Start managing your tasks and stay focused!",
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
                <div className="shrink-0">{content.icon}</div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {content.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {content.message}
                  </p>
                  {!content.hideActionLabel && content.actionLabel && (
                    <div className="mt-2 flex items-center gap-x-2">
                      <ClipboardDocumentCheckIcon aria-hidden="true" className="size-4 text-gray-500 dark:text-gray-400 shrink-0" />
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {content.actionLabel}
                      </p>
                    </div>
                  )}
                  {content.showCopyButton && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-xs outline-1 outline-gray-300 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-white/10 dark:text-white dark:shadow-none dark:outline-white/10 dark:hover:bg-white/20 dark:focus-visible:outline-indigo-500"
                      >
                        <ClipboardIcon aria-hidden="true" className="-ml-0.5 size-5" />
                        {copiedUrl ? "Copied!" : "Copy sample URL"}
                      </button>
                    </div>
                  )}
                  {currentStep === "congratulations" && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={handleDismiss}
                        disabled={isEditing}
                        className="rounded-md text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 dark:focus:outline-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isEditing ? "Loading..." : "Complete"}
                      </button>
                    </div>
                  )}
                  {currentStep !== "congratulations" && (
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={handleDismiss}
                        disabled={isEditing}
                        className="rounded-md text-sm font-medium text-gray-700 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-500 dark:text-gray-300 dark:hover:text-white dark:focus:outline-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Skip onboarding
                      </button>
                    </div>
                  )}
                </div>
                <div className="ml-4 flex shrink-0">
                  <button
                    type="button"
                    onClick={currentStep === "congratulations" ? handleDismiss : completeOnboarding}
                    className="inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 dark:hover:text-white dark:focus:outline-indigo-500"
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
