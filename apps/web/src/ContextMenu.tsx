import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import { Menu, MenuItems, MenuItem } from '@headlessui/react';
import { createPortal } from 'react-dom';

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  danger?: boolean;
}

interface ContextMenuProps {
  children: ReactNode | ((isOpen: boolean) => ReactNode);
  items: ContextMenuItem[];
}

export default function ContextMenu({ children, items }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [menuDimensions, setMenuDimensions] = useState({ width: 0, height: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Measure menu dimensions once rendered
  useLayoutEffect(() => {
    if (isOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      setMenuDimensions({ width: rect.width, height: rect.height });
    }
  }, [isOpen]);

  // Calculate safe position considering viewport bounds
  const calculatePosition = (clientX: number, clientY: number) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 8; // Padding from edges

    let x = clientX;
    let y = clientY;

    // Adjust horizontal position if menu would overflow right edge
    if (menuDimensions.width > 0 && x + menuDimensions.width > viewportWidth - padding) {
      x = viewportWidth - menuDimensions.width - padding;
    }

    // Adjust vertical position if menu would overflow bottom edge
    if (menuDimensions.height > 0 && y + menuDimensions.height > viewportHeight - padding) {
      y = viewportHeight - menuDimensions.height - padding;
    }

    // Ensure menu doesn't go off left edge
    if (x < padding) {
      x = padding;
    }

    // Ensure menu doesn't go off top edge
    if (y < padding) {
      y = padding;
    }

    return { x, y };
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const initialPos = { x: e.clientX, y: e.clientY };
    setPosition(initialPos);
    setIsOpen(true);
  };

  // Update position once menu dimensions are known
  useEffect(() => {
    if (isOpen && menuDimensions.width > 0 && menuDimensions.height > 0) {
      const safePos = calculatePosition(position.x, position.y);
      if (safePos.x !== position.x || safePos.y !== position.y) {
        setPosition(safePos);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuDimensions, isOpen]);

  const handleItemClick = (onClick: () => void) => {
    onClick();
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
    setMenuDimensions({ width: 0, height: 0 });
  };

  return (
    <>
      <div ref={triggerRef} onContextMenu={handleContextMenu}>
        {typeof children === 'function' ? children(isOpen) : children}
      </div>

      {isOpen && createPortal(
        <Menu as="div" className="fixed z-50" style={{ left: 0, top: 0 }}>
          <div
            className="fixed inset-0"
            onClick={handleClose}
          />
          <MenuItems
            static
            ref={menuRef}
            className="absolute w-56 origin-top-left rounded-md bg-white shadow-lg outline-1 outline-black/5 dark:bg-gray-800 dark:shadow-none dark:-outline-offset-1 dark:outline-white/10"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
            }}
          >
            <div className="py-1">
              {items.map((item, index) => (
                <MenuItem key={index}>
                  <button
                    onClick={() => handleItemClick(item.onClick)}
                    className={`group flex w-full items-center gap-2 px-4 py-2 text-sm text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none dark:hover:bg-white/5 dark:focus:bg-white/5 ${
                      item.danger
                        ? 'text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300'
                        : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {item.icon && (
                      <span className="shrink-0">
                        {item.icon}
                      </span>
                    )}
                    <span>{item.label}</span>
                  </button>
                </MenuItem>
              ))}
            </div>
          </MenuItems>
        </Menu>,
        document.body
      )}
    </>
  );
}
