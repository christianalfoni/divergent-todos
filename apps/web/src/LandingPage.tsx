import { useEffect, useMemo } from "react";
import { ChevronRightIcon, ArrowDownTrayIcon } from "@heroicons/react/20/solid";
import { useSignIn } from "./hooks/useSignIn";
import { useSignInAnonymously } from "./hooks/useSignInAnonymously";
import { useAuthentication } from "./hooks/useAuthentication";
import { useTestSignin } from "./hooks/useTestSignin";
import Calendar from "./Calendar";
import type { Todo } from "./App";
import type { Profile } from "./firebase";

interface LandingPageProps {
  onAuthenticated: () => void;
}

// Mock data for preview
const createMockTodos = (): Todo[] => {
  const today = new Date();

  // Start from Monday of current week or next Monday if it's weekend
  const dayOfWeek = today.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const startDate = new Date(today);

  if (isWeekend) {
    // Go to next Monday
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 2;
    startDate.setDate(today.getDate() + daysUntilMonday);
  } else {
    // Go to Monday of current week
    const daysFromMonday = dayOfWeek - 1;
    startDate.setDate(today.getDate() - daysFromMonday);
  }

  // Get 15 workdays (3 weeks)
  const workdays: string[] = [];
  let currentDate = new Date(startDate);
  while (workdays.length < 15) {
    const day = currentDate.getDay();
    if (day !== 0 && day !== 6) { // Not weekend
      workdays.push(currentDate.toISOString().split("T")[0]);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return [
    // Week 1 - Monday
    {
      id: "1",
      text: 'Review team PRs <span class="smartlink-chip" data-url="https://github.com" contenteditable="false">github.com</span> <span class="tag-pill tag-pill-blue" data-tag="#code" contenteditable="false">code</span>',
      completed: true,
      date: workdays[0],
      position: "a0",
      createdAt: new Date(),
      url: "https://github.com"
    },
    {
      id: "2",
      text: 'Design API endpoints <span class="smartlink-chip" data-url="https://docs.example.com" contenteditable="false">docs.example.com</span> <span class="tag-pill tag-pill-indigo" data-tag="#backend" contenteditable="false">backend</span>',
      completed: true,
      date: workdays[0],
      position: "a1",
      createdAt: new Date(),
      url: "https://docs.example.com"
    },
    {
      id: "3",
      text: 'Write onboarding guide for new devs <span class="tag-pill tag-pill-yellow" data-tag="#docs" contenteditable="false">docs</span>',
      completed: false,
      date: workdays[0],
      position: "a2",
      createdAt: new Date()
    },
    {
      id: "4",
      text: 'Reply to Sarah\'s email about Q2 budget',
      completed: false,
      date: workdays[0],
      position: "a3",
      createdAt: new Date()
    },

    // Tuesday
    {
      id: "5",
      text: 'Explore component library options <span class="smartlink-chip" data-url="https://figma.com" contenteditable="false">figma.com</span> <span class="tag-pill tag-pill-pink" data-tag="#design" contenteditable="false">design</span>',
      completed: false,
      date: workdays[1],
      position: "a0",
      createdAt: new Date(),
      url: "https://figma.com"
    },
    {
      id: "6",
      text: 'Learn Rust async patterns <span class="tag-pill tag-pill-yellow" data-tag="#learning" contenteditable="false">learning</span>',
      completed: false,
      date: workdays[1],
      position: "a1",
      createdAt: new Date()
    },
    {
      id: "7",
      text: 'Refactor authentication module <span class="tag-pill tag-pill-purple" data-tag="#refactor" contenteditable="false">refactor</span>',
      completed: false,
      date: workdays[1],
      position: "a2",
      createdAt: new Date()
    },

    // Wednesday
    {
      id: "8",
      text: 'Plan Q2 product roadmap <span class="tag-pill tag-pill-indigo" data-tag="#strategy" contenteditable="false">strategy</span>',
      completed: false,
      date: workdays[2],
      position: "a0",
      createdAt: new Date()
    },
    {
      id: "9",
      text: 'Fix critical payment bug <span class="smartlink-chip" data-url="https://linear.app/issue/PAY-123" contenteditable="false">linear.app</span> <span class="tag-pill tag-pill-red" data-tag="#urgent" contenteditable="false">urgent</span>',
      completed: true,
      date: workdays[2],
      position: "a1",
      createdAt: new Date(),
      url: "https://linear.app/issue/PAY-123"
    },
    {
      id: "10",
      text: 'Respond to infrastructure thread on Slack <span class="smartlink-chip" data-url="https://slack.com" contenteditable="false">slack.com</span>',
      completed: false,
      date: workdays[2],
      position: "a2",
      createdAt: new Date(),
      url: "https://slack.com"
    },

    // Thursday
    {
      id: "11",
      text: 'Build dashboard analytics view <span class="tag-pill tag-pill-green" data-tag="#feature" contenteditable="false">feature</span>',
      completed: false,
      date: workdays[3],
      position: "a0",
      createdAt: new Date()
    },
    {
      id: "12",
      text: 'Prepare demo for stakeholders <span class="smartlink-chip" data-url="https://slides.example.com" contenteditable="false">slides.example.com</span>',
      completed: false,
      date: workdays[3],
      position: "a1",
      createdAt: new Date(),
      url: "https://slides.example.com"
    },
    {
      id: "13",
      text: 'Set up CI/CD pipeline <span class="tag-pill tag-pill-gray" data-tag="#infra" contenteditable="false">infra</span>',
      completed: false,
      date: workdays[3],
      position: "a2",
      createdAt: new Date()
    },

    // Friday
    {
      id: "14",
      text: 'Research performance bottlenecks <span class="tag-pill tag-pill-purple" data-tag="#perf" contenteditable="false">perf</span>',
      completed: false,
      date: workdays[4],
      position: "a0",
      createdAt: new Date()
    },
    {
      id: "15",
      text: 'Update deployment docs <span class="smartlink-chip" data-url="https://staging.example.com" contenteditable="false">staging.example.com</span>',
      completed: false,
      date: workdays[4],
      position: "a1",
      createdAt: new Date(),
      url: "https://staging.example.com"
    },
    {
      id: "16",
      text: 'Draft proposal email for client onboarding',
      completed: false,
      date: workdays[4],
      position: "a2",
      createdAt: new Date()
    },
  ];
};

const mockProfile: Profile = {
  theme: "system",
  fontSize: "medium",
  isOnboarded: true,
  viewMode: "one-week",
};

export default function LandingPage({ onAuthenticated }: LandingPageProps) {
  const [authentication] = useAuthentication();
  const [{ isSigningIn }, signIn] = useSignIn();
  const [{ isSigningIn: isSigningInAnonymously }, signInAnonymously] = useSignInAnonymously();
  const { signInAsTestUser, loading: isTestSigningIn, error: testSignInError } = useTestSignin();

  // Check if running in Electron
  const isElectron = window.navigator.userAgent.includes("Electron");

  // Mock todos for preview
  const mockTodos = useMemo(() => createMockTodos(), []);

  // When we have a user, flip to app
  useEffect(() => {
    if (authentication.user) {
      onAuthenticated();
    }
  }, [authentication.user, onAuthenticated]);

  return (
    <div className="bg-white dark:bg-gray-900 h-screen overflow-hidden">
      <main className="h-full">
        {/* Hero section */}
        <div className="relative isolate overflow-hidden bg-white dark:bg-gray-900 h-full">
          <svg
            aria-hidden="true"
            className="absolute inset-0 -z-10 size-full mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-gray-200 dark:stroke-white/10"
          >
            <defs>
              <pattern
                x="50%"
                y={-1}
                id="983e3e4c-de6d-4c3f-8d64-b9761d1534cc"
                width={200}
                height={200}
                patternUnits="userSpaceOnUse"
              >
                <path d="M.5 200V.5H200" fill="none" />
              </pattern>
            </defs>
            <svg x="50%" y={-1} className="overflow-visible fill-gray-50 dark:fill-gray-800/20">
              <path
                d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
                strokeWidth={0}
              />
            </svg>
            <rect fill="url(#983e3e4c-de6d-4c3f-8d64-b9761d1534cc)" width="100%" height="100%" strokeWidth={0} />
          </svg>
          <div
            aria-hidden="true"
            className="absolute top-10 left-[calc(50%-4rem)] -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:top-[calc(50%-30rem)] lg:left-48 xl:left-[calc(50%-24rem)]"
          >
            <div
              style={{
                clipPath:
                  'polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)',
              }}
              className="aspect-1108/632 w-277 bg-linear-to-r from-[#80caff] to-[#4f46e5] opacity-20"
            />
          </div>
          <div className="mx-auto max-w-7xl px-6 h-full flex items-center lg:px-8">
            <div className="mx-auto max-w-2xl shrink-0 lg:mx-0">
              <div className="flex items-center gap-3">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-11 w-auto"
                  aria-label="Divergent Todos"
                >
                  {/* Upper left corner */}
                  <path
                    d="M 8 4 L 4 4 L 4 8"
                    stroke="rgb(79 70 229)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    className="dark:stroke-indigo-400"
                  />
                  {/* Lower right corner */}
                  <path
                    d="M 24 28 L 28 28 L 28 24"
                    stroke="rgb(79 70 229)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    className="dark:stroke-indigo-400"
                  />
                  {/* Checkmark - extended to edges */}
                  <path
                    d="M6 16L12 22L26 8"
                    stroke="rgb(79 70 229)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="dark:stroke-indigo-400"
                  />
                </svg>
                <span className="text-lg font-light text-gray-900 dark:text-white tracking-widest">
                  DIVERGENT TODOS
                </span>
              </div>
              <div className="mt-10 sm:mt-12 lg:mt-8">
                <a href="https://www.youtube.com/watch?v=qBoONStM63Y" target="_blank" rel="noopener noreferrer" className="inline-flex space-x-6">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-sm/6 font-semibold text-indigo-600 ring-1 ring-indigo-600/20 ring-inset dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/25">
                    Video Introduction
                  </span>
                  <span className="inline-flex items-center space-x-2 text-sm/6 font-medium text-gray-600 dark:text-gray-300">
                    <span>Watch a 1,5 minute pep talk</span>
                    <ChevronRightIcon aria-hidden="true" className="size-5 text-gray-400 dark:text-gray-500" />
                  </span>
                </a>
              </div>
              <h1 className="mt-10 text-5xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-7xl dark:text-white">
                Own Your Attention with Divergent Todos
              </h1>
              <p className="mt-8 text-lg font-medium text-pretty text-gray-500 sm:text-xl/8 dark:text-gray-400">
                Stop letting your tools compete for your attention. Plan where your focus goes, one day at a time.
              </p>
              <div className="mt-10">
                <div className="flex items-center justify-between gap-x-6">
                  <div className="flex items-center gap-x-6">
                    {import.meta.env.DEV && (
                      <button
                        type="button"
                        onClick={signInAsTestUser}
                        disabled={isSigningIn || isSigningInAnonymously || isTestSigningIn}
                        className="rounded-md bg-yellow-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-yellow-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-yellow-600 dark:bg-yellow-500 dark:hover:bg-yellow-400 dark:focus-visible:outline-yellow-500 disabled:opacity-50"
                      >
                        {isTestSigningIn ? "Creating..." : "Test App"}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => signInAnonymously({})}
                      disabled={isSigningIn || isSigningInAnonymously || isTestSigningIn}
                      className="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-500 disabled:opacity-50"
                    >
                      {isSigningInAnonymously ? "Starting..." : "Try App"}
                    </button>
                    <button
                      type="button"
                      onClick={() => signIn({})}
                      disabled={isSigningIn || isSigningInAnonymously || isTestSigningIn}
                      className="rounded-md bg-white dark:bg-gray-800 px-3.5 py-2.5 text-sm font-semibold text-gray-900 dark:text-white shadow-xs ring-1 ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-600 disabled:opacity-50 flex items-center justify-center gap-2"
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
                      {isSigningIn ? (isElectron ? "Signing in with browser..." : "Signing in...") : "Sign In"}
                    </button>
                  </div>
                  {!isElectron && (
                    <a
                      href="https://github.com/ChristianAlfoni/divergent-todos/releases/latest"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 text-sm/6 font-semibold text-gray-900 dark:text-white"
                    >
                      <ArrowDownTrayIcon className="size-5" />
                      Download app <span aria-hidden="true">→</span>
                    </a>
                  )}
                </div>
                {testSignInError && import.meta.env.DEV && (
                  <p className="mt-4 text-sm text-red-600 dark:text-red-400">
                    {testSignInError}
                  </p>
                )}
                {/* Terms */}
                <p className="mt-4 text-xs text-gray-600 dark:text-gray-400">
                  By signing in, you agree to our{" "}
                  <a
                    href={isElectron ? "https://divergent-todos.com/terms" : "/terms"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-500 underline dark:text-indigo-400 dark:hover:text-indigo-300 cursor-default"
                  >
                    Terms of Service
                  </a>
                </p>
              </div>
            </div>
            <div className="hidden lg:flex lg:ml-10 xl:ml-32 lg:mr-0 lg:flex-none lg:max-w-none">
              <div className="w-[900px] h-[600px] pointer-events-none rounded-md shadow-xl ring-1 ring-gray-900/10 dark:ring-white/10 overflow-hidden flex flex-col bg-[var(--color-bg-primary)]">
                <div className="w-[1400px] h-[700px] flex flex-col">
                  <Calendar
                    todos={mockTodos}
                    isLoading={false}
                    onAddTodo={() => {}}
                    onToggleTodoComplete={() => {}}
                    onMoveTodo={() => {}}
                    onCopyTodo={() => {}}
                    onUpdateTodo={() => {}}
                    onDeleteTodo={() => {}}
                    onMoveIncompleteTodosToToday={() => {}}
                    hasOldUncompletedTodos={false}
                    profile={mockProfile}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
