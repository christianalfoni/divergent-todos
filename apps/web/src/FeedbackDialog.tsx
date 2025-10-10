import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
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

  useEffect(() => {
    if (open && textareaRef.current) {
      // Small delay to ensure dialog is fully rendered
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  }, [open]);

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
        className="fixed inset-0 bg-gray-500/75 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in dark:bg-gray-900/75"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-lg sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:bg-gray-800"
          >
            <div className="absolute right-0 top-0 pr-4 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={status === 'submitting'}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-2 focus:outline-offset-2 focus:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-500 dark:hover:text-gray-400"
              >
                <span className="sr-only">Close</span>
                <XMarkIcon aria-hidden="true" className="size-6" />
              </button>
            </div>

            <div className="sm:flex sm:items-start">
              <div className="mt-3 w-full text-center sm:mt-0 sm:text-left">
                <DialogTitle as="h3" className="text-base font-semibold text-gray-900 dark:text-white">
                  Send Feedback
                </DialogTitle>

                <form onSubmit={handleSubmit} className="mt-4">
                  <div className="rounded-lg bg-white outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600 dark:bg-gray-800/50 dark:outline-white/10 dark:focus-within:outline-indigo-500">
                    <label htmlFor="feedback" className="sr-only">
                      Feedback
                    </label>
                    <textarea
                      ref={textareaRef}
                      id="feedback"
                      name="feedback"
                      rows={6}
                      placeholder="Tell us what you think..."
                      className="block w-full resize-none px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6 dark:text-white dark:placeholder:text-gray-500 bg-transparent"
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      disabled={status === 'submitting' || status === 'success'}
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

                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={status === 'submitting' || status === 'success' || !feedback.trim()}
                      className="inline-flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500"
                    >
                      {status === 'submitting' ? 'Sending...' : 'Send Feedback'}
                    </button>
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={status === 'submitting'}
                      className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed sm:mt-0 sm:w-auto dark:bg-white/10 dark:text-white dark:outline-white/10 dark:hover:bg-white/20"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
