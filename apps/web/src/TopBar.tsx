import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { signOut } from 'firebase/auth';
import { useAuthentication } from './hooks/useAuthentication';
import { auth } from './firebase';
import { useTheme, type Theme } from './hooks/useTheme';
import UpdateNotification from './UpdateNotification';

export default function TopBar() {
  const [authentication] = useAuthentication();
  const { theme, setTheme } = useTheme();

  if (!authentication.user) {
    return null;
  }

  const handleSignOut = () => {
    signOut(auth);
  };

  const themes: { value: Theme; label: string }[] = [
    { value: 'default', label: 'Default' },
    { value: 'ocean', label: 'Ocean' },
    { value: 'forest', label: 'Forest' },
    { value: 'sunset', label: 'Sunset' },
  ];

  return (
    <nav className="border-b bg-[var(--color-bg-nav)] border-[var(--color-border-primary)]">
      <div className="px-4">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex shrink-0 items-center gap-3">
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-auto"
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
              <span className="text-lg font-light text-[var(--color-text-primary)] font-(logo:--font-logo) tracking-widest">
                Divergent Todos
              </span>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {/* Update notification */}
            <UpdateNotification />

            {/* Profile dropdown */}
            <Menu as="div" className="relative ml-3">
              <MenuButton className="relative flex max-w-xs items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)]">
                <span className="absolute -inset-1.5" />
                <span className="sr-only">Open user menu</span>
                <img
                  alt=""
                  src={authentication.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(authentication.user.displayName || authentication.user.email || 'User')}`}
                  className="size-8 rounded-full outline -outline-offset-1 outline-[var(--color-outline)]"
                />
              </MenuButton>

              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-[var(--color-bg-primary)] py-1 shadow-lg outline outline-[var(--color-outline)] transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:shadow-none dark:-outline-offset-1"
              >
                <MenuItem>
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                  >
                    Subscription
                  </a>
                </MenuItem>

                <div className="my-1 h-px bg-[var(--color-border-primary)]" />

                {themes.map((themeOption) => (
                  <MenuItem key={themeOption.value}>
                    <button
                      onClick={() => setTheme(themeOption.value)}
                      className="block w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                    >
                      {themeOption.label}
                      {theme === themeOption.value && (
                        <span className="ml-2 text-[var(--color-accent-text)]">✓</span>
                      )}
                    </button>
                  </MenuItem>
                ))}

                <div className="my-1 h-px bg-[var(--color-border-primary)]" />

                <MenuItem>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                  >
                    Sign out
                  </button>
                </MenuItem>
              </MenuItems>
            </Menu>
          </div>
        </div>
      </div>
    </nav>
  );
}
