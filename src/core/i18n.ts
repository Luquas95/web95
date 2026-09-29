import { cs, en, type StringKey } from './strings';
import { config } from '../config';
import { load, save } from './storage';

export type Lang = 'en' | 'cs';
export type { StringKey };

/** Text available in both languages. A plain string is used as-is for both. */
export type Localized = string | { en: string; cs: string };

const dictionaries: Record<Lang, Record<StringKey, string>> = { en, cs };
const listeners = new Set<(lang: Lang) => void>();

export function detectLang(): Lang {
  const params = new URLSearchParams(location.search).get('lang');
  if (params === 'en' || params === 'cs') return params;
  const stored = load('lang');
  if (stored === 'en' || stored === 'cs') return stored;
  const nav = (navigator.languages?.[0] ?? navigator.language ?? 'en').toLowerCase();
  return nav.startsWith('cs') || nav.startsWith('sk') ? 'cs' : 'en';
}

let current: Lang = 'en';

/** Placeholders every string may use. */
const BUILTIN_VARS = {
  brand: `${config.brand.bold}${config.brand.light}`,
  owner: config.ownerName,
};

export function getLang(): Lang {
  return current;
}

export function initLang(lang: Lang = detectLang()): void {
  current = lang;
  document.documentElement.lang = lang;
}

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  save('lang', lang);
  document.documentElement.lang = lang;
  applyI18n(document);
  for (const fn of listeners) fn(lang);
}

/** Subscribe to language changes. Returns an unsubscribe function. */
export function onLangChange(fn: (lang: Lang) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Translate a key, substituting `{name}` placeholders. */
export function t(key: StringKey, vars?: Record<string, string | number>): string {
  let text: string = dictionaries[current][key] ?? en[key] ?? key;
  const all = { ...BUILTIN_VARS, ...vars };
  if (text.includes('{')) {
    for (const [name, value] of Object.entries(all)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

export function loc(value: Localized): string {
  return typeof value === 'string' ? value : value[current];
}

/**
 * Elements carrying data-i18n (text), data-i18n-title, data-i18n-label
 * (aria-label) or data-i18n-placeholder are refreshed on language change.
 */
export function applyI18n(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as StringKey);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle as StringKey);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-label]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nLabel as StringKey));
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach((el) => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder as StringKey));
  });
}

/** A text node-holding span that follows the current language. */
export function tx(key: StringKey, tag: 'span' | 'label' | 'div' | 'b' = 'span'): HTMLElement {
  const el = document.createElement(tag);
  el.dataset.i18n = key;
  el.textContent = t(key);
  return el;
}

/**
 * Run `fn` on every language change for as long as `el` stays in the
 * document; the listener removes itself once the element is gone.
 */
export function whileConnected(el: Element, fn: (lang: Lang) => void): void {
  const off = onLangChange((lang) => {
    if (!el.isConnected) {
      off();
      return;
    }
    fn(lang);
  });
}
