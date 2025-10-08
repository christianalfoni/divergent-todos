import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

type Props = {
  html?: string; // initial serialized HTML with chips (optional)
  editing: boolean; // controls edit vs view mode
  onChange?: (html: string) => void; // serialized HTML output when editing
  placeholder?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onBlur?: () => void;
};

export type SmartLinksEditorRef = {
  clear: () => void;
  setHtml: (html: string) => void;
};

const URL_REGEX = /^(https?:\/\/)?([\w.-]+)(:\d+)?(\/[^\s]*)?$/i;

function extractDomain(url: string): string | null {
  try {
    const withScheme = url.match(/^https?:\/\//i) ? url : `https://${url}`;
    const u = new URL(withScheme);
    return u.host.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// A small helper to insert a node at current selection
function insertNodeAtSelection(node: Node) {
  const sel = document.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  // place caret after the node
  range.setStartAfter(node);
  range.setEndAfter(node);
  sel.removeAllRanges();
  sel.addRange(range);
}

const SmartLinksEditor = forwardRef<SmartLinksEditorRef, Props>(function SmartLinksEditor({
  html,
  editing,
  onChange,
  placeholder = "Description...",
  autoFocus = false,
  onKeyDown: externalOnKeyDown,
  onBlur: externalOnBlur,
}, forwardedRef) {
  const ref = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Expose imperative methods
  useImperativeHandle(forwardedRef, () => ({
    clear: () => {
      if (ref.current) {
        ref.current.innerHTML = "";
      }
    },
    setHtml: (html: string) => {
      if (ref.current) {
        ref.current.innerHTML = html;
      }
    }
  }));

  // Initialize content only once or when explicitly changing modes
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.contentEditable = editing ? "true" : "false";

    // Only set innerHTML on initial mount
    if (isInitialMount.current) {
      if (html) el.innerHTML = html;
      isInitialMount.current = false;
      return;
    }

    // Update innerHTML when html prop changes - but ONLY when not editing
    // to avoid cursor jumping during editing
    if (!editing && html !== undefined && el.innerHTML !== html) {
      el.innerHTML = html;
    }

    // When switching to view mode, swap chip spans -> anchors
    if (!editing) {
      // Convert chip spans to anchors (purely visual; you might store both separately if needed)
      el.querySelectorAll("span[data-url]").forEach((chip) => {
        const url = (chip as HTMLElement).dataset.url!;
        const domain = chip.textContent || url;
        const a = document.createElement("a");
        a.href = url;
        a.textContent = domain;
        a.rel = "noopener noreferrer";
        a.target = "_blank";
        a.className = "smartlink-anchor";
        a.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Use Electron's shell.openExternal if available, otherwise use default behavior
          if (window.native?.openExternal) {
            window.native.openExternal(url);
          } else {
            window.open(url, "_blank");
          }
        });
        chip.replaceWith(a);
      });
    } else {
      // Convert anchors back to chips on entering edit mode
      el.querySelectorAll("a.smartlink-anchor").forEach((a) => {
        const url = (a as HTMLAnchorElement).href;
        const domain = a.textContent || url;
        const chip = makeChip(domain, url);
        a.replaceWith(chip);
      });
    }

    // Auto-focus if requested
    if (autoFocus && editing && el) {
      el.focus();
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    // Conditionally depend on html: only when NOT editing to prevent cursor jumping.
    // When editing=true, changes to html won't trigger this effect, avoiding innerHTML updates.
    // When editing=false (view mode), html changes will trigger the effect to update display.
    editing ? null : html,
    editing,
    autoFocus
  ]);

  // Notify changes (serialize innerHTML while editing)
  const emitChange = () => {
    if (!editing || !onChange || !ref.current) return;
    onChange(ref.current.innerHTML);
  };

  // Create the non-editable chip node
  function makeChip(domain: string, url: string) {
    const chip = document.createElement("span");
    chip.textContent = domain;
    chip.setAttribute("data-url", url);
    chip.setAttribute("contenteditable", "false");
    chip.className = "smartlink-chip";
    return chip;
  }

  // Handle paste to create chip
  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!editing) return;
    const text = e.clipboardData.getData("text/plain").trim();
    const domain = extractDomain(text);
    if (domain && URL_REGEX.test(text)) {
      e.preventDefault();
      const url = text.match(/^https?:\/\//i) ? text : `https://${text}`;
      const chip = makeChip(domain, url);
      insertNodeAtSelection(chip);
      // add a trailing space so you can keep typing naturally
      insertNodeAtSelection(document.createTextNode(" "));
      emitChange();
    } else {
      // For plain text paste, prevent default and insert as plain text
      e.preventDefault();
      const plainText = e.clipboardData.getData("text/plain");
      document.execCommand("insertText", false, plainText);
    }
  };

  // Backspace behavior: if caret sits just after a chip, remove the whole chip
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!editing) return;

    // Call external handler if provided
    if (externalOnKeyDown) {
      externalOnKeyDown(e);
      if (e.defaultPrevented) return;
    }

    if (e.key === "Backspace") {
      const sel = document.getSelection();
      if (!sel || !sel.anchorNode) return;

      // If caret is right after a chip, the previousSibling is the chip
      let node: Node | null = sel.anchorNode;
      let offset = sel.anchorOffset;

      // If inside a text node and at start, move to previous sibling
      if (node.nodeType === Node.TEXT_NODE && offset === 0) {
        node = node.previousSibling;
        if (
          node &&
          (node as HTMLElement).dataset &&
          (node as HTMLElement).dataset.url
        ) {
          e.preventDefault();
          (node as HTMLElement).remove();
          emitChange();
        }
        return;
      }

      // If in container element, check previous child
      if (node.nodeType === Node.ELEMENT_NODE) {
        const container = node as Element;
        const children = Array.from(container.childNodes);
        const prevNode = children[offset - 1];
        if (
          prevNode &&
          (prevNode as HTMLElement).dataset &&
          (prevNode as HTMLElement).dataset.url
        ) {
          e.preventDefault();
          prevNode.remove();
          emitChange();
        }
      }
    }
  };

  const handleBlur = () => {
    if (externalOnBlur) {
      externalOnBlur();
    }
  };

  return (
    <>
      <div
        ref={ref}
        className={`smartlinks ${editing ? "is-editing" : "is-view"}`}
        onPaste={onPaste}
        onInput={emitChange}
        onKeyDown={onKeyDown}
        onBlur={handleBlur}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        style={{
          outline: "none",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      />
      <style>{`
        .smartlink-chip {
          display: inline-flex;
          align-items: center;
          padding: 0 6px;
          border-radius: 6px;
          border: 1px solid var(--color-border-secondary);
          background: var(--color-bg-hover);
          line-height: 1.4;
          margin: 0 1px;
          user-select: none;
          font-size: inherit;
          color: var(--color-accent-text);
        }
        .smartlink-chip::after {
          content: "↗";
          font-size: 0.8em;
          margin-left: 4px;
          opacity: 0.6;
        }
        .smartlink-anchor {
          color: var(--color-accent-text);
          text-decoration: underline;
          cursor: pointer;
        }
        .smartlink-anchor:hover {
          color: var(--color-accent-text-hover);
        }
        .smartlinks.is-editing .smartlink-anchor {
          pointer-events: none;
        }
      `}</style>
    </>
  );
});

export default SmartLinksEditor;
