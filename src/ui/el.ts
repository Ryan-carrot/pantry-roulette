type Child = Node | string | null | undefined | false;

export type Attrs = Record<string, string | number | boolean | null | undefined>;

/**
 * Tiny typed element builder. Text children go through createTextNode,
 * so nothing here ever parses HTML.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  children: readonly Child[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (value === true) {
      node.setAttribute(name, '');
    } else {
      node.setAttribute(name, String(value));
    }
  }
  append(node, children);
  return node;
}

export function append(parent: Node, children: readonly Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

/** Replace all children of a node. */
export function replaceChildren(parent: Element, children: readonly Child[]): void {
  parent.replaceChildren();
  append(parent, children);
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Lucide-style icon paths used by the app. 24px viewBox, stroke currentColor. */
const ICONS = {
  laptop: [
    ['rect', { x: '2', y: '3', width: '20', height: '14', rx: '2' }],
    ['line', { x1: '8', y1: '21', x2: '16', y2: '21' }],
    ['line', { x1: '12', y1: '17', x2: '12', y2: '21' }],
  ],
  refresh: [
    ['path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }],
    ['path', { d: 'M3 3v5h5' }],
  ],
  history: [
    ['path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }],
    ['path', { d: 'M3 3v5h5' }],
    ['path', { d: 'M12 7v5l4 2' }],
  ],
  heart: [
    [
      'path',
      {
        d: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
      },
    ],
  ],
  print: [
    ['path', { d: 'M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2' }],
    ['path', { d: 'M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6' }],
    ['rect', { x: '6', y: '14', width: '12', height: '8', rx: '1' }],
  ],
  close: [
    ['path', { d: 'M18 6 6 18' }],
    ['path', { d: 'm6 6 12 12' }],
  ],
} as const satisfies Record<string, readonly (readonly [string, Record<string, string>])[]>;

export type IconName = keyof typeof ICONS;

export interface IconOptions {
  size?: number;
  /** `fill="currentColor"` for the solid heart. Default none. */
  filled?: boolean;
}

/** Inline SVG icon, hidden from assistive tech and never focusable. */
export function svgIcon(name: IconName, options: IconOptions = {}): SVGSVGElement {
  const size = options.size ?? 24;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', options.filled ? 'currentColor' : 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  for (const [shape, attrs] of ICONS[name]) {
    const node = document.createElementNS(SVG_NS, shape);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    svg.appendChild(node);
  }
  return svg;
}
