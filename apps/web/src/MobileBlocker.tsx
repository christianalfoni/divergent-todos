import { ARTICLE_URL } from "./constants/links";

export default function MobileBlocker() {
  return (
    <div class="h-screen w-screen flex items-center justify-center bg-[var(--color-bg-primary)] p-6">
      <div class="max-w-md text-center space-y-6">
        {/* Logo */}
        <div class="flex justify-center">
          <svg
            width="64"
            height="64"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            class="h-16 w-auto"
            aria-label="Divergent Todos"
          >
            {/* Upper left corner */}
            <path
              d="M 8 4 L 4 4 L 4 8"
              stroke="var(--color-accent-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Lower right corner */}
            <path
              d="M 24 28 L 28 28 L 28 24"
              stroke="var(--color-accent-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            {/* Checkmark - extended to edges */}
            <path
              d="M6 16L12 22L26 8"
              stroke="var(--color-accent-primary)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 class="text-2xl font-light text-[var(--color-text-primary)] tracking-wider">
          Divergent Todos
        </h1>

        {/* Message */}
        <div class="space-y-4 text-[var(--color-text-secondary)]">
          <p class="text-lg">
            This app is designed for your workdays and is not supported on
            mobile devices.
          </p>
          <p>
            Your mobile is often a mix of work and private life. We want to do
            what we can to not bring work into your private life.
          </p>
        </div>

        {/* Link to article */}
        <div class="pt-4">
          <a
            href={ARTICLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 text-[var(--color-accent-primary)] hover:text-[var(--color-accent-text-hover)] font-medium"
          >
            Read more about our philosophy
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
