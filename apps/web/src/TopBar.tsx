import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { signOut } from 'firebase/auth';
import { useAuthentication } from './hooks/useAuthentication';
import { auth } from './firebase';

export default function TopBar() {
  const [authentication] = useAuthentication();

  if (!authentication.user) {
    return null;
  }

  const handleSignOut = () => {
    signOut(auth);
  };

  return (
    <nav className="border-b border-gray-200 bg-white dark:border-white/10 dark:bg-gray-900">
      <div className="px-4">
        <div className="flex h-16 justify-between">
          <div className="flex">
            <div className="flex shrink-0 items-center">
              <img
                alt="Divergent Todos"
                src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=600"
                className="h-8 w-auto dark:hidden"
              />
              <img
                alt="Divergent Todos"
                src="https://tailwindcss.com/plus-assets/img/logos/mark.svg?color=indigo&shade=500"
                className="h-8 w-auto not-dark:hidden"
              />
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {/* Profile dropdown */}
            <Menu as="div" className="relative ml-3">
              <MenuButton className="relative flex max-w-xs items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-500">
                <span className="absolute -inset-1.5" />
                <span className="sr-only">Open user menu</span>
                <img
                  alt=""
                  src={authentication.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(authentication.user.displayName || authentication.user.email || 'User')}`}
                  className="size-8 rounded-full outline -outline-offset-1 outline-black/5 dark:outline-white/10"
                />
              </MenuButton>

              <MenuItems
                transition
                className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg outline outline-black/5 transition data-closed:scale-95 data-closed:transform data-closed:opacity-0 data-enter:duration-200 data-enter:ease-out data-leave:duration-75 data-leave:ease-in dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10"
              >
                <MenuItem>
                  <a
                    href="#"
                    className="block px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden dark:text-gray-300 dark:data-focus:bg-white/5"
                  >
                    Subscription
                  </a>
                </MenuItem>
                <MenuItem>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 data-focus:bg-gray-100 data-focus:outline-hidden dark:text-gray-300 dark:data-focus:bg-white/5"
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
