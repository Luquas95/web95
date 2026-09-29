import { config } from '../config';
import { h } from './dom';
import { getLang, setLang, t } from './i18n';
import { closeMenus, isMenuOpen, openMenu, type MenuItem } from './menu';
import { openApp, openExternal } from './system';

let open = false;

function banner(): HTMLElement {
  return h(
    'div',
    { class: 'start-banner', 'aria-hidden': 'true' },
    h('span', null, h('b', null, config.brand.bold), h('span', { class: 'light' }, config.brand.light)),
  );
}

export function startMenuItems(): MenuItem[] {
  return [
    {
      label: t('start.programs'),
      icon: 'programs',
      id: 'start-programs',
      submenu: () => [
        { label: t('start.startup'), icon: 'programs', submenu: [] },
        { separator: true },
        { label: t('desktop.ie'), icon: 'ie', action: () => openApp('ie'), id: 'prog-ie' },
        { label: t('desktop.outlook'), icon: 'mail', action: () => openApp('outlook'), id: 'prog-outlook' },
        { label: t('desktop.myComputer'), icon: 'computer', action: () => openApp('my-computer'), id: 'prog-mycomputer' },
        { label: t('start.msdos'), icon: 'dos', action: () => openApp('dos'), id: 'prog-dos' },
      ],
    },
    {
      label: t('start.documents'),
      icon: 'documents',
      id: 'start-documents',
      submenu: () => [{ label: 'bio.htm', icon: 'html', action: () => openApp('ie'), id: 'doc-bio' }],
    },
    {
      label: t('start.settings'),
      icon: 'settings',
      id: 'start-settings',
      submenu: () => [
        { label: t('start.controlPanel'), icon: 'settings', disabled: true },
        { label: t('start.printers'), icon: 'folder', disabled: true },
        { label: t('start.taskbar'), icon: 'app', disabled: true },
        { separator: true },
        {
          label: t('start.language'),
          icon: 'ie',
          id: 'settings-language',
          submenu: () => [
            { label: t('taskbar.langEn'), radio: true, checked: getLang() === 'en', action: () => setLang('en'), id: 'start-lang-en' },
            { label: t('taskbar.langCs'), radio: true, checked: getLang() === 'cs', action: () => setLang('cs'), id: 'start-lang-cs' },
          ],
        },
      ],
    },
    { label: t('start.help'), icon: 'help', action: () => openApp('help'), id: 'start-help' },
    {
      label: t('start.find'),
      icon: 'find',
      id: 'start-find',
      submenu: () => [{ label: t('start.findFiles'), icon: 'find', action: () => openApp('find'), id: 'find-files' }],
    },
    { label: t('start.github'), icon: 'github', action: () => openExternal(config.githubUrl), id: 'start-github' },
    { separator: true },
    { label: t('start.shutdown'), icon: 'shutdown', action: () => openApp('shutdown'), id: 'start-shutdown' },
  ];
}

export function toggleStartMenu(button: HTMLElement, fromKeyboard: boolean): void {
  if (open && isMenuOpen()) {
    closeMenus();
    return;
  }
  button.classList.add('pressed');
  open = true;
  openMenu(
    startMenuItems(),
    { rect: button.getBoundingClientRect(), side: 'above' },
    {
      variant: 'start',
      banner: banner(),
      ignore: [button],
      focusFirst: fromKeyboard,
      ariaLabel: 'Start',
      onClose: () => {
        open = false;
        button.classList.remove('pressed');
      },
    },
  );
}
