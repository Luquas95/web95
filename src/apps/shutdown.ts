import { config } from '../config';
import { button, buttonAccel, liveText, radio } from '../core/controls';
import { h, wait } from '../core/dom';
import { t } from '../core/i18n';
import { icon } from '../core/icons';
import { closeMenus } from '../core/menu';
import { remove } from '../core/storage';
import { openApp, registerApp, wm } from '../core/system';
import { createTerminal } from './dos';

type Choice = 'shutdown' | 'restart' | 'dos' | 'logoff';

function brandLogo(): HTMLElement {
  return h('div', { class: 'brand-logo' }, icon('compass', 48), h('span', null, h('b', null, config.brand.bold), h('span', { class: 'light' }, config.brand.light)));
}

function screen(className: string, ...children: HTMLElement[]): HTMLElement {
  const el = h('div', { class: `fullscreen ${className}` }, ...children);
  document.body.append(el);
  return el;
}

/** Restart: show a short message and reload, running the boot sequence again. */
export async function restart(): Promise<void> {
  remove('booted', 'session');
  screen('restart-screen', h('p', null, t('shutdown.restarting')));
  await wait(1200);
  location.reload();
}

async function shutDown(): Promise<void> {
  const waitScreen = screen('shutdown-wait', brandLogo(), h('p', null, t('shutdown.wait')));
  await wait(1800);
  waitScreen.remove();
  const safe = screen('shutdown-safe', h('p', null, t('shutdown.safe')), h('small', null, t('shutdown.continue')));
  safe.setAttribute('role', 'status');
  const leave = () => location.assign(config.shutdownRedirect);
  safe.addEventListener('click', leave);
  document.addEventListener('keydown', leave, { once: true });
  setTimeout(leave, config.shutdownRedirectDelay);
}

function dosMode(): void {
  const term = createTerminal(() => void restart(), true);
  screen('dos-screen', term);
  term.querySelector('input')?.focus();
}

function openShutdown(): void {
  if (document.querySelector('.shutdown-overlay')) return;
  closeMenus();
  const options = h(
    'div',
    { class: 'shutdown-options', role: 'radiogroup' },
    radio('shutdown-choice', 'shutdown.optShutdown', true, 'shutdown'),
    radio('shutdown-choice', 'shutdown.optRestart', false, 'restart'),
    radio('shutdown-choice', 'shutdown.optDos', false, 'dos'),
    radio('shutdown-choice', 'shutdown.optLogoff', false, 'logoff'),
  );
  const close = () => overlay.remove();
  const yes = button('btn.yes', () => void confirm(), { isDefault: true, id: 'shutdown-yes' });
  const no = button('btn.no', close, { id: 'shutdown-no' });
  const help = button('btn.help', () => openApp('help'), { id: 'shutdown-help' });
  const closeBtn = h('button', { class: 'title-btn title-close', type: 'button', 'aria-label': t('win.closeTip'), title: t('win.closeTip') });
  closeBtn.addEventListener('click', close);

  const dialog = h(
    'div',
    { class: 'window active fixed-size shutdown-dialog', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'shutdown-title' },
    h('div', { class: 'titlebar' }, liveText(h('span', { class: 'title-text', id: 'shutdown-title' }), 'shutdown.title'), h('div', { class: 'title-buttons' }, closeBtn)),
    h(
      'div',
      { class: 'window-body' },
      h(
        'div',
        { class: 'shutdown-body' },
        h('div', { class: 'shutdown-main' }, icon('shutdown', 32), h('div', null, liveText(h('p'), 'shutdown.question'), options)),
        h('div', { class: 'msgbox-buttons' }, yes, no, help),
      ),
    ),
  );
  const overlay = h('div', { class: 'shutdown-overlay' }, dialog);
  document.body.append(overlay);

  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') return close();
    if (e.key === 'Tab') {
      // Keep keyboard focus inside the dialog.
      const focusable = [...dialog.querySelectorAll<HTMLElement>('input:checked, button:not(:disabled)')];
      const i = focusable.indexOf(document.activeElement as HTMLElement);
      const next = focusable[(i + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length];
      e.preventDefault();
      next?.focus();
      return;
    }
    if (e.altKey || e.ctrlKey || e.key.length !== 1) return;
    const key = e.key.toLowerCase();
    const btn = [yes, no, help].find((b) => buttonAccel(b) === key);
    if (btn) {
      e.preventDefault();
      btn.click();
      return;
    }
    const label = [...options.querySelectorAll('label')].find((l) => l.querySelector('u')?.textContent?.toLowerCase() === key);
    if (label) {
      e.preventDefault();
      label.querySelector('input')!.checked = true;
      label.querySelector('input')!.focus();
    }
  });
  options.querySelector<HTMLInputElement>('input:checked')?.focus();

  async function confirm() {
    const choice = (options.querySelector<HTMLInputElement>('input:checked')?.value ?? 'shutdown') as Choice;
    close();
    await wm().closeAll();
    switch (choice) {
      case 'shutdown':
        return shutDown();
      case 'restart':
        return restart();
      case 'dos':
        return dosMode();
      case 'logoff':
        // Every program is closed; greet the "new user".
        document.body.classList.add('busy');
        await wait(700);
        document.body.classList.remove('busy');
        openApp('welcome');
    }
  }
}

export function registerShutdown(): void {
  registerApp('shutdown', openShutdown);
}
