import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { signOut } from "firebase/auth";
import { useAuthentication } from "./hooks/useAuthentication";
import { auth, type Profile } from "./firebase";
import { useTheme, type Theme } from "./hooks/useTheme";
import UpdateNotification from "./UpdateNotification";

function getDownloadUrl(): string | null {
  // Check if running in Electron
  if (window.navigator.userAgent.includes("Electron")) {
    return null; // Don't show download link in desktop app
  }

  const platform = window.navigator.platform.toLowerCase();
  const userAgent = window.navigator.userAgent.toLowerCase();

  // macOS detection
  if (platform.includes("mac") || userAgent.includes("mac")) {
    // Prefer ARM64 for Apple Silicon, but GitHub doesn't have architecture detection
    // Default to ARM64 as most modern Macs are Apple Silicon
    return "https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent.Todos-mac-arm64.dmg";
  }

  // Windows detection
  if (platform.includes("win") || userAgent.includes("windows")) {
    return "https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent.Todos-win-x64.exe";
  }

  // Linux detection
  if (platform.includes("linux") || userAgent.includes("linux")) {
    return "https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent.Todos-linux-x64.AppImage";
  }

  // Default to macOS if platform cannot be determined
  return "https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent.Todos-mac-arm64.dmg";
}

interface TopBarProps {
  oldTodoCount?: number;
  onMoveOldTodos?: () => void;
  profile?: Profile | null;
  onOpenSubscription?: () => void;
}

export default function TopBar({ oldTodoCount = 0, onMoveOldTodos, profile, onOpenSubscription }: TopBarProps) {
  const authentication = useAuthentication();
  const { theme, setTheme } = useTheme();
  const downloadUrl = getDownloadUrl();

  const handleSignOut = () => {
    signOut(auth);
  };

  const themes: { value: Theme; label: string }[] = [
    { value: "default", label: "Default" },
    { value: "ocean", label: "Ocean" },
    { value: "forest", label: "Forest" },
    { value: "sunset", label: "Sunset" },
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
          <div className="hidden sm:ml-6 sm:flex sm:items-center gap-3">
            {/* Update notification */}
            {authentication.user && <UpdateNotification />}

            {/* Free todo counter - only show if user has no active subscription */}
            {authentication.user && profile && profile.subscription?.status !== 'active' && profile.subscription?.status !== 'trialing' && (
              <div className="flex items-center gap-x-2 text-sm text-[var(--color-text-secondary)]">
                <span>{profile.freeTodoCount || 0} / 20 free todos added</span>
              </div>
            )}

            {/* Subscribe button - only show if user has no active subscription */}
            {authentication.user && profile && profile.subscription?.status !== 'active' && profile.subscription?.status !== 'trialing' && onOpenSubscription && (
              <button
                onClick={onOpenSubscription}
                className="relative flex items-center gap-x-2 rounded-md px-3 py-2 text-sm font-semibold text-white bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)]"
              >
                Subscribe
              </button>
            )}

            {/* Old todos indicator */}
            {authentication.user && oldTodoCount > 0 && onMoveOldTodos && (
              <button
                onClick={onMoveOldTodos}
                className="relative flex items-center gap-x-2 rounded-md px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-bg-menu-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)]"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  className="size-5 shrink-0"
                >
                  <path
                    d="M10 3V17M10 17L14 13M10 17L6 13"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>Move {oldTodoCount} uncompleted todo{oldTodoCount === 1 ? '' : 's'}</span>
              </button>
            )}

            {/* Profile dropdown - hide for anonymous users */}
            {authentication.user && !authentication.user.isAnonymous && (
              <Menu as="div" className="relative">
              <MenuButton className="relative flex max-w-xs items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent-primary)]">
                <span className="absolute -inset-1.5" />
                <span className="sr-only">Open user menu</span>
                <img
                  alt=""
                  src={
                    authentication.user.photoURL ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      authentication.user.displayName ||
                        authentication.user.email ||
                        "User"
                    )}`
                  }
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

                {downloadUrl && (
                  <MenuItem>
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                    >
                      Download app
                    </a>
                  </MenuItem>
                )}

                <div className="my-1 h-px bg-[var(--color-border-primary)]" />

                {themes.map((themeOption) => (
                  <MenuItem key={themeOption.value}>
                    <button
                      onClick={() => setTheme(themeOption.value)}
                      className="block w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                    >
                      {themeOption.label}
                      {theme === themeOption.value && (
                        <span className="ml-2 text-[var(--color-accent-text)]">
                          ✓
                        </span>
                      )}
                    </button>
                  </MenuItem>
                ))}

                {!authentication.user.isAnonymous && (
                  <>
                    <div className="my-1 h-px bg-[var(--color-border-primary)]" />

                    <MenuItem>
                      <button
                        onClick={handleSignOut}
                        className="block w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
                      >
                        Sign out
                      </button>
                    </MenuItem>
                  </>
                )}
              </MenuItems>
            </Menu>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
