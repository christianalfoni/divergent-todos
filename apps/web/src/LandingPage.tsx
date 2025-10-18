import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { ARTICLE_URL } from "./constants/links";

interface LandingPageProps {
  onSignInGoogle: () => void;
  onSignInAnonymous: () => void;
}

export default function LandingPage({ onSignInGoogle, onSignInAnonymous }: LandingPageProps) {
  // Check if running in Electron
  const isElectron = window.navigator.userAgent.includes("Electron");

  return (
    <div className="bg-[var(--color-bg-primary)] min-h-screen overflow-y-auto">
      <div className="relative isolate px-6 pt-14 pb-16 lg:px-8">
        <div
          aria-hidden="true"
          className="fixed inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          />
        </div>
        <div className="mx-auto max-w-4xl py-16 sm:py-24 lg:py-32">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-semibold tracking-tight text-balance text-[var(--color-text-primary)] sm:text-6xl">
              Direct Your Attention with Divergent Todos
            </h1>
            <p className="mt-6 text-lg font-medium text-pretty text-[var(--color-text-secondary)] sm:text-xl/8">
              Stop letting your tools compete for your attention. Plan where your focus goes, one day at a time.
            </p>
          </div>

          {/* Video Container */}
          <div className="mb-12">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg shadow-xl"
                src="https://www.youtube.com/embed/PUSC0V2IEvc"
                title="Divergent Todos Introduction"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center gap-4 mb-8">
            <button
              type="button"
              onClick={onSignInGoogle}
              className="flex w-full max-w-md items-center justify-center gap-3 rounded-md bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:ring-transparent dark:bg-white/10 dark:text-white dark:shadow-none dark:ring-white/5 dark:hover:bg-white/20"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
                <path
                  d="M12.0003 4.75C13.7703 4.75 15.3553 5.36002 16.6053 6.54998L20.0303 3.125C17.9502 1.19 15.2353 0 12.0003 0C7.31028 0 3.25527 2.69 1.28027 6.60998L5.27028 9.70498C6.21525 6.86002 8.87028 4.75 12.0003 4.75Z"
                  fill="#EA4335"
                />
                <path
                  d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z"
                  fill="#4285F4"
                />
                <path
                  d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z"
                  fill="#FBBC05"
                />
                <path
                  d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.8704 19.245 6.21537 17.135 5.2654 14.29L1.27539 17.385C3.25539 21.31 7.3104 24.0001 12.0004 24.0001Z"
                  fill="#34A853"
                />
              </svg>
              <span className="text-sm/6 font-semibold">Sign in with Google</span>
            </button>

            <button
              type="button"
              onClick={onSignInAnonymous}
              className="flex w-full max-w-md items-center justify-center gap-3 rounded-md bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:ring-transparent dark:bg-white/10 dark:text-white dark:shadow-none dark:ring-white/5 dark:hover:bg-white/20"
            >
              Let me try it first
            </button>

            {!isElectron && (
              <>
                <div className="relative w-full max-w-md">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-white/10"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[var(--color-bg-primary)] px-2 text-gray-500 dark:text-gray-400">
                      Or
                    </span>
                  </div>
                </div>
                <a
                  href="https://github.com/ChristianAlfoni/divergent-todos/releases/latest"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full max-w-md items-center justify-center gap-3 rounded-md bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:ring-transparent dark:bg-white/10 dark:text-white dark:shadow-none dark:ring-white/5 dark:hover:bg-white/20"
                >
                  <ArrowDownTrayIcon className="size-5" />
                  Download Desktop App
                </a>
              </>
            )}
          </div>

          {/* Article Link */}
          <div className="flex justify-center mb-8">
            <a
              href={ARTICLE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm/6 font-semibold text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]"
            >
              Read the full article <span aria-hidden="true">→</span>
            </a>
          </div>

          {/* Terms */}
          <p className="text-xs text-[var(--color-text-secondary)] text-center">
            By signing in, you agree to our{" "}
            <a
              href={isElectron ? "https://divergent-todos.com/terms" : "/terms"}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)] underline"
            >
              Terms of Service
            </a>
          </p>
        </div>
        <div
          aria-hidden="true"
          className="fixed inset-x-0 bottom-0 -z-10 transform-gpu overflow-hidden blur-3xl"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          />
        </div>
      </div>
    </div>
  );
}
