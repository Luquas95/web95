import { config } from '../config';
import { liveText, statusbar, toolButton, toolSeparator, toolbar } from '../core/controls';
import { h } from '../core/dom';
import { loc, t, whileConnected } from '../core/i18n';
import { icon } from '../core/icons';
import { createMenubar, openMenu } from '../core/menu';
import { load, save } from '../core/storage';
import { openApp, openExternal, registerApp, wm } from '../core/system';
import { bio } from '../data/bio';
import { projects, type Project } from '../data/projects';

export interface IEOptions {
  url?: string;
  /** Window instance key; defaults to the single homepage window. */
  key?: string;
}

const HOME = config.homepageAddress;

interface Page {
  title: string;
  render: () => HTMLElement;
}

/** Visits counted in this browser only – an honest take on the 90s hit counter. */
function visitCount(): number {
  const n = Number(load('visits')) || 0;
  return n;
}

export function countVisit(): void {
  save('visits', String(visitCount() + 1));
}

function internalLink(text: string, href: string, onActivate: () => void): HTMLAnchorElement {
  const a = h('a', { href }, text);
  a.addEventListener('click', (e) => {
    e.preventDefault();
    onActivate();
  });
  return a;
}

function bioPage(): HTMLElement {
  const counter = String(visitCount()).padStart(6, '0');
  const sections = bio.sections.map((s) =>
    h(
      'section',
      { id: s.id },
      h('h2', null, loc(s.title)),
      ...(s.paragraphs ?? []).map((p) => h('p', null, loc(p))),
      s.list ? h('ul', null, ...s.list.map((item) => h('li', null, loc(item)))) : null,
    ),
  );
  return h(
    'div',
    { class: 'web bio-page' },
    h('div', { class: 'marquee', 'aria-hidden': 'true' }, h('span', null, loc(bio.marquee))),
    h(
      'header',
      { class: 'bio-header' },
      h('div', { class: 'bio-avatar' }, icon('computer', 48)),
      h('div', null, h('p', { class: 'bio-greeting' }, loc(bio.greeting)), h('h1', { class: 'rainbow' }, config.ownerName), h('p', { class: 'bio-tagline' }, loc(bio.tagline))),
    ),
    h('hr'),
    ...sections,
    h(
      'section',
      { id: 'projects' },
      h('h2', null, loc(bio.projectsTitle)),
      h('p', null, loc(bio.projectsText), ' ', internalLink(loc(bio.projectsLink), 'file:///C:/', () => openApp('my-computer'))),
    ),
    h(
      'section',
      { id: 'contact' },
      h('h2', null, loc(bio.contactTitle)),
      h('p', null, loc(bio.contactText)),
      h(
        'ul',
        { class: 'bio-links' },
        h('li', null, icon('mail', 16), internalLink(loc(bio.contactMail), 'outlook://new-message', () => openApp('compose'))),
        h('li', null, icon('github', 16), h('a', { href: config.githubUrl, target: '_blank', rel: 'noopener noreferrer' }, loc(bio.contactGithub))),
      ),
    ),
    h('hr'),
    h('div', { class: 'construction' }, h('span', { class: 'construction-sign', 'aria-hidden': 'true' }), loc(bio.construction)),
    h('p', { class: 'counter' }, loc(bio.counter), ' ', h('span', { class: 'counter-digits' }, ...[...counter].map((d) => h('span', null, d)))),
    h('p', { class: 'best-viewed' }, loc(bio.bestViewed)),
  );
}

function messagePage(titleKey: 'ie.notFoundTitle' | 'ie.externalTitle', body: HTMLElement[]): HTMLElement {
  return h('div', { class: 'web ie-message' }, h('div', { class: 'ie-message-head' }, icon('warning', 32), h('h1', null, t(titleKey))), h('hr'), ...body);
}

function findProject(url: string): Project | undefined {
  return projects.find((p) => p.url === url);
}

function resolvePage(url: string): Page {
  if (!url || url === HOME || url === 'about:home') {
    return { title: config.ownerName, render: bioPage };
  }
  const project = findProject(url);
  if (project) {
    return {
      title: loc(project.name),
      render: () =>
        h(
          'div',
          { class: 'ie-frame-wrap' },
          h('iframe', {
            class: 'ie-frame',
            src: project.url,
            title: loc(project.name),
            referrerpolicy: 'no-referrer',
            sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock',
            allow: 'fullscreen; clipboard-write',
          }),
        ),
    };
  }
  if (/^https?:\/\//i.test(url)) {
    return {
      title: t('ie.externalTitle'),
      render: () =>
        messagePage('ie.externalTitle', [
          h('p', null, t('ie.externalText', { url })),
          h('p', null, h('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, t('ie.externalOpen'))),
        ]),
    };
  }
  return {
    title: t('ie.notFoundTitle'),
    render: () => messagePage('ie.notFoundTitle', [h('p', null, t('ie.notFoundText'))]),
  };
}

function openIE(arg?: unknown): void {
  const opts = (arg ?? {}) as IEOptions;
  const key = opts.key ?? 'ie';
  const existing = wm().get(key);
  if (existing) {
    wm().open(existing.opts);
    return;
  }

  const history: string[] = [];
  let index = -1;
  let loading: number | undefined;
  let pageTitle = '';
  let showToolbar = true;
  let showStatus = true;

  const content = h('div', { class: 'ie-content sunken-panel scroll', tabindex: '0' });
  const address = h('input', { class: 'ie-address', type: 'text', spellcheck: 'false', autocomplete: 'off', 'aria-label': 'Address' });
  const addressLabel = liveText(h('label', { class: 'ie-address-label' }), 'ie.address', true);
  const throbber = h('div', { class: 'ie-throbber', 'aria-hidden': 'true' }, icon('compass', 32));
  const statusText = h('span', { class: 'ie-status-text' });
  const progress = h('div', { class: 'ie-progress', 'aria-hidden': 'true' }, h('div', { class: 'ie-progress-bar' }));
  const zone = h('span', { class: 'ie-zone' }, icon('ie', 16), liveText(h('span'), 'ie.zone'));

  const back = toolButton('back', 'ie.back', () => go(-1), { id: 'ie-back' });
  const forward = toolButton('forward', 'ie.forward', () => go(1), { id: 'ie-forward' });
  const stop = toolButton('stop', 'ie.stop', () => stopLoading(), { id: 'ie-stop' });
  const refresh = toolButton('refresh', 'ie.refresh', () => loadPage(history[index]), { id: 'ie-refresh' });
  const home = toolButton('home', 'ie.home', () => navigate(HOME), { id: 'ie-home' });
  const search = toolButton('search', 'ie.search', () => openApp('find'), { id: 'ie-search' });
  const favorites = toolButton('favorites', 'ie.favorites', () => openFavorites(favorites), { id: 'ie-favorites' });
  const print = toolButton('print', 'ie.print', () => undefined, { disabled: true });
  const mail = toolButton('mail', 'ie.mail', () => openApp('compose'), { id: 'ie-mail' });

  const tools = toolbar(back, forward, stop, refresh, home, toolSeparator(), search, favorites, print, toolSeparator(), mail);
  const addressBar = h('div', { class: 'ie-addressbar' }, addressLabel, h('div', { class: 'ie-address-wrap' }, icon('html', 16), address));
  addressLabel.setAttribute('for', (address.id = `addr-${key}`));
  const bars = h('div', { class: 'ie-bars' }, h('div', { class: 'ie-bars-main' }, tools, addressBar), throbber);
  const status = statusbar(h('div', null, icon('html', 16), statusText), h('div', { class: 'narrow ie-progress-field' }, progress), h('div', { class: 'narrow' }, zone));

  const favoriteItems = () => [
    { label: t('ie.favGithub'), icon: 'github' as const, action: () => openExternal(config.githubUrl) },
    { label: 'bio.htm', icon: 'html' as const, action: () => navigate(HOME) },
    ...projects.map((p) => ({ label: loc(p.name), icon: p.icon ?? ('app' as const), action: () => navigate(p.url) })),
  ];
  function openFavorites(anchor: HTMLElement) {
    openMenu(favoriteItems(), { rect: anchor.getBoundingClientRect(), side: 'below' });
  }

  const updateButtons = () => {
    back.disabled = index <= 0;
    forward.disabled = index >= history.length - 1;
    stop.disabled = loading === undefined;
  };

  function setStatus(text: string) {
    statusText.textContent = text;
  }

  function stopLoading() {
    if (loading === undefined) return;
    clearTimeout(loading);
    loading = undefined;
    throbber.classList.remove('loading');
    progress.classList.remove('active');
    address.value = history[index] ?? '';
    setStatus(t('ie.done'));
    updateButtons();
  }

  /** Show `url`, simulating a short dial-up style load. */
  function loadPage(url: string) {
    stopLoading();
    const page = resolvePage(url);
    address.value = url;
    throbber.classList.add('loading');
    progress.classList.remove('active');
    void progress.offsetWidth; // restart the CSS animation
    progress.classList.add('active');
    setStatus(t('ie.opening', { url }));
    loading = window.setTimeout(() => {
      loading = undefined;
      pageTitle = page.title;
      content.replaceChildren(page.render());
      content.scrollTop = 0;
      throbber.classList.remove('loading');
      progress.classList.remove('active');
      setStatus(t('ie.done'));
      win.refreshTitle();
      updateButtons();
    }, 450);
    updateButtons();
  }

  function navigate(url: string) {
    url = url.trim() || HOME;
    if (/^www\./i.test(url)) url = `http://${url}`;
    history.splice(index + 1);
    history.push(url);
    index = history.length - 1;
    loadPage(url);
  }

  function go(step: -1 | 1) {
    const next = index + step;
    if (next < 0 || next >= history.length) return;
    index = next;
    loadPage(history[index]);
  }

  address.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      navigate(address.value);
    }
  });
  address.addEventListener('focus', () => address.select());

  // Links: show their target in the status bar, like IE did.
  content.addEventListener('pointerover', (e) => {
    const a = (e.target as Element).closest?.('a');
    if (a && loading === undefined) setStatus(a.getAttribute('href') ?? '');
  });
  content.addEventListener('pointerout', (e) => {
    if ((e.target as Element).closest?.('a') && loading === undefined) setStatus(t('ie.done'));
  });

  const menubar = createMenubar([
    {
      label: () => t('menu.file'),
      items: () => [
        { label: t('ie.newWindow'), action: () => openExternal(history[index]?.startsWith('http') && history[index] !== HOME ? history[index] : location.href) },
        { separator: true },
        { label: t('menu.close'), action: () => void win.close() },
      ],
    },
    {
      label: () => t('menu.edit'),
      items: () => [
        { label: t('menu.copy'), shortcut: 'Ctrl+C', action: () => document.execCommand('copy') },
        { label: t('menu.selectAll'), shortcut: 'Ctrl+A', action: () => window.getSelection()?.selectAllChildren(content) },
      ],
    },
    {
      label: () => t('menu.view'),
      items: () => [
        { label: t('menu.toolbar'), checked: showToolbar, action: () => ((showToolbar = !showToolbar), (bars.hidden = !showToolbar)) },
        { label: t('menu.statusBar'), checked: showStatus, action: () => ((showStatus = !showStatus), (status.hidden = !showStatus)) },
        { separator: true },
        { label: t('ie.stop'), shortcut: 'Esc', disabled: loading === undefined, action: stopLoading },
        { label: t('ie.refresh'), shortcut: 'F5', action: () => loadPage(history[index]) },
      ],
    },
    {
      label: () => t('menu.go'),
      items: () => [
        { label: t('ie.goBack'), disabled: index <= 0, action: () => go(-1) },
        { label: t('ie.goForward'), disabled: index >= history.length - 1, action: () => go(1) },
        { separator: true },
        { label: t('ie.goHome'), action: () => navigate(HOME) },
      ],
    },
    { label: () => t('menu.favorites'), items: favoriteItems },
    {
      label: () => t('menu.help'),
      items: () => [
        { label: t('menu.helpTopics'), action: () => openApp('help') },
        { separator: true },
        { label: t('menu.about'), action: () => openApp('about') },
      ],
    },
  ]);

  const win = wm().open({
    key,
    title: () => t('ie.title', { page: pageTitle || config.ownerName }),
    icon: 'ie',
    width: 640,
    height: 480,
    minWidth: 260,
    minHeight: 200,
    className: 'ie-window',
    menubar,
    toolbar: bars,
    body: content,
    statusbar: status,
    onClosed: () => {
      stopLoading();
    },
  });
  win.el.addEventListener('keydown', (e) => {
    if (e.key === 'F5') {
      e.preventDefault();
      loadPage(history[index]);
    } else if (e.key === 'Escape' && loading !== undefined) stopLoading();
    else if (e.altKey && e.key === 'ArrowLeft') go(-1);
    else if (e.altKey && e.key === 'ArrowRight') go(1);
  });
  // Re-render the current page in the new language.
  whileConnected(content, () => {
    if (loading === undefined && index >= 0) {
      const page = resolvePage(history[index]);
      pageTitle = page.title;
      if (!content.querySelector('iframe')) content.replaceChildren(page.render());
      setStatus(t('ie.done'));
      win.refreshTitle();
    }
  });
  navigate(opts.url ?? HOME);
}

export function registerInternetExplorer(): void {
  registerApp('ie', openIE);
  registerApp('project', (arg) => {
    const project = arg as Project;
    if (project.openIn === 'tab') openExternal(project.url);
    else openIE({ url: project.url, key: `ie:${project.id}` });
  });
}
