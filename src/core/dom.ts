/** Tiny DOM helpers – the whole UI is built from plain elements. */

type Child = Node | string | number | null | undefined | false;
type AttrValue = string | number | boolean | null | undefined | EventListener;
export type Attrs = Record<string, AttrValue>;

/**
 * Create an element. Attributes starting with `on` and holding a function are
 * registered as event listeners; `class` maps to className; booleans toggle
 * the attribute; null/undefined/false are skipped.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs | null = null,
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (key === 'class') {
        el.className = String(value);
      } else if (value === true) {
        el.setAttribute(key, '');
      } else {
        el.setAttribute(key, String(value));
      }
    }
  }
  append(el, children);
  return el;
}

export function append(parent: Node, children: Child[]): void {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    parent.appendChild(typeof child === 'object' ? child : document.createTextNode(String(child)));
  }
}

/** Replace all children of `el`. */
export function setChildren(el: Element, ...children: Child[]): void {
  el.replaceChildren();
  append(el, children);
}

/**
 * Render a Windows-style menu label where `&` marks the access key,
 * e.g. `&File` → <u>F</u>ile. `&&` renders a literal ampersand.
 */
export function accelLabel(label: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  let i = 0;
  let buf = '';
  while (i < label.length) {
    const ch = label[i];
    if (ch === '&' && label[i + 1] === '&') {
      buf += '&';
      i += 2;
    } else if (ch === '&' && i + 1 < label.length) {
      if (buf) frag.append(buf);
      buf = '';
      frag.append(h('u', null, label[i + 1]));
      i += 2;
    } else {
      buf += ch;
      i += 1;
    }
  }
  if (buf) frag.append(buf);
  return frag;
}

/** The access key (lower-case) of a `&`-marked label, if any. */
export function accelKey(label: string): string | null {
  const m = /&([^&])/.exec(label.replace(/&&/g, ''));
  return m ? m[1].toLowerCase() : null;
}

/** Label with the `&` markers removed. */
export function plainLabel(label: string): string {
  return label.replace(/&(.)/g, '$1');
}

/**
 * The letter of a key press, independent of modifiers. With Alt held, macOS
 * reports composed characters in `key` (Alt+S → "ß"); then the physical key is used.
 */
export function keyLetter(e: KeyboardEvent): string {
  if (/^[a-z]$/i.test(e.key)) return e.key.toLowerCase();
  if (/^Key[A-Z]$/.test(e.code)) return e.code.slice(3).toLowerCase();
  return e.key.length === 1 ? e.key.toLowerCase() : '';
}

/** True on macOS / iOS, where Option+letter types characters instead of being a shortcut. */
export function isApplePlatform(): boolean {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  const platform = (nav as (Navigator & { userAgentData?: { platform?: string } }) | undefined)?.userAgentData?.platform ?? nav?.platform ?? '';
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/** True when the event target accepts typed text (input, textarea, contenteditable). */
export function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement) return !target.readOnly;
  if (target instanceof HTMLInputElement) {
    const textTypes = ['text', 'search', 'email', 'url', 'tel', 'password', 'number', ''];
    return !target.readOnly && textTypes.includes(target.type);
  }
  return false;
}

/**
 * Whether an Alt+letter press should be treated as a shortcut. On Apple
 * platforms Option+letter inside a text field types a character, so it is not.
 */
export function isAltShortcut(e: KeyboardEvent): boolean {
  if (!e.altKey || e.ctrlKey || e.metaKey) return false;
  return !(isApplePlatform() && isTextEntry(e.target));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** True on touch-first devices, where a single tap opens icons. */
export function isCoarsePointer(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let uid = 0;
export function uniqueId(prefix = 'id'): string {
  uid += 1;
  return `${prefix}-${uid}`;
}
