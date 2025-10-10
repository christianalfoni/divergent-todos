import { Component, type ReactNode } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { submitFeedback } from './firebase/feedback';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
  userMessage: string;
  status: 'idle' | 'submitting' | 'success' | 'error';
  errorMessage: string;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      userMessage: '',
      status: 'idle',
      errorMessage: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      errorInfo: errorInfo.componentStack || null
    });
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    const { userMessage, error, errorInfo } = this.state;

    if (!userMessage.trim()) return;

    this.setState({ status: 'submitting', errorMessage: '' });

    try {
      const feedbackMessage = `
[ERROR REPORT]

What the user was doing:
${userMessage}

Error: ${error?.message || 'Unknown error'}

Stack trace:
${error?.stack || 'No stack trace available'}

Component stack:
${errorInfo || 'No component stack available'}
      `.trim();

      await submitFeedback(feedbackMessage);
      this.setState({ status: 'success' });

      // Refresh after brief delay
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      this.setState({
        errorMessage: 'Failed to send error report. You can still refresh the page.',
        status: 'error'
      });
      console.error('Failed to submit error feedback:', err);
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { userMessage, status, errorMessage, error } = this.state;

    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-lg shadow-xl p-6 dark:bg-gray-800">
            <div className="flex flex-col items-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <ExclamationTriangleIcon aria-hidden="true" className="size-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-gray-900 dark:text-white">
                Unexpected Error
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                Something went wrong. You can help us fix this by telling us what you were doing when it happened.
              </p>

              {status === 'idle' && (
                <form onSubmit={this.handleSubmitFeedback} className="mt-6 w-full">
                  <div className="rounded-lg bg-white outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600 dark:bg-gray-800/50 dark:outline-white/10 dark:focus-within:outline-indigo-500">
                    <label htmlFor="error-description" className="sr-only">
                      What were you doing when this happened?
                    </label>
                    <textarea
                      id="error-description"
                      name="error-description"
                      rows={4}
                      placeholder="What were you doing when this happened?"
                      className="block w-full resize-none px-3 py-2 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none sm:text-sm/6 dark:text-white dark:placeholder:text-gray-500 bg-transparent"
                      value={userMessage}
                      onChange={(e) => this.setState({ userMessage: e.target.value })}
                      autoFocus
                    />
                  </div>

                  {/* Error details (collapsed) */}
                  <details className="mt-3">
                    <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                      Show error details
                    </summary>
                    <div className="mt-2 rounded-md bg-gray-50 p-3 dark:bg-gray-900/50">
                      <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-32">
                        {error?.message || 'Unknown error'}
                      </pre>
                    </div>
                  </details>

                  <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                    <button
                      type="button"
                      onClick={this.handleRefresh}
                      className="inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:outline-white/10 dark:hover:bg-white/20"
                    >
                      Just Refresh
                    </button>
                    <button
                      type="submit"
                      disabled={!userMessage.trim()}
                      className="inline-flex justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-indigo-500 dark:hover:bg-indigo-400"
                    >
                      Send & Refresh
                    </button>
                  </div>
                </form>
              )}

              {status === 'submitting' && (
                <div className="mt-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Sending error report...
                  </p>
                </div>
              )}

              {status === 'success' && (
                <div className="mt-6 w-full">
                  <div className="rounded-md bg-green-50 p-3 dark:bg-green-900/20">
                    <div className="flex">
                      <CheckCircleIcon aria-hidden="true" className="size-5 text-green-400" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800 dark:text-green-400">
                          Thank you! Refreshing now...
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {status === 'error' && errorMessage && (
                <div className="mt-6 w-full">
                  <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                    <div className="flex">
                      <ExclamationCircleIcon aria-hidden="true" className="size-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800 dark:text-red-400">
                          {errorMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={this.handleRefresh}
                    className="mt-4 w-full inline-flex justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-50 dark:bg-white/10 dark:text-white dark:outline-white/10 dark:hover:bg-white/20"
                  >
                    Refresh Page
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}
