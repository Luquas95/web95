import { describe, expect, it } from 'vitest';
import { accelKey, accelLabel, h, keyLetter, plainLabel } from '../../src/core/dom';
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
