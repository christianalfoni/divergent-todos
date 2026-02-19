/**
 * Checks if HTML content has an empty line (double line break)
 * Returns the first part (before empty line) and full content if collapsible
 */
export function analyzeCollapsibleContent(html: string): {
  isCollapsible: boolean;
  firstPart: string;
  fullContent: string;
} {
  // Create a temporary div to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Get the text content to check for double newlines
  const textContent = temp.textContent || '';

  // Check if there's an empty line in the text (two consecutive newlines)
  const hasEmptyLine = /\n\s*\n/.test(textContent);

  if (!hasEmptyLine) {
    return {
      isCollapsible: false,
      firstPart: html,
      fullContent: html,
    };
  }

  // Try to find the split point in the HTML
  // Look for double <br> tags or empty elements
  const htmlStr = html.trim();

  // Pattern 1: Two consecutive <br> tags (with optional whitespace)
  const doubleBrMatch = htmlStr.match(/^(.*?)<br\s*\/?>\s*<br\s*\/?>/i);
  if (doubleBrMatch) {
    return {
      isCollapsible: true,
      firstPart: doubleBrMatch[1],
      fullContent: html,
    };
  }

  // Pattern 2: Empty div/p between content
  const emptyDivMatch = htmlStr.match(/^(.*?)(<div>\s*<br\s*\/?>\s*<\/div>|<p>\s*<br\s*\/?>\s*<\/p>|<div>\s*<\/div>|<p>\s*<\/p>)/i);
  if (emptyDivMatch) {
    return {
      isCollapsible: true,
      firstPart: emptyDivMatch[1],
      fullContent: html,
    };
  }

  // Pattern 3: Check using DOM parsing - find first empty text node or element
  const nodes = Array.from(temp.childNodes);
  let foundEmpty = false;
  let firstPartNodes: Node[] = [];

  for (const node of nodes) {
    if (foundEmpty) break;

    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';
      if (text.includes('\n\n')) {
        // Found double newline within text node
        const parts = text.split(/\n\s*\n/);
        const beforeEmpty = document.createTextNode(parts[0]);
        firstPartNodes.push(beforeEmpty);
        foundEmpty = true;
      } else {
        firstPartNodes.push(node.cloneNode(true));
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const text = element.textContent || '';

      if (text.trim() === '') {
        // Empty element - this is our separator
        foundEmpty = true;
      } else if (text.includes('\n\n')) {
        // Check if there's empty content within this element
        firstPartNodes.push(node.cloneNode(true));
        // For now, keep the whole element - could be more sophisticated
      } else {
        firstPartNodes.push(node.cloneNode(true));
      }
    }
  }

  if (foundEmpty && firstPartNodes.length > 0) {
    const firstPartContainer = document.createElement('div');
    firstPartNodes.forEach(node => firstPartContainer.appendChild(node));
    return {
      isCollapsible: true,
      firstPart: firstPartContainer.innerHTML,
      fullContent: html,
    };
  }

  return {
    isCollapsible: false,
    firstPart: html,
    fullContent: html,
  };
}
