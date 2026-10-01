import { config } from '../config';
import { button, checkbox, fieldLabel, liveText, radio, statusbar } from '../core/controls';
import { h, isCoarsePointer, wait } from '../core/dom';
import { loc, t, whileConnected } from '../core/i18n';
import { icon, type IconName } from '../core/icons';
import { createMenubar } from '../core/menu';
import { openApp, registerApp, wm } from '../core/system';
import { bio } from '../data/bio';
import { projects } from '../data/projects';
import { search, type SearchEntry } from '../search';
import { openProject } from './my-computer';

interface IndexedEntry extends SearchEntry {
  icon: IconName;
  open: () => void;
}

/** Everything Find knows about, built in the current language. */
export function buildIndex(): IndexedEntry[] {
  const desktop = 'C:\\WINDOWS\\Desktop';
  const bioText = [
    loc(bio.tagline),
    ...bio.sections.flatMap((s) => [loc(s.title), ...(s.paragraphs ?? []).map(loc), ...(s.list ?? []).map(loc)]),
    loc(bio.projectsText),
    loc(bio.contactText),
  ].join(' ');
  return [
    { id: 'my-computer', name: t('desktop.myComputer'), folder: desktop, type: t('find.typeApp'), content: t('help.b3'), icon: 'computer', open: () => openApp('my-computer') },
    { id: 'ie', name: t('desktop.ie'), folder: desktop, type: t('find.typeApp'), content: 'bio web browser homepage', icon: 'ie', open: () => openApp('ie') },
    { id: 'outlook', name: t('desktop.outlook'), folder: desktop, type: t('find.typeApp'), content: `${t('oe.welcomeBody')} e-mail mail contact kontakt`, icon: 'mail', open: () => openApp('outlook') },
    { id: 'bio', name: 'bio.htm', folder: 'C:\\My Documents', type: t('find.typePage'), content: `${config.ownerName} ${bioText}`, icon: 'html', open: () => openApp('ie') },
    { id: 'github', name: 'GitHub.url', folder: 'C:\\WINDOWS\\Favorites', type: t('find.typeShortcut'), content: `${config.githubUrl} code source`, icon: 'github', open: () => window.open(config.githubUrl, '_blank', 'noopener,noreferrer') },
    { id: 'help', name: 'lukas95.hlp', folder: 'C:\\WINDOWS\\HELP', type: t('help.topics'), content: (['help.b1', 'help.b2', 'help.b3', 'help.b4', 'help.b5'] as const).map((k) => t(k)).join(' '), icon: 'help', open: () => openApp('help') },
    { id: 'dos', name: 'COMMAND.COM', folder: 'C:\\WINDOWS', type: t('find.typeApp'), content: 'MS-DOS prompt', icon: 'dos', open: () => openApp('dos') },
    ...projects.map((p) => ({
      id: `project:${p.id}`,
      name: loc(p.name),
      folder: 'C:\\Projects',
      type: t('find.typeProject'),
      content: `${loc(p.description)} ${p.url}`,
      icon: p.icon ?? ('app' as IconName),
      open: () => openProject(p),
    })),
  ];
}

function openFind(): void {
  const existing = wm().get('find');
  if (existing) {
    wm().open(existing.opts);
    return;
  }

  let searching = false;
  /** Incremented to cancel the running search; a search only touches the UI while its id is current. */
  let runId = 0;
  let lastNamed = '';
  let tab: 'name' | 'date' | 'advanced' = 'name';

  const named = h('input', { type: 'search', class: 'find-named', autocomplete: 'off', spellcheck: 'false' });
  const lookIn = h('select', { class: 'find-lookin' }, h('option', null, t('find.lookInValue')));
  const containing = h('input', { type: 'search', class: 'find-containing', autocomplete: 'off', spellcheck: 'false' });
  const typeSelect = h('select', { disabled: true, class: 'find-type' }, h('option', null, t('find.allTypes')));

  const namePanel = h(
    'div',
    { class: 'find-panel' },
    h('div', { class: 'find-row' }, fieldLabel('find.named', named), named),
    h('div', { class: 'find-row' }, fieldLabel('find.lookIn', lookIn), lookIn),
    h('div', { class: 'find-row find-row-indent' }, checkbox('find.subfolders', true, () => undefined)),
  );
  const datePanel = h(
    'div',
    { class: 'find-panel' },
    h('div', { class: 'find-row' }, radio('find-date', 'find.allFiles', true, 'all')),
    h('div', { class: 'find-row' }, radio('find-date', 'find.findAllCreated', false, 'range', true)),
  );
  const advancedPanel = h(
    'div',
    { class: 'find-panel' },
    h('div', { class: 'find-row' }, fieldLabel('find.ofType', typeSelect), typeSelect),
    h('div', { class: 'find-row' }, fieldLabel('find.containing', containing), containing),
  );

  const tabButtons = (['name', 'date', 'advanced'] as const).map((id) => {
    const btn = h('button', { type: 'button', class: 'tab', role: 'tab', 'data-tab': id });
    liveText(btn, id === 'name' ? 'find.tabName' : id === 'date' ? 'find.tabDate' : 'find.tabAdvanced');
    btn.addEventListener('click', () => selectTab(id));
    return btn;
  });
  const panels = { name: namePanel, date: datePanel, advanced: advancedPanel };
  function selectTab(id: typeof tab) {
    tab = id;
    tabButtons.forEach((b) => {
      const on = b.dataset.tab === id;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-selected', String(on));
    });
    for (const [key, panel] of Object.entries(panels)) panel.hidden = key !== id;
  }

  const findNow = button('find.findNow', () => void run(), { isDefault: true, id: 'find-now' });
  const stop = button(
    'find.stop',
    () => {
      if (!searching) return;
      runId++;
      finish();
    },
    { disabled: true, id: 'find-stop' },
  );
  const newSearch = button('find.newSearch', () => reset(), { id: 'find-new' });
  const anim = h('div', { class: 'find-anim', 'aria-hidden': 'true' }, icon('folder', 32), h('span', { class: 'find-anim-glass' }, icon('find', 32)));

  const resultsBody = h('tbody');
  const results = h(
    'div',
    { class: 'find-results sunken-panel scroll' },
    h(
      'table',
      { class: 'listview' },
      h('colgroup', null, h('col', { style: 'width: 38%' }), h('col', { style: 'width: 37%' }), h('col', { style: 'width: 25%' })),
      h('thead', null, h('tr', null, liveText(h('th'), 'find.colName'), liveText(h('th'), 'find.colFolder'), liveText(h('th'), 'find.colType'))),
      resultsBody,
    ),
  );
  results.hidden = true;
  const statusText = h('span');
  const status = statusbar(h('div', null, statusText));
  status.hidden = true;

  const form = h(
    'form',
    { class: 'find-form' },
    h('div', { class: 'find-top' }, h('div', { class: 'find-tabs' }, h('div', { class: 'tab-strip', role: 'tablist' }, ...tabButtons), h('div', { class: 'tab-body' }, namePanel, datePanel, advancedPanel)), h('div', { class: 'find-buttons' }, findNow, stop, newSearch, anim)),
    results,
  );
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    void run();
  });

  async function run() {
    if (searching) return;
    searching = true;
    const id = ++runId;
    lastNamed = named.value.trim();
    findNow.disabled = true;
    stop.disabled = false;
    anim.classList.add('active');
    results.hidden = false;
    status.hidden = false;
    resultsBody.replaceChildren();
    statusText.textContent = t('find.searching');
    win.refreshTitle();
    growForResults();
    const found = search(buildIndex(), { named: lastNamed, containing: containing.value });
    // Reveal results one by one, like a disk being scanned.
    for (const entry of found) {
      await wait(90);
      // Stopped, reset or superseded: whoever cancelled us now owns the UI.
      if (id !== runId) return;
      addRow(entry as IndexedEntry);
    }
    finish();
  }

  /** Return the buttons to their idle state and report what was found. */
  function finish() {
    searching = false;
    findNow.disabled = false;
    stop.disabled = true;
    anim.classList.remove('active');
    statusText.textContent = t('find.found', { n: resultsBody.children.length });
  }

  function addRow(entry: IndexedEntry) {
    const row = h('tr', { tabindex: '0', 'data-result': entry.id }, h('td', null, icon(entry.icon, 16), entry.name), h('td', null, entry.folder), h('td', null, entry.type));
    const select = () => {
      resultsBody.querySelectorAll('tr').forEach((r) => r.classList.toggle('selected', r === row));
    };
    row.addEventListener('pointerdown', select);
    row.addEventListener('click', (e) => {
      if (isCoarsePointer() && e.detail > 0) entry.open();
    });
    row.addEventListener('dblclick', () => {
      if (!isCoarsePointer()) entry.open();
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') entry.open();
    });
    row.addEventListener('focus', select);
    resultsBody.append(row);
  }

  function reset() {
    runId++;
    searching = false;
    findNow.disabled = false;
    stop.disabled = true;
    anim.classList.remove('active');
    named.value = '';
    containing.value = '';
    lastNamed = '';
    resultsBody.replaceChildren();
    results.hidden = true;
    status.hidden = true;
    win.refreshTitle();
    if (win.state === 'normal') {
      win.bounds.h = baseHeight;
      win.applyGeometry();
    }
    named.focus();
  }

  const baseHeight = 250;
  function growForResults() {
    if (win.state === 'normal' && win.bounds.h < 420) {
      win.bounds.h = Math.min(420, wm().desktopSize().h - win.bounds.y - 4);
      win.applyGeometry();
    }
  }

  const menubar = createMenubar([
    {
      label: () => t('menu.file'),
      items: () => [{ label: t('menu.close'), action: () => void win.close() }],
    },
    {
      label: () => t('menu.edit'),
      items: () => [{ label: t('menu.selectAll'), action: () => resultsBody.querySelectorAll('tr').forEach((r) => r.classList.add('selected')) }],
    },
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
    key: 'find',
    title: () => (lastNamed ? t('find.titleNamed', { name: lastNamed }) : t('find.title')),
    icon: 'find',
    width: 470,
    height: baseHeight,
    minWidth: 330,
    minHeight: 220,
    className: 'find-window',
    menubar,
    body: form,
    statusbar: status,
    onClosed: () => {
      runId++;
      searching = false;
    },
  });
  whileConnected(form, () => {
    lookIn.options[0].textContent = t('find.lookInValue');
    typeSelect.options[0].textContent = t('find.allTypes');
    if (!results.hidden && !searching) void run();
  });
  selectTab('name');
  named.focus();
}

export function registerFind(): void {
  registerApp('find', openFind);
}
