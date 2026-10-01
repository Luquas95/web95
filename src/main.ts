import './styles/win95.css';
import './styles/apps.css';

import { registerDos } from './apps/dos';
import { registerFind } from './apps/find';
import { registerHelp } from './apps/help';
import { countVisit, registerInternetExplorer } from './apps/internet-explorer';
import { registerMyComputer } from './apps/my-computer';
import { registerOutlook } from './apps/outlook';
import { registerShutdown } from './apps/shutdown';
import { registerWelcome, welcomeEnabled } from './apps/welcome';
import { bootEnabled, runBoot } from './core/boot';
import { initDesktop } from './core/desktop';
import { h, keyLetter } from './core/dom';
import { initLang } from './core/i18n';
import { isMenuOpen, closeMenus } from './core/menu';
import { toggleStartMenu } from './core/start-menu';
import { initSystem, openApp, registerApp } from './core/system';
import { createTaskbar } from './core/taskbar';
import { config } from './config';

async function main(): Promise<void> {
  initLang();
  const app = document.getElementById('app')!;
  const desktop = h('main', { id: 'desktop', 'aria-label': 'Desktop' });
  app.append(desktop);
  initSystem(desktop);

  registerMyComputer();
  registerInternetExplorer();
  registerOutlook();
  registerFind();
  registerHelp();
  registerWelcome();
  registerShutdown();
  registerDos();
  registerApp('github', () => window.open(config.githubUrl, '_blank', 'noopener,noreferrer'));

  const booting = bootEnabled();
  if (booting) await runBoot();

  initDesktop(desktop);
  const taskbar = createTaskbar();
  app.append(taskbar);
  countVisit();

  // Ctrl+Esc opens the Start menu, as on a real PC. Windows keeps Ctrl+Esc for its
  // own Start menu, so Alt+S does the same – unless a window already used the key
  // (Alt+S sends a new message, or opens a menu such as Czech "Soubor").
  document.addEventListener('keydown', (e) => {
    const altS = e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && keyLetter(e) === 's';
    if ((e.key === 'Escape' && e.ctrlKey) || (altS && !e.defaultPrevented)) {
      e.preventDefault();
      const start = taskbar.querySelector<HTMLElement>('.start-button')!;
      if (isMenuOpen()) closeMenus();
      else toggleStartMenu(start, true);
    }
  });
  document.addEventListener('contextmenu', (e) => {
    // Only text fields keep the browser's own context menu.
    if (!(e.target as Element).closest('input, textarea, .web, .dos')) e.preventDefault();
  });

  document.body.classList.add('ready');
  if (welcomeEnabled()) openApp('welcome');
}

void main();
