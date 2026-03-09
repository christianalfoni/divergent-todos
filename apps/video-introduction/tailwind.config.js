/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Match Divergent Todos color scheme
        accent: {
          primary: 'var(--color-accent-primary, #6366f1)',
          hover: 'var(--color-accent-hover, #4f46e5)',
        },
        bg: {
          primary: 'var(--color-bg-primary, #ffffff)',
          secondary: 'var(--color-bg-secondary, #f9fafb)',
          hover: 'var(--color-bg-hover, #f3f4f6)',
        },
        text: {
          primary: 'var(--color-text-primary, #111827)',
          secondary: 'var(--color-text-secondary, #6b7280)',
          inverse: 'var(--color-text-inverse, #ffffff)',
        },
        border: {
          primary: 'var(--color-border-primary, #e5e7eb)',
          secondary: 'var(--color-border-secondary, #d1d5db)',
        },
      },
    },
  },
  plugins: [],
};
