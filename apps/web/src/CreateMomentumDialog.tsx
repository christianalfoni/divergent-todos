import { useState } from 'react';
import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { BoltIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { createMomentum } from './firebase/createMomentum';
import SmartEditor from './SmartEditor';
import type { Todo } from './App';

interface CreateMomentumDialogProps {
  todo: Todo | null;
  isOpen: boolean;
  onClose: () => void;
  onAddTodo: (todo: { text: string; date: string; completed: boolean; position?: string }) => void;
  onToggleTodoComplete: (todoId: string) => void;
}

type SubmissionStatus = 'idle' | 'analyzing' | 'showing-results' | 'creating' | 'error';

export default function CreateMomentumDialog({
  todo,
  isOpen,
  onClose,
  onAddTodo,
}: CreateMomentumDialogProps) {
  const [userContext, setUserContext] = useState('');
  const [status, setStatus] = useState<SubmissionStatus>('idle');
  const [suggestions, setSuggestions] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!todo) return;

    setStatus('analyzing');
    setError(null);

    try {
      const steps = await createMomentum(
        todo.text,
        userContext || undefined,
        todo.moveCount
      );
      setSuggestions(steps);
      setStatus('showing-results');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get suggestions';
      setError(message);
      setStatus('error');
    }
  };

  const handleSelectSuggestion = async (suggestion: string) => {
    if (!todo) return;

    setStatus('creating');

    try {
      // Extract tags from original todo
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = todo.text;
      const tagElements = tempDiv.querySelectorAll('[data-tag]');
      const tags: string[] = [];
      tagElements.forEach(el => {
        const tag = (el as HTMLElement).dataset.tag;
        if (tag) tags.push(tag);
      });

      // Create the first step todo
      let newTodoHtml = suggestion;

      // Append inherited tags to the first step
      tags.forEach(tag => {
        newTodoHtml += ` <span class="inline-flex items-center rounded-md bg-[var(--color-accent-subtle)] px-2 py-0.5 text-xs font-medium text-[var(--color-accent-text)]" data-tag="${tag}">${tag}</span>`;
      });

      onAddTodo({
        text: newTodoHtml,
        completed: false,
        date: todo.date,
      });

      // Original todo stays incomplete - we're just adding a first step before it

      // Close dialog after successful creation
      setTimeout(() => {
        handleClose();
      }, 500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create todo';
      setError(message);
      setStatus('error');
    }
  };

  const handleClose = () => {
    if (status === 'analyzing' || status === 'creating') return;

    // Reset state
    setUserContext('');
    setStatus('idle');
    setSuggestions(null);
    setError(null);
    onClose();
  };

  // Don't render if no todo
  if (!todo) return null;

  const isProcessing = status === 'analyzing' || status === 'creating';
  const showResults = status === 'showing-results';

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-[var(--color-overlay)] transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-[var(--color-bg-dialog)] text-left shadow-xl transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-2xl data-closed:sm:translate-y-0 data-closed:sm:scale-95 dark:outline dark:-outline-offset-1 dark:outline-white/10"
          >
            {/* Header */}
            <div className="px-6 py-6 border-b border-[var(--color-border-primary)] flex items-center justify-between">
              <DialogTitle
                as="h2"
                className="text-xl font-semibold text-[var(--color-text-primary)] m-0 flex items-center gap-2"
              >
                <BoltIcon
                  aria-hidden="true"
                  className="w-6 h-6 text-[var(--color-accent-primary)]"
                />
                {showResults ? 'Pick Your First Step' : 'Create Momentum'}
              </DialogTitle>
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="bg-transparent border-0 text-2xl text-[var(--color-text-secondary)] p-0 w-8 h-8 flex items-center justify-center rounded-md transition-all duration-150 hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
                aria-label="Close dialog"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <form onSubmit={handleAnalyze}>
              <div className="px-6 py-6 space-y-4">
                {/* Current Todo Display */}
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                    Task You're Avoiding
                  </label>
                  <div className="rounded-lg bg-[var(--color-bg-secondary)] p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 text-[var(--color-text-primary)]">
                        <SmartEditor
                          html={todo.text}
                          editing={false}
                          availableTags={[]}
                        />
                      </div>
                      {todo.moveCount && todo.moveCount > 0 && (
                        <span className="inline-flex items-center rounded-md bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 text-xs font-medium text-yellow-800 dark:text-yellow-400">
                          Moved {todo.moveCount} {todo.moveCount === 1 ? 'time' : 'times'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Context Input (only show in idle or error state) */}
                {!showResults && (
                  <div>
                    <label htmlFor="context" className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                      What's making you stuck?
                      <span className="text-[var(--color-text-tertiary)] font-normal ml-1">(Optional)</span>
                    </label>
                    <div className="rounded-lg bg-[var(--color-bg-dialog)] outline-1 -outline-offset-1 outline-[var(--color-border-secondary)] focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-[var(--color-accent-primary)]">
                      <textarea
                        id="context"
                        name="context"
                        rows={4}
                        placeholder="E.g., 'Too vague', 'Don't know where to start', 'Need to make a decision first', 'Waiting on someone'..."
                        className="block w-full resize-none px-3 py-2 text-base text-[var(--color-text-primary)] placeholder:text-[var(--color-text-tertiary)] focus:outline-none sm:text-sm/6 bg-transparent"
                        value={userContext}
                        onChange={(e) => setUserContext(e.target.value)}
                        disabled={isProcessing}
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                {/* Suggestions Display */}
                {showResults && suggestions && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                      Suggested First Steps (5-15 min each)
                    </label>
                    <p className="text-sm text-[var(--color-text-tertiary)] mb-3">
                      Click one to add it as a new todo
                    </p>
                    <div className="space-y-2">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSelectSuggestion(suggestion)}
                          disabled={status !== 'showing-results'}
                          className="w-full text-left p-4 rounded-lg bg-[var(--color-bg-secondary)] hover:bg-[var(--color-bg-hover)] border-2 border-transparent hover:border-[var(--color-accent-primary)] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent-text)] flex items-center justify-center text-sm font-medium group-hover:bg-[var(--color-accent-primary)] group-hover:text-white transition-colors">
                              {index + 1}
                            </div>
                            <p className="flex-1 text-[var(--color-text-primary)] text-base">
                              {suggestion}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Success message (for creating state) */}
                {status === 'creating' && (
                  <div className="rounded-md bg-green-50 p-3 dark:bg-green-900/20">
                    <div className="flex">
                      <CheckCircleIcon aria-hidden="true" className="size-5 text-green-400" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-800 dark:text-green-400">
                          Creating your first step...
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error message */}
                {status === 'error' && error && (
                  <div className="rounded-md bg-red-50 p-3 dark:bg-red-900/20">
                    <div className="flex">
                      <ExclamationCircleIcon aria-hidden="true" className="size-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-red-800 dark:text-red-400">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-[var(--color-bg-dialog-footer)] px-6 py-6 flex justify-end gap-3">
                {!showResults ? (
                  <>
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isProcessing}
                      className="inline-flex justify-center rounded-md bg-transparent px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="inline-flex justify-center rounded-md bg-[var(--color-accent-primary)] px-3 py-2 text-sm font-semibold text-white shadow-xs hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)] disabled:opacity-50"
                    >
                      {status === 'analyzing' ? 'Finding options...' : 'Get Suggestions'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isProcessing}
                    className="inline-flex justify-center rounded-md bg-transparent px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
