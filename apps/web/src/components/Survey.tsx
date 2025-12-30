import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

interface SurveyProps {
  surveyId: string;
  question: string;
  onDismiss: () => void;
  onSubmit: (response: string) => void;
}

export default function Survey({
  question,
  onDismiss,
  onSubmit,
}: SurveyProps) {
  const [response, setResponse] = useState("");

  const handleSubmit = () => {
    if (response.trim()) {
      onSubmit(response);
      setResponse("");
    }
  };

  return (
    <Dialog open={true} onClose={onDismiss} className="relative z-10">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-[var(--color-overlay)] transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-[var(--color-bg-primary)] px-4 pt-5 pb-4 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 outline -outline-offset-1 outline-[var(--color-outline)]"
          >
            <div>
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--color-accent-light)]">
                <ChatBubbleLeftRightIcon
                  aria-hidden="true"
                  className="size-6 text-[var(--color-accent-text)]"
                />
              </div>
              <div className="mt-3 text-center sm:mt-5">
                <DialogTitle
                  as="h3"
                  className="text-base font-semibold text-[var(--color-text-primary)]"
                >
                  {question}
                </DialogTitle>
                <div className="mt-4">
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    className="w-full rounded-md bg-[var(--color-bg-secondary)] border border-[var(--color-outline)] px-3 py-2 text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:border-transparent"
                    rows={4}
                    placeholder="Your feedback helps us improve..."
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-6 flex gap-3">
              <button
                type="button"
                onClick={onDismiss}
                className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs inset-ring inset-ring-gray-300 hover:bg-gray-50 focus-visible:inset-ring-transparent dark:bg-white/10 dark:text-white dark:shadow-none dark:inset-ring-white/5 dark:hover:bg-white/20"
              >
                Maybe later
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!response.trim()}
                className="flex-1 rounded-md bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[var(--color-accent-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[var(--color-accent-primary)]"
              >
                Submit
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
