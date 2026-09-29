import { config } from '../config';
import { h, prefersReducedMotion, wait } from './dom';
import { t } from './i18n';
import { icon } from './icons';
import { load, save } from './storage';

export function bootEnabled(): boolean {
  if (new URLSearchParams(location.search).get('boot') === '0') return false;
  return !load('booted', 'session');
}

/**
 * The start-up sequence: a quick BIOS memory check, then the splash screen with
 * the animated bar. Any key, click or tap skips it. Shown once per browser session.
 */
export async function runBoot(): Promise<void> {
  save('booted', '1', 'session');
  const fast = prefersReducedMotion();
  let skipped = false;
  let skipNow: () => void = () => undefined;
  const skip = new Promise<void>((resolve) => {
    skipNow = () => {
      skipped = true;
      resolve();
    };
  });
  const pause = (ms: number) => Promise.race([wait(fast ? ms / 3 : ms), skip]);

  const lines = h('div', { class: 'bios-lines' });
  const bios = h('div', { class: 'fullscreen bios-screen', 'aria-hidden': 'true' }, lines, h('p', { class: 'boot-skip' }, t('boot.skip')));
  document.body.append(bios);
  const onKey = () => skipNow();
  document.addEventListener('keydown', onKey);
  bios.addEventListener('pointerdown', onKey);

  const print = (text: string) => {
    const line = h('div', null, text);
    lines.append(line);
    return line;
  };

  print(`${config.brand.bold} BIOS v4.00  (C) ${config.ownerName}`);
  print('');
  const mem = print('Memory Test:      0K');
  const total = 16384;
  for (let kb = 0; kb <= total && !skipped; kb += 1024) {
    mem.textContent = `Memory Test: ${String(kb).padStart(6)}K${kb === total ? ' OK' : ''}`;
    await pause(40);
  }
  if (!skipped) {
    print('');
    print(t('boot.starting'));
    await pause(500);
  }

  bios.remove();
  if (!skipped) {
    const splash = h(
      'div',
      { class: 'fullscreen splash-screen', role: 'img', 'aria-label': t('boot.starting') },
      h('div', { class: 'splash-clouds', 'aria-hidden': 'true' }),
      h('div', { class: 'brand-logo splash-logo' }, icon('compass', 48), h('span', null, h('b', null, config.brand.bold), h('span', { class: 'light' }, config.brand.light))),
      h('div', { class: 'splash-bar', 'aria-hidden': 'true' }),
    );
    splash.addEventListener('pointerdown', onKey);
    document.body.append(splash);
    await pause(2600);
    splash.classList.add('fade');
    await wait(fast ? 0 : 250);
    splash.remove();
  }
  document.removeEventListener('keydown', onKey);
}
