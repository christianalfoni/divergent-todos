import { Transition } from "@headlessui/react";
import {
  SunIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  ExclamationTriangleIcon,
  UserIcon,
  XMarkIcon,
  CalendarDaysIcon,
  PlusCircleIcon,
  LinkIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useOnboarding } from "./contexts/OnboardingContext";
import { useEditProfile } from "./hooks/useEditProfile";
import { useState } from "react";

export default function OnboardingNotification() {
  const { isOnboarding, currentStep, nextStep, completeOnboarding } =
    useOnboarding();
  const [{ isEditing }, editProfile] = useEditProfile();
  const [copiedUrl, setCopiedUrl] = useState(false);

  const handleNext = () => {
    if (currentStep === "icon-cloud") {
      editProfile({ isOnboarded: true });
      completeOnboarding();
    } else {
      nextStep();
    }
  };

  const handleDismiss = () => {
    editProfile({ isOnboarded: true });
    completeOnboarding();
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText("https://example.com/task");
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
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
          title: "This app only displays workdays",
          message:
            "Weekends are for family, friends and rest. By default, the app shows current and next week. Press TAB to toggle between showing both weeks or just the current week.",
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
            "You can press TAB again to flip back to two-week mode. Now try adding a todo by clicking on any day.",
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
            "Click on any todo to edit its text. When you're done, click outside the todo to save your changes.",
          actionLabel: "Edit and save a todo to continue",
          requiresEditTodo: true,
        };
      case "morning-sun":
        return {
          icon: (
            <SunIcon aria-hidden="true" className="size-6 text-yellow-500 dark:text-yellow-400" />
          ),
          title: "Some mornings you wake up feeling great",
          message:
            "Hundreds of factors, most out of our control, define how well we meet the workday. Regardless, we all need to feel a sense of control to be motivated.",
          actionLabel: "Go to work",
        };
      case "icon-cloud":
        return {
          icon: (
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <EnvelopeIcon
                    aria-hidden="true"
                    className="size-4 text-blue-600 dark:text-blue-400"
                  />
                </div>
                <div className="absolute -top-0.5 -right-0.5 flex size-3 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  12
                </div>
              </div>
              <div className="relative">
                <div className="flex size-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <ChatBubbleLeftIcon
                    aria-hidden="true"
                    className="size-4 text-green-600 dark:text-green-400"
                  />
                </div>
                <div className="absolute -top-0.5 -right-0.5 flex size-3 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  8
                </div>
              </div>
              <div className="relative">
                <div className="flex size-8 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                  <ExclamationTriangleIcon
                    aria-hidden="true"
                    className="size-4 text-orange-600 dark:text-orange-400"
                  />
                </div>
                <div className="absolute -top-0.5 -right-0.5 flex size-3 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  5
                </div>
              </div>
              <div className="relative">
                <div className="flex size-8 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <UserIcon
                    aria-hidden="true"
                    className="size-4 text-purple-600 dark:text-purple-400"
                  />
                </div>
                <div className="absolute -top-0.5 -right-0.5 flex size-3 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  3
                </div>
              </div>
            </div>
          ),
          title: "Opening your computer can be quite disarming",
          message:
            "We operate in a workplace where a never ending stream of notifications distracts and overwhelms us.",
          actionLabel: "Take control",
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
      className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-end sm:p-6 z-50"
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
                  {content.showCopyButton && (
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400"
                      >
                        {copiedUrl ? "✓ Copied!" : "Copy sample URL"}
                      </button>
                    </div>
                  )}
                  <div className="mt-3 flex space-x-7">
                    {!content.requiresTab && !content.requiresAddTodo && !content.requiresAddTodoWithUrl && !content.requiresEditTodo && (
                      <button
                        type="button"
                        onClick={handleNext}
                        disabled={isEditing}
                        className="rounded-md text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 dark:focus:outline-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isEditing ? "Loading..." : content.actionLabel}
                      </button>
                    )}
                    {(content.requiresTab || content.requiresAddTodo || content.requiresAddTodoWithUrl || content.requiresEditTodo) && (
                      <div className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {content.actionLabel}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleDismiss}
                      disabled={isEditing}
                      className="rounded-md text-sm font-medium text-gray-700 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-500 dark:text-gray-300 dark:hover:text-white dark:focus:outline-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                <div className="ml-4 flex shrink-0">
                  <button
                    type="button"
                    onClick={handleDismiss}
                    disabled={isEditing}
                    className="inline-flex rounded-md text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 dark:hover:text-white dark:focus:outline-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
