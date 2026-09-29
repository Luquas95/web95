import { config } from '../config';
import { h } from '../core/dom';
import { getLang, loc, t } from '../core/i18n';
import { openApp, registerApp, wm } from '../core/system';
import type { Win } from '../core/window-manager';
import { bio } from '../data/bio';
import { projects } from '../data/projects';

const BRAND = `${config.brand.bold} ${config.brand.light}`;

/** A tiny COMMAND.COM. `onExit` runs for EXIT (and WIN in full-screen mode). */
export function createTerminal(onExit: () => void, fullscreen: boolean): HTMLElement {
  const out = h('div', { class: 'dos-output' });
  const input = h('input', { class: 'dos-input', type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', 'aria-label': 'MS-DOS' });
  const prompt = h('span', { class: 'dos-prompt' });
  const line = h('div', { class: 'dos-line' }, prompt, input);
  const root = h('div', { class: `dos${fullscreen ? ' dos-fullscreen' : ''}`, tabindex: '-1' }, out, line);
  let cwd = 'C:\\WINDOWS';
  const history: string[] = [];
  let historyIndex = 0;

  const print = (text = '') => {
    out.append(h('div', null, text || '\u00a0'));
  };
  const renderPrompt = () => (prompt.textContent = `${cwd}>`);

  const dir = () => {
    const rows: [string, string, string][] = [
      ['.', '', '<DIR>'],
      ['..', '', '<DIR>'],
      ['WINDOWS', '', '<DIR>'],
      ['MYDOCU~1', '', '<DIR>'],
      ['PROJECTS', '', '<DIR>'],
      ['COMMAND', 'COM', '93,880'],
      ['AUTOEXEC', 'BAT', '42'],
      ['CONFIG', 'SYS', '76'],
      ['BIO', 'TXT', '1,995'],
    ];
    print(` Volume in drive C is ${config.brand.bold.toUpperCase()}95`);
    print(` Directory of ${cwd}`);
    print();
    for (const [name, ext, size] of rows) print(`${name.padEnd(9)}${ext.padEnd(4)}${size.padStart(12)}  01-01-95  12:00a`);
    print(`         ${rows.length} file(s)`);
  };

  const commands: Record<string, (args: string) => void> = {
    help: () => {
      const cs = getLang() === 'cs';
      print(cs ? 'Dostupné příkazy:' : 'Available commands:');
      print('  CLS  DATE  DIR  ECHO  EXIT  HELP  PROJECTS  START  TIME  TYPE BIO.TXT  VER  WIN');
    },
    cls: () => out.replaceChildren(),
    ver: () => {
      print();
      print(`${BRAND} [Version 4.00.950]`);
      print();
    },
    date: () => print(`Current date is ${new Date().toLocaleDateString(getLang() === 'cs' ? 'cs-CZ' : 'en-US')}`),
    time: () => print(`Current time is ${new Date().toLocaleTimeString(getLang() === 'cs' ? 'cs-CZ' : 'en-US')}`),
    echo: (args) => print(args),
    dir,
    cd: (args) => {
      const target = args.trim().toUpperCase();
      if (!target) print(cwd);
      else if (target === '\\' || target === '..') cwd = 'C:\\';
      else if (['WINDOWS', 'MYDOCU~1', 'PROJECTS'].includes(target)) cwd = `C:\\${target}`;
      else print('Invalid directory');
    },
    type: (args) => {
      if (args.trim().toUpperCase() !== 'BIO.TXT') return print('File not found');
      print(config.ownerName);
      print(loc(bio.tagline));
      for (const s of bio.sections) {
        print();
        print(loc(s.title).toUpperCase());
        s.paragraphs?.forEach((p) => print(loc(p)));
        s.list?.forEach((item) => print(` * ${loc(item)}`));
      }
    },
    projects: () => {
      if (!projects.length) print(getLang() === 'cs' ? 'Zatím žádné projekty.' : 'No projects yet.');
      projects.forEach((p) => print(`${loc(p.name).padEnd(20)} ${loc(p.description)}`));
    },
    start: (args) => {
      const apps: Record<string, Parameters<typeof openApp>[0]> = { iexplore: 'ie', ie: 'ie', outlook: 'outlook', msimn: 'outlook', explorer: 'my-computer', find: 'find', help: 'help' };
      const app = apps[args.trim().toLowerCase().replace(/\.exe$/, '')];
      if (app && !fullscreen) openApp(app);
      else print('Bad command or file name');
    },
    exit: () => onExit(),
    win: () => (fullscreen ? onExit() : print(t('msg.notAvailable'))),
  };

  const run = (raw: string) => {
    print(`${cwd}>${raw}`);
    const trimmed = raw.trim();
    if (!trimmed) return;
    history.push(trimmed);
    historyIndex = history.length;
    const [cmd, ...rest] = trimmed.split(/\s+/);
    const fn = commands[cmd.toLowerCase()];
    if (fn) fn(rest.join(' '));
    else print('Bad command or file name');
    if (cmd.toLowerCase() !== 'cls' && cmd.toLowerCase() !== 'exit') print();
    renderPrompt();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = input.value;
      input.value = '';
      run(value);
      root.scrollTop = root.scrollHeight;
    } else if (e.key === 'ArrowUp' && historyIndex > 0) {
      e.preventDefault();
      input.value = history[--historyIndex];
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      historyIndex = Math.min(history.length, historyIndex + 1);
      input.value = history[historyIndex] ?? '';
    }
  });
  root.addEventListener('pointerup', () => {
    if (!window.getSelection()?.toString()) input.focus({ preventScroll: true });
  });

  if (fullscreen) {
    print(`${BRAND} MS-DOS mode.`);
    print(getLang() === 'cs' ? 'Napište EXIT nebo WIN pro návrat.' : 'Type EXIT or WIN to return.');
  } else {
    print();
    print(`${BRAND} [Version 4.00.950]`);
    print(`(C) Copyright ${config.ownerName} 1995-${new Date().getFullYear()}.`);
  }
  print();
  renderPrompt();
  return root;
}

function openDos(): void {
  let win: Win | undefined;
  const term = createTerminal(() => void win?.close(), false);
  win = wm().open({
    key: 'dos',
    title: () => t('start.msdos'),
    icon: 'dos',
    width: 560,
    height: 340,
    minWidth: 240,
    minHeight: 160,
    className: 'dos-window',
    body: term,
    onFocus: () => setTimeout(() => term.querySelector('input')?.focus({ preventScroll: true }), 0),
  });
  term.querySelector('input')?.focus({ preventScroll: true });
}

export function registerDos(): void {
  registerApp('dos', openDos);
}
