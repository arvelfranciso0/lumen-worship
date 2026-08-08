// Finds the nearest ancestor line element tagged with data-line-index.
export function findLineElement(node: Node | null, container: HTMLElement): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== container) {
    if (current instanceof HTMLElement && current.dataset.lineIndex !== undefined) return current;
    current = current.parentNode;
  }
  return null;
}

// Measures the character offset of (node, offset) within lineElement's text.
export function measureTextOffset(lineElement: HTMLElement, node: Node, offset: number): number {
  const measuringRange = document.createRange();
  measuringRange.selectNodeContents(lineElement);
  measuringRange.setEnd(node, offset);
  return measuringRange.toString().length;
}
