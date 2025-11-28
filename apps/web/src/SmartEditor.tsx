import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from "react";

type Props = {
  html?: string; // initial serialized HTML with chips (optional)
  editing: boolean; // controls edit vs view mode
  onChange?: (html: string) => void; // serialized HTML output when editing
  placeholder?: string;
  autoFocus?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  onBlur?: () => void;
  availableTags?: string[]; // List of all tag texts from other todos for autocomplete
};

export type SmartEditorRef = {
  clear: () => void;
  setHtml: (html: string) => void;
  getHtml: () => string;
  convertPendingTags: () => void;
};

const URL_REGEX = /^(https?:\/\/)?([\w.-]+)(:\d+)?(\/[^\s]*)?$/i;
const TAG_REGEX = /^#(\w+)$/;

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

const SmartEditor = forwardRef<SmartEditorRef, Props>(function SmartEditor({
  html,
  editing,
  onChange,
  placeholder = "Description...",
  autoFocus = false,
  onKeyDown: externalOnKeyDown,
  onBlur: externalOnBlur,
  availableTags = [],
}, forwardedRef) {
  const ref = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

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
    },
    getHtml: () => {
      return ref.current?.innerHTML || "";
    },
    convertPendingTags: () => {
      if (!ref.current) return;

      // Remove any existing shadow first
      const existingShadow = ref.current.querySelector('.tag-shadow');
      if (existingShadow) {
        existingShadow.remove();
      }

      // Get the word before the cursor
      const wordInfo = getWordBeforeCursor();
      if (wordInfo) {
        const { word, range } = wordInfo;

        // Check if it's a tag
        const tagMatch = word.match(TAG_REGEX);
        if (tagMatch) {
          const tag = tagMatch[1]; // Extract tag without #
          range.deleteContents();
          const pill = makeTagPill(tag);
          range.insertNode(pill);

          // Move cursor after pill
          range.setStartAfter(pill);
          range.collapse(true);
          const sel = document.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);

          emitChange();
        }
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
      // Don't return - continue to do chip-to-anchor conversion on initial mount
    } else {
      // Update innerHTML when html prop changes - but ONLY when not editing
      // to avoid cursor jumping during editing
      if (!editing && html !== undefined && el.innerHTML !== html) {
        el.innerHTML = html;
      }
    }

    // When switching to view mode, swap chip spans -> anchors
    if (!editing) {
      // Convert chip spans to anchors (purely visual; you might store both separately if needed)
      el.querySelectorAll("span[data-url]").forEach((chip, index) => {
        const url = (chip as HTMLElement).dataset.url!;
        const domain = chip.textContent || url;
        const linkId = `link-${Date.now()}-${index}`;
        const a = document.createElement("a");
        a.href = url;
        a.textContent = domain;
        a.rel = "noopener noreferrer";
        a.target = "_blank";
        a.className = "smartlink-anchor";
        a.dataset.linkId = linkId;
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
        a.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          e.stopPropagation();
          navigator.clipboard.writeText(url);
          setCopiedLinkId(linkId);
          setTimeout(() => {
            setCopiedLinkId(null);
          }, 1000);
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

  // Handle input to update shadow
  const handleInput = () => {
    emitChange();
    updateShadow();
  };

  // Create the non-editable chip node for links
  function makeChip(domain: string, url: string) {
    const chip = document.createElement("span");
    chip.textContent = domain;
    chip.setAttribute("data-url", url);
    chip.setAttribute("contenteditable", "false");
    chip.className = "smartlink-chip";
    return chip;
  }

  // Create the non-editable pill node for tags
  function makeTagPill(tag: string) {
    const pill = document.createElement("span");
    pill.textContent = tag;
    pill.setAttribute("data-tag", tag);
    pill.setAttribute("contenteditable", "false");
    const color = getTagColor(tag);
    pill.className = `tag-pill tag-pill-${color}`;
    return pill;
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

  // Get the word before the cursor
  function getWordBeforeCursor(): { word: string; range: Range } | null {
    const sel = document.getSelection();
    if (!sel || !sel.anchorNode) return null;

    let node = sel.anchorNode;
    let offset = sel.anchorOffset;

    // If cursor is in an element node, try to get the last text node child
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      // If offset > 0, get the child node before the cursor
      if (offset > 0) {
        const childNode = element.childNodes[offset - 1];
        if (childNode && childNode.nodeType === Node.TEXT_NODE) {
          node = childNode;
          offset = (node.textContent || "").length;
        } else if (childNode && childNode.nodeType === Node.ELEMENT_NODE) {
          // If the previous child is an element (like a pill), get its text content to find last text node
          const lastText = getLastTextNode(childNode);
          if (lastText) {
            node = lastText;
            offset = (node.textContent || "").length;
          }
        }
      } else {
        // If offset is 0, we're at the start, no word before cursor
        return null;
      }
    }

    if (node.nodeType !== Node.TEXT_NODE) return null;

    const text = node.textContent || "";
    const beforeCursor = text.slice(0, offset);

    // Match word starting with # or URL pattern
    const match = beforeCursor.match(/(#\w+|\S+)$/);
    if (!match) return null;

    const word = match[0];
    const wordStart = offset - word.length;

    const range = document.createRange();
    range.setStart(node, wordStart);
    range.setEnd(node, offset);

    return { word, range };
  }

  // Helper to get the last text node in a subtree
  function getLastTextNode(node: Node): Node | null {
    if (node.nodeType === Node.TEXT_NODE) return node;
    const children = node.childNodes;
    for (let i = children.length - 1; i >= 0; i--) {
      const result = getLastTextNode(children[i]);
      if (result) return result;
    }
    return null;
  }

  // Get best tag suggestion for partial tag input
  function getTagSuggestion(partial: string): string | null {
    if (!partial.startsWith('#') || partial.length < 2) return null;

    const partialTag = partial.slice(1).toLowerCase(); // Remove # and lowercase

    // Find all matching tags
    const matches = availableTags.filter(tag =>
      tag.toLowerCase().startsWith(partialTag) && tag.toLowerCase() !== partialTag
    );

    if (matches.length === 0) return null;

    // Count frequency of each tag
    const frequency = new Map<string, number>();
    matches.forEach(tag => {
      frequency.set(tag, (frequency.get(tag) || 0) + 1);
    });

    // Sort by frequency (descending), then alphabetically
    const sorted = Array.from(new Set(matches)).sort((a, b) => {
      const freqDiff = (frequency.get(b) || 0) - (frequency.get(a) || 0);
      if (freqDiff !== 0) return freqDiff;
      return a.localeCompare(b);
    });

    return sorted[0];
  }

  // Update shadow text based on current input
  function updateShadow() {
    if (!editing || !ref.current) return;

    // Remove any existing shadow
    const existingShadow = ref.current.querySelector('.tag-shadow');
    if (existingShadow) {
      existingShadow.remove();
    }

    const sel = document.getSelection();
    if (!sel || !sel.anchorNode) return;

    const wordInfo = getWordBeforeCursor();
    if (!wordInfo || !wordInfo.word.startsWith('#')) {
      return;
    }

    const suggestion = getTagSuggestion(wordInfo.word);
    if (!suggestion) {
      return;
    }

    // Show the remaining part of the suggestion
    const partial = wordInfo.word.slice(1); // Remove #
    const remaining = suggestion.slice(partial.length);

    // Create shadow span
    const shadow = document.createElement('span');
    shadow.className = 'tag-shadow';
    shadow.textContent = remaining;
    shadow.contentEditable = 'false';
    shadow.style.cssText = 'color: var(--color-text-tertiary); opacity: 0.5; pointer-events: none; user-select: none;';

    // Insert shadow after cursor
    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(false); // Move to end
    range.insertNode(shadow);

    // Restore cursor position (before the shadow)
    const newRange = document.createRange();
    newRange.setStart(sel.anchorNode, sel.anchorOffset);
    newRange.collapse(true);
    sel.removeAllRanges();
    sel.addRange(newRange);
  }

  // Handle tag and link conversion on space
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!editing) return;

    // Handle Tab for autocomplete BEFORE external handler
    if (e.key === "Tab") {
      const wordInfo = getWordBeforeCursor();
      if (wordInfo && wordInfo.word.startsWith('#')) {
        const suggestion = getTagSuggestion(wordInfo.word);
        if (suggestion) {
          e.preventDefault();
          e.stopPropagation();

          // Remove shadow first
          const existingShadow = ref.current?.querySelector('.tag-shadow');
          if (existingShadow) {
            existingShadow.remove();
          }

          // Replace the partial tag with the full suggestion and convert to pill
          const { range } = wordInfo;
          range.deleteContents();

          // Create pill with the full suggestion
          const pill = makeTagPill(suggestion);
          range.insertNode(pill);

          // Add space after pill
          const space = document.createTextNode(" ");
          range.setStartAfter(pill);
          range.insertNode(space);

          // Move cursor after space
          range.setStartAfter(space);
          range.collapse(true);
          const sel = document.getSelection();
          sel?.removeAllRanges();
          sel?.addRange(range);

          emitChange();
          return;
        } else {
          // If typing a tag but no suggestion, still prevent default tab
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
    }

    // Handle tag and link conversion on space/enter BEFORE calling external handler
    if (e.key === " " || (e.key === "Enter" && !e.shiftKey)) {
      // Remove shadow first
      const existingShadow = ref.current?.querySelector('.tag-shadow');
      if (existingShadow) {
        existingShadow.remove();
      }

      const wordInfo = getWordBeforeCursor();
      if (wordInfo) {
        const { word, range } = wordInfo;

        // Check if it's a tag
        const tagMatch = word.match(TAG_REGEX);
        if (tagMatch) {
          const tag = tagMatch[1]; // Extract tag without #
          range.deleteContents();
          const pill = makeTagPill(tag);
          range.insertNode(pill);

          // If Enter was pressed, don't add space - let the Enter key proceed normally
          // to trigger the external onKeyDown handler (which likely saves the todo)
          if (e.key === "Enter") {
            // Move cursor after pill
            range.setStartAfter(pill);
            range.collapse(true);
            const sel = document.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
            emitChange();
            // Don't prevent default - let Enter propagate to external handler
            // Fall through to call external handler below
          } else {
            // For space, add space after pill
            e.preventDefault();
            const space = document.createTextNode(" ");
            range.setStartAfter(pill);
            range.insertNode(space);

            // Move cursor after space
            range.setStartAfter(space);
            range.collapse(true);
            const sel = document.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);

            emitChange();
            return;
          }
        }
      }
    }

    // Call external handler if provided
    if (externalOnKeyDown) {
      externalOnKeyDown(e);
      if (e.defaultPrevented) return;
    }

    if (e.key === "Backspace") {
      const sel = document.getSelection();
      if (!sel || !sel.anchorNode) return;

      // If caret is right after a chip or tag pill, remove it
      let node: Node | null = sel.anchorNode;
      let offset = sel.anchorOffset;

      // If inside a text node and at start, move to previous sibling
      if (node.nodeType === Node.TEXT_NODE && offset === 0) {
        node = node.previousSibling;
        if (
          node &&
          (node as HTMLElement).dataset &&
          ((node as HTMLElement).dataset.url || (node as HTMLElement).dataset.tag)
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
          ((prevNode as HTMLElement).dataset.url || (prevNode as HTMLElement).dataset.tag)
        ) {
          e.preventDefault();
          prevNode.remove();
          emitChange();
        }
      }
    }
  };

  const handleBlur = () => {
    // Don't trigger blur handler if the entire window/document lost focus
    // (user switched to another app). Only blur when clicking within the app.
    if (!document.hasFocus()) {
      return;
    }

    if (externalOnBlur) {
      externalOnBlur();
    }
  };

  // Add the copied class to the link when it's copied
  useEffect(() => {
    if (!ref.current || !copiedLinkId) return;

    const link = ref.current.querySelector(`[data-link-id="${copiedLinkId}"]`);
    if (link) {
      link.classList.add('link-copied');
    }

    return () => {
      if (link) {
        link.classList.remove('link-copied');
      }
    };
  }, [copiedLinkId]);

  return (
    <>
      <div
        ref={ref}
        className={`smartlinks ${editing ? "is-editing" : "is-view"}`}
        onPaste={onPaste}
        onInput={handleInput}
        onKeyDown={onKeyDown}
        onBlur={handleBlur}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        style={{
          outline: "none",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontSize: "var(--todo-text-size)",
          minHeight: "1.5rem",
        }}
      />
      <style>{`
        .smartlink-chip {
          display: inline-flex;
          align-items: center;
          padding: 0px 6px;
          border-radius: 6px;
          border: 1px solid var(--color-border-secondary);
          background: var(--color-bg-hover);
          line-height: 1.4;
          margin: 0 1px;
          user-select: none;
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--color-accent-text);
        }
        .smartlink-chip::after {
          content: "↗";
          font-size: 0.8em;
          margin-left: 4px;
          opacity: 0.6;
        }
        .tag-pill {
          display: inline-flex;
          align-items: center;
          padding: 0px 6px;
          border-radius: 6px;
          line-height: 1.4;
          margin: 0 1px;
          user-select: none;
          font-size: 0.75rem;
          font-weight: 500;
        }
        .line-through .tag-pill {
          text-decoration: line-through;
        }
        .tag-pill-gray {
          background: rgb(243 244 246);
          color: rgb(75 85 99);
        }
        .tag-pill-red {
          background: rgb(254 226 226);
          color: rgb(185 28 28);
        }
        .tag-pill-yellow {
          background: rgb(254 249 195);
          color: rgb(133 77 14);
        }
        .tag-pill-green {
          background: rgb(220 252 231);
          color: rgb(21 128 61);
        }
        .tag-pill-blue {
          background: rgb(219 234 254);
          color: rgb(29 78 216);
        }
        .tag-pill-indigo {
          background: rgb(224 231 255);
          color: rgb(67 56 202);
        }
        .tag-pill-purple {
          background: rgb(243 232 255);
          color: rgb(126 34 206);
        }
        .tag-pill-pink {
          background: rgb(252 231 243);
          color: rgb(190 24 93);
        }
        @media (prefers-color-scheme: dark) {
          .tag-pill-gray {
            background: rgb(156 163 175 / 0.1);
            color: rgb(156 163 175);
          }
          .tag-pill-red {
            background: rgb(248 113 113 / 0.1);
            color: rgb(248 113 113);
          }
          .tag-pill-yellow {
            background: rgb(234 179 8 / 0.1);
            color: rgb(234 179 8);
          }
          .tag-pill-green {
            background: rgb(74 222 128 / 0.1);
            color: rgb(74 222 128);
          }
          .tag-pill-blue {
            background: rgb(96 165 250 / 0.1);
            color: rgb(96 165 250);
          }
          .tag-pill-indigo {
            background: rgb(129 140 248 / 0.1);
            color: rgb(129 140 248);
          }
          .tag-pill-purple {
            background: rgb(192 132 252 / 0.1);
            color: rgb(192 132 252);
          }
          .tag-pill-pink {
            background: rgb(244 114 182 / 0.1);
            color: rgb(244 114 182);
          }
        }
        .smartlink-anchor {
          color: var(--color-accent-text);
          text-decoration: underline;
          cursor: pointer;
          position: relative;
        }
        .smartlink-anchor:hover {
          color: var(--color-accent-text-hover);
        }
        .smartlinks.is-editing .smartlink-anchor {
          pointer-events: none;
        }
        .smartlink-anchor.link-copied {
          color: transparent;
          text-decoration: none;
        }
        .smartlink-anchor.link-copied::after {
          content: "copied!";
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-accent-text);
          text-decoration: none;
        }
      `}</style>
    </>
  );
});

// Hash function to deterministically assign color to tag
export function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = ['gray', 'red', 'yellow', 'green', 'blue', 'indigo', 'purple', 'pink'];
  return colors[Math.abs(hash) % colors.length];
}

export default SmartEditor;
