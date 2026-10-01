import { afterEach, describe, expect, it, vi } from 'vitest';
import { accelKey, accelLabel, h, isAltShortcut, isTextEntry, keyLetter, plainLabel } from '../../src/core/dom';
import { formatClock } from '../../src/core/taskbar';
import { isValidEmail } from '../../src/mail';

describe('access-key labels', () => {
  it('underlines the marked letter', () => {
    const el = h('span', null, accelLabel('&File'));
    expect(el.innerHTML).toBe('<u>F</u>ile');
  });
  it('keeps literal ampersands', () => {
    expect(h('span', null, accelLabel('Name && Location')).textContent).toBe('Name & Location');
  });
  it('finds the access key', () => {
    expect(accelKey('Sh&ut Down...')).toBe('u');
    expect(accelKey('None')).toBeNull();
    expect(plainLabel('&Help')).toBe('Help');
  });
});

describe('h()', () => {
  it('sets attributes, classes and listeners', () => {
    let clicked = false;
    const el = h('button', { class: 'btn', disabled: true, hidden: false, onclick: () => (clicked = true) }, 'OK');
    expect(el.className).toBe('btn');
    expect(el.hasAttribute('disabled')).toBe(true);
    expect(el.hasAttribute('hidden')).toBe(false);
    el.removeAttribute('disabled');
    el.click();
    expect(clicked).toBe(true);
  });
});

describe('formatClock', () => {
  const d = new Date(2026, 0, 1, 15, 5);
  it('uses 12-hour time in English and 24-hour time in Czech', () => {
    expect(formatClock(d, 'en')).toBe('3:05 PM');
    expect(formatClock(d, 'cs')).toBe('15:05');
    expect(formatClock(new Date(2026, 0, 1, 0, 30), 'en')).toBe('12:30 AM');
  });
});

describe('isValidEmail', () => {
  it('accepts sensible addresses only', () => {
    expect(isValidEmail('me@example.com')).toBe(true);
    expect(isValidEmail(' me@example.cz ')).toBe(true);
    expect(isValidEmail('me@example')).toBe(false);
    expect(isValidEmail('not an email')).toBe(false);
  });
});

describe('keyLetter', () => {
  it('uses the typed letter, falling back to the physical key for composed characters', () => {
    expect(keyLetter(new KeyboardEvent('keydown', { key: 'F', code: 'KeyF', altKey: true }))).toBe('f');
    expect(keyLetter(new KeyboardEvent('keydown', { key: 'z', code: 'KeyY', altKey: true }))).toBe('z');
    expect(keyLetter(new KeyboardEvent('keydown', { key: 'ß', code: 'KeyS', altKey: true }))).toBe('s');
    expect(keyLetter(new KeyboardEvent('keydown', { key: 'F10', code: 'F10' }))).toBe('');
  });
});

describe('isTextEntry', () => {
  it('recognises editable text targets only', () => {
    expect(isTextEntry(h('input', { type: 'text' }))).toBe(true);
    expect(isTextEntry(h('input', { type: 'checkbox' }))).toBe(false);
    expect(isTextEntry(h('textarea'))).toBe(true);
    expect(isTextEntry(h('textarea', { readonly: true }))).toBe(false);
    expect(isTextEntry(h('div'))).toBe(false);
    const editable = h('div', { contenteditable: 'true' });
    // jsdom does not implement isContentEditable; mirror what browsers report.
    Object.defineProperty(editable, 'isContentEditable', { value: true });
    expect(isTextEntry(editable)).toBe(true);
    expect(isTextEntry(null)).toBe(false);
  });
});

describe('isAltShortcut', () => {
  const press = (target: HTMLElement, init: KeyboardEventInit) => {
    let result: boolean | undefined;
    target.addEventListener('keydown', (e) => (result = isAltShortcut(e)), { once: true });
    target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));
    return result;
  };
  const setPlatform = (platform: string) => {
    vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform);
    Object.defineProperty(navigator, 'userAgentData', { value: undefined, configurable: true });
  };

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it('treats Alt+letter in a text field as a shortcut on other platforms', () => {
    setPlatform('Win32');
    const textarea = h('textarea');
    document.body.append(textarea);
    expect(press(textarea, { key: 's', code: 'KeyS', altKey: true })).toBe(true);
  });

  it('leaves Option+letter in a text field for typing on Apple platforms', () => {
    setPlatform('MacIntel');
    const textarea = h('textarea');
    const button = h('button');
    document.body.append(textarea, button);
    expect(press(textarea, { key: 'ß', code: 'KeyS', altKey: true })).toBe(false);
    expect(press(button, { key: 'ß', code: 'KeyS', altKey: true })).toBe(true);
  });

  it('never treats Ctrl+Alt (AltGr) as a shortcut', () => {
    for (const platform of ['Win32', 'MacIntel']) {
      setPlatform(platform);
      const button = h('button');
      document.body.append(button);
      expect(press(button, { key: 's', code: 'KeyS', altKey: true, ctrlKey: true })).toBe(false);
      vi.restoreAllMocks();
    }
  });
});
