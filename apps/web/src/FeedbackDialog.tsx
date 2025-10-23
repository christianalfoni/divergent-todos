import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { ChatBubbleLeftRightIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { submitFeedback } from './firebase/feedback';
import { trackFeedbackSubmitted, trackFeedbackSubmissionFailed } from './firebase/analytics';

interface FeedbackDialogProps {
  open: boolean;
  onClose: () => void;
}

type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';

export default function FeedbackDialog({ open, onClose }: FeedbackDialogProps) {
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState<SubmissionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;

    setStatus('submitting');
    setErrorMessage('');

    try {
      await submitFeedback(feedback);
      trackFeedbackSubmitted();
      setStatus('success');

      // Reset form and close dialog after brief delay
      setTimeout(() => {
        setFeedback('');
        setStatus('idle');
        onClose();
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send feedback';
      trackFeedbackSubmissionFailed(message);
      setErrorMessage('Failed to send feedback. Please try again later.');
      setStatus('error');
    }
  };

  const handleClose = () => {
    if (status === 'submitting') return; // Prevent closing while submitting
    setFeedback('');
    setStatus('idle');
    setErrorMessage('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-[var(--color-overlay)] transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-[var(--color-bg-dialog)] text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:outline dark:-outline-offset-1 dark:outline-white/10"
          >
            {/* Header */}
            <div className="px-6 py-6 border-b border-[var(--color-border-primary)] flex items-center justify-between">
              <DialogTitle
                as="h2"
                className="text-xl font-semibold text-[var(--color-text-primary)] m-0 flex items-center gap-2"
              >
                <ChatBubbleLeftRightIcon
                  aria-hidden="true"
                  className="w-6 h-6 text-[var(--color-accent-primary)]"
                />
                Send Feedback
              </DialogTitle>
              <button
                type="button"
                onClick={handleClose}
                disabled={status === 'submitting'}
                className="bg-transparent border-0 text-2xl text-[var(--color-text-secondary)] p-0 w-8 h-8 flex items-center justify-center rounded-md transition-all duration-150 hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-6">
                <div className="rounded-lg bg-[var(--color-bg-dialog)] outline-1 -outline-offset-1 outline-[var(--color-border-secondary)] focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-[var(--color-accent-primary)]">
                  <label htmlFor="feedback" className="sr-only">
                    Feedback
                  </label>
                  <textarea
                    ref={textareaRef}
                    id="feedback"
                    name="feedback"
                    rows={6}
                    placeholder="Tell us what you think..."
                    className="block w-full resize-none px-3 py-2 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none sm:text-sm/6 bg-transparent"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    disabled={status === 'submitting' || status === 'success'}
                    autoFocus
                  />
                </div>

                {/* Success message */}
                {status === 'success' && (
                  <div className="mt-3 rounded-md bg-green-50 p-3 dark:bg-green-900/20">
                    <div className="flex">
                      <CheckCircleIcon aria-hidden="true" className="size-5 text-green-400" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800 dark:text-green-400">
                          Feedback sent successfully! Thank you.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {status === 'error' && errorMessage && (
                  <div className="mt-3 rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                    <div className="flex">
                      <ExclamationCircleIcon aria-hidden="true" className="size-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800 dark:text-red-400">
                          {errorMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-[var(--color-bg-dialog-footer)] px-6 py-6 flex justify-end">
                <button
                  type="submit"
                  disabled={status === 'submitting' || status === 'success' || !feedback.trim()}
                  className="inline-flex justify-center rounded-md bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:opacity-50"
                >
                  {status === 'submitting' ? 'Sending...' : 'Send Feedback'}
                </button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
