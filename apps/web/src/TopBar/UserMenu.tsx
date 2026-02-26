import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  ArrowLeftOnRectangleIcon,
  BanknotesIcon,
  CheckIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  UserCircleIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline";
import { CodeBracketIcon } from "@heroicons/react/20/solid";
import type { User } from "firebase/auth";
import { type Theme } from "../hooks/useTheme";
import { type FontSize } from "../hooks/useFontSize";
import { ARTICLE_URL, YOUTUBE_VIDEO_URL } from "../constants/links";

interface UserMenuProps {
  user: User;
  theme: Theme;
  fontSize: FontSize;
  downloadUrl: string | null;
  onSignOut: () => void;
  onSubscriptionClick: () => void;
  onDownloadAppClick: () => void;
  onThemeClick: (theme: Theme) => void;
  onFontSizeClick: (size: FontSize) => void;
  onGitHubClick: () => void;
  onFeedbackClick: () => void;
  onCreateAccountClick: () => void;
  onOpenOnboarding?: () => void;
  onMenuItemClick: (item: string) => void;
}

const themes: { value: Theme; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "ocean", label: "Ocean" },
  { value: "forest", label: "Forest" },
  { value: "sunset", label: "Sunset" },
];

const fontSizes: { value: FontSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

export default function UserMenu({
  user,
  theme,
  fontSize,
  downloadUrl,
  onSignOut,
  onSubscriptionClick,
  onDownloadAppClick,
  onThemeClick,
  onFontSizeClick,
  onGitHubClick,
  onFeedbackClick,
  onCreateAccountClick,
  onOpenOnboarding,
  onMenuItemClick,
}: UserMenuProps) {
  // Get photoURL from user object or fall back to providerData
  const photoURL = user.photoURL || user.providerData.find(p => p.providerId === 'google.com')?.photoURL;

  return (
    <Menu as="div" className="relative">
      <MenuButton className="relative flex max-w-xs items-center p-2 rounded-md focus:outline-none">
        <span className="absolute -inset-1.5" />
        <span className="sr-only">Open user menu</span>
        {photoURL ? (
          <img
            alt=""
            src={photoURL}
            className="size-8 rounded-full outline -outline-offset-1 outline-[var(--color-outline)]"
          />
        ) : (
          <span className="inline-block size-8 overflow-hidden rounded-full bg-[var(--color-bg-primary)] outline -outline-offset-1 outline-[var(--color-outline)]">
            <svg
              fill="currentColor"
              viewBox="0 0 24 24"
              className="size-full text-[var(--color-text-tertiary)]"
            >
              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </span>
        )}
      </MenuButton>

      <MenuItems
        transition
        className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-[var(--color-bg-primary)] py-1 shadow-lg outline outline-[var(--color-outline)] transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:shadow-none dark:-outline-offset-1"
      >
        {user.isAnonymous ? (
          <AnonymousUserMenu
            theme={theme}
            fontSize={fontSize}
            downloadUrl={downloadUrl}
            onThemeClick={onThemeClick}
            onFontSizeClick={onFontSizeClick}
            onGitHubClick={onGitHubClick}
            onFeedbackClick={onFeedbackClick}
            onCreateAccountClick={onCreateAccountClick}
            onDownloadAppClick={onDownloadAppClick}
            onOpenOnboarding={onOpenOnboarding}
            onSignOut={onSignOut}
            onMenuItemClick={onMenuItemClick}
          />
        ) : (
          <AuthenticatedUserMenu
            theme={theme}
            fontSize={fontSize}
            downloadUrl={downloadUrl}
            onSubscriptionClick={onSubscriptionClick}
            onDownloadAppClick={onDownloadAppClick}
            onOpenOnboarding={onOpenOnboarding}
            onThemeClick={onThemeClick}
            onFontSizeClick={onFontSizeClick}
            onGitHubClick={onGitHubClick}
            onFeedbackClick={onFeedbackClick}
            onSignOut={onSignOut}
            onMenuItemClick={onMenuItemClick}
          />
        )}
      </MenuItems>
    </Menu>
  );
}

interface MenuSectionProps {
  theme: Theme;
  fontSize: FontSize;
  downloadUrl: string | null;
  onThemeClick: (theme: Theme) => void;
  onFontSizeClick: (size: FontSize) => void;
  onGitHubClick: () => void;
  onFeedbackClick: () => void;
  onDownloadAppClick: () => void;
  onSignOut: () => void;
  onMenuItemClick: (item: string) => void;
}

function AnonymousUserMenu({
  theme,
  fontSize,
  downloadUrl,
  onThemeClick,
  onFontSizeClick,
  onGitHubClick,
  onFeedbackClick,
  onCreateAccountClick,
  onDownloadAppClick,
  onOpenOnboarding,
  onSignOut,
  onMenuItemClick,
}: MenuSectionProps & { onCreateAccountClick: () => void; onOpenOnboarding?: () => void }) {
  return (
    <>
      <MenuItem>
        <button
          onClick={onSignOut}
          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
        >
          <ArrowLeftOnRectangleIcon
            aria-hidden="true"
            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
          />
          Sign out
        </button>
      </MenuItem>

      {downloadUrl && (
        <MenuItem>
          <button
            onClick={onDownloadAppClick}
            className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
          >
            <ArrowDownTrayIcon
              aria-hidden="true"
              className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
            />
            Download app
          </button>
        </MenuItem>
      )}

      {onOpenOnboarding && (
        <MenuItem>
          <button
            onClick={() => {
              onMenuItemClick("restart_onboarding");
              onOpenOnboarding();
            }}
            className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
          >
            <AcademicCapIcon
              aria-hidden="true"
              className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
            />
            Tutorial
          </button>
        </MenuItem>
      )}

      <MenuDivider label="Themes" />

      {themes.map((themeOption) => (
        <MenuItem key={themeOption.value}>
          <button
            onClick={() => onThemeClick(themeOption.value)}
            className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
          >
            {theme === themeOption.value ? (
              <CheckIcon
                aria-hidden="true"
                className="mr-3 size-5 text-[var(--color-accent-text)]"
              />
            ) : (
              <span className="mr-3 size-5" aria-hidden="true" />
            )}
            {themeOption.label}
          </button>
        </MenuItem>
      ))}

      <MenuDivider label="Text" />

      {fontSizes.map((sizeOption) => (
        <MenuItem key={sizeOption.value}>
          <button
            onClick={() => onFontSizeClick(sizeOption.value)}
            className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
          >
            {fontSize === sizeOption.value ? (
              <CheckIcon
                aria-hidden="true"
                className="mr-3 size-5 text-[var(--color-accent-text)]"
              />
            ) : (
              <span className="mr-3 size-5" aria-hidden="true" />
            )}
            {sizeOption.label}
          </button>
        </MenuItem>
      ))}

      <MenuDivider label="Resources" />

      <MenuItem>
        <a
          href={YOUTUBE_VIDEO_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onMenuItemClick("welcome_video")}
          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
        >
          <PlayCircleIcon
            aria-hidden="true"
            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
          />
          Pep Talk
        </a>
      </MenuItem>

      <MenuItem>
        <a
          href={ARTICLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onMenuItemClick("introduction_article")}
          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
        >
          <DocumentTextIcon
            aria-hidden="true"
            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
          />
          Introduction Article
        </a>
      </MenuItem>

      <MenuItem>
        <a
          href="https://github.com/christianalfoni/divergent-todos"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onGitHubClick}
          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
        >
          <CodeBracketIcon
            aria-hidden="true"
            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
          />
          Open Source Code
        </a>
      </MenuItem>

      <MenuItem>
        <button
          onClick={onFeedbackClick}
          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
        >
          <ChatBubbleLeftRightIcon
            aria-hidden="true"
            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
          />
          Feedback
        </button>
      </MenuItem>

      <div className="my-1 h-px bg-[var(--color-border-primary)]" />

      <MenuItem>
        <button
          onClick={onSignOut}
          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
        >
          <ArrowLeftOnRectangleIcon
            aria-hidden="true"
            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
          />
          Sign out
        </button>
      </MenuItem>
    </>
  );
}

function AuthenticatedUserMenu({
  theme,
  fontSize,
  downloadUrl,
  onSubscriptionClick,
  onDownloadAppClick,
  onOpenOnboarding,
  onThemeClick,
  onFontSizeClick,
  onGitHubClick,
  onFeedbackClick,
  onSignOut,
  onMenuItemClick,
}: MenuSectionProps & {
  onSubscriptionClick: () => void;
  onOpenOnboarding?: () => void;
}) {
  return (
    <>
      <MenuItem>
        <button
          onClick={onSubscriptionClick}
          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
        >
          <BanknotesIcon
            aria-hidden="true"
            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
          />
          Subscription
        </button>
      </MenuItem>

      {downloadUrl && (
        <MenuItem>
          <button
            onClick={onDownloadAppClick}
            className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
          >
            <ArrowDownTrayIcon
              aria-hidden="true"
              className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
            />
            Download app
          </button>
        </MenuItem>
      )}

      {onOpenOnboarding && (
        <MenuItem>
          <button
            onClick={() => {
              onMenuItemClick("restart_onboarding");
              onOpenOnboarding();
            }}
            className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
          >
            <AcademicCapIcon
              aria-hidden="true"
              className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
            />
            Tutorial
          </button>
        </MenuItem>
      )}

      <MenuDivider label="Themes" />

      {themes.map((themeOption) => (
        <MenuItem key={themeOption.value}>
          <button
            onClick={() => onThemeClick(themeOption.value)}
            className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
          >
            {theme === themeOption.value ? (
              <CheckIcon
                aria-hidden="true"
                className="mr-3 size-5 text-[var(--color-accent-text)]"
              />
            ) : (
              <span className="mr-3 size-5" aria-hidden="true" />
            )}
            {themeOption.label}
          </button>
        </MenuItem>
      ))}

      <MenuDivider label="Text" />

      {fontSizes.map((sizeOption) => (
        <MenuItem key={sizeOption.value}>
          <button
            onClick={() => onFontSizeClick(sizeOption.value)}
            className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
          >
            {fontSize === sizeOption.value ? (
              <CheckIcon
                aria-hidden="true"
                className="mr-3 size-5 text-[var(--color-accent-text)]"
              />
            ) : (
              <span className="mr-3 size-5" aria-hidden="true" />
            )}
            {sizeOption.label}
          </button>
        </MenuItem>
      ))}

      <MenuDivider label="Resources" />

      <MenuItem>
        <a
          href={YOUTUBE_VIDEO_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onMenuItemClick("welcome_video")}
          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
        >
          <PlayCircleIcon
            aria-hidden="true"
            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
          />
          Pep Talk
        </a>
      </MenuItem>

      <MenuItem>
        <a
          href={ARTICLE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onMenuItemClick("introduction_article")}
          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
        >
          <DocumentTextIcon
            aria-hidden="true"
            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
          />
          Introduction Article
        </a>
      </MenuItem>

      <MenuItem>
        <a
          href="https://github.com/christianalfoni/divergent-todos"
          target="_blank"
          rel="noopener noreferrer"
          onClick={onGitHubClick}
          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
        >
          <CodeBracketIcon
            aria-hidden="true"
            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
          />
          Open Source Code
        </a>
      </MenuItem>

      <MenuItem>
        <button
          onClick={onFeedbackClick}
          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
        >
          <ChatBubbleLeftRightIcon
            aria-hidden="true"
            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
          />
          Feedback
        </button>
      </MenuItem>

      <div className="my-1 h-px bg-[var(--color-border-primary)]" />

      <MenuItem>
        <button
          onClick={onSignOut}
          className="group flex items-center w-full text-left px-4 py-2 text-sm text-[var(--color-text-menu)] data-focus:bg-[var(--color-bg-menu-hover)] data-focus:outline-hidden"
        >
          <ArrowLeftOnRectangleIcon
            aria-hidden="true"
            className="mr-3 size-5 text-[var(--color-text-tertiary)] group-data-focus:text-[var(--color-accent-text-hover)]"
          />
          Sign out
        </button>
      </MenuItem>
    </>
  );
}

function MenuDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center px-4 my-1">
      <div
        aria-hidden="true"
        className="w-full border-t border-[var(--color-border-primary)]"
      />
      <div className="relative flex justify-center">
        <span className="bg-[var(--color-bg-primary)] px-2 text-xs text-[var(--color-text-tertiary)]">
          {label}
        </span>
      </div>
      <div
        aria-hidden="true"
        className="w-full border-t border-[var(--color-border-primary)]"
      />
    </div>
  );
}
