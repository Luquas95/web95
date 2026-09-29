import { h } from './dom';
import { getLang, onLangChange, setLang, t } from './i18n';
import { icon } from './icons';
import { openMenu } from './menu';
import { toggleStartMenu } from './start-menu';
import { wm } from './system';
import type { Win } from './window-manager';
import { load, save } from './storage';

export function formatClock(date: Date, lang: 'en' | 'cs'): string {
  if (lang === 'cs') return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  const hours = date.getHours() % 12 || 12;
  return `${hours}:${String(date.getMinutes()).padStart(2, '0')} ${date.getHours() < 12 ? 'AM' : 'PM'}`;
}

function formatDate(date: Date, lang: 'en' | 'cs'): string {
  return date.toLocaleDateString(lang === 'cs' ? 'cs-CZ' : 'en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function createTaskbar(): HTMLElement {
  const startBtn = h(
    'button',
    { class: 'start-button', type: 'button', 'aria-haspopup': 'menu', 'data-id': 'start' },
    icon('compass', 16),
    h('b', { 'data-i18n': 'taskbar.start' }, t('taskbar.start')),
  );
  startBtn.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    toggleStartMenu(startBtn, false);
    hideHint();
  });
  startBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleStartMenu(startBtn, true);
      hideHint();
    }
  });

  const tasks = h('div', { class: 'task-buttons' });
  const hint = h('div', { class: 'start-hint', 'aria-hidden': 'true' }, h('span', { class: 'start-hint-arrow' }), h('span', { 'data-i18n': 'taskbar.startHint' }, t('taskbar.startHint')));
  let hintSeen = !!load('hintSeen', 'session');
  hint.hidden = hintSeen;
  tasks.append(hint);
  function hideHint() {
    hintSeen = true;
    hint.hidden = true;
    save('hintSeen', '1', 'session');
  }

  // --- language indicator & clock (system tray) ---
  const langBtn = h('button', { class: 'tray-lang', type: 'button', 'data-id': 'tray-lang' });
  const renderLang = () => {
    langBtn.textContent = getLang() === 'cs' ? 'CS' : 'EN';
    langBtn.title = t('taskbar.language');
  };
  renderLang();
  onLangChange(renderLang);
  langBtn.addEventListener('click', () => {
    openMenu(
      [
        { label: t('taskbar.langEn'), checked: getLang() === 'en', radio: true, action: () => setLang('en'), id: 'lang-en' },
        { label: t('taskbar.langCs'), checked: getLang() === 'cs', radio: true, action: () => setLang('cs'), id: 'lang-cs' },
      ],
      { rect: langBtn.getBoundingClientRect(), side: 'above' },
      { ignore: [langBtn] },
    );
  });

  const clock = h('span', { class: 'tray-clock', role: 'timer' });
  let last = '';
  const tick = () => {
    const now = new Date();
    const text = formatClock(now, getLang());
    if (text !== last) {
      clock.textContent = text;
      clock.title = formatDate(now, getLang());
      last = text;
    }
  };
  tick();
  setInterval(tick, 1000);
  onLangChange(() => {
    last = '';
    tick();
  });

  const bar = h(
    'div',
    { id: 'taskbar', role: 'toolbar', 'aria-label': 'Taskbar' },
    startBtn,
    h('span', { class: 'taskbar-grip', 'aria-hidden': 'true' }),
    tasks,
    h('div', { class: 'tray' }, langBtn, clock),
  );

  // --- task buttons ---
  const buttons = new Map<Win, HTMLButtonElement>();
  const render = () => {
    const manager = wm();
    const list = manager.taskWindows;
    for (const [win, btn] of buttons) {
      if (!list.includes(win)) {
        btn.remove();
        buttons.delete(win);
      }
    }
    for (const win of list) {
      let btn = buttons.get(win);
      if (!btn) {
        btn = h('button', { class: 'task-button', type: 'button', 'data-key': win.opts.key }, icon(win.iconName, 16), h('span', { class: 'task-label' }));
        const target = win;
        btn.addEventListener('click', () => {
          if (target.state === 'minimized') target.restore();
          else if (manager.active === target || manager.active?.opts.owner === target) target.minimize();
          else manager.focus(target);
        });
        btn.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          manager.focus(target);
          target.openSystemMenu({ x: e.clientX, y: e.clientY });
        });
        buttons.set(win, btn);
      }
      const label = btn.querySelector('.task-label')!;
      if (label.textContent !== win.title) label.textContent = win.title;
      btn.title = win.title;
      const pressed = win.state !== 'minimized' && (manager.active === win || manager.active?.opts.owner === win);
      btn.classList.toggle('pressed', pressed);
      btn.setAttribute('aria-pressed', String(pressed));
      tasks.append(btn);
    }
    // Like Windows 95, the hint scrolls by only while the taskbar is empty.
    hint.hidden = hintSeen || list.length > 0;
  };
  wm().onChange(render);
  wm().taskbarRectFor = (win) => buttons.get(win)?.getBoundingClientRect() ?? null;
  render();
  return bar;
}
