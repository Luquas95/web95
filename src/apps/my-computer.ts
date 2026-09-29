import { statusbar } from '../core/controls';
import { h, isCoarsePointer } from '../core/dom';
import { loc, t, whileConnected } from '../core/i18n';
import { icon, iconUrl } from '../core/icons';
import { createMenubar } from '../core/menu';
import { openApp, registerApp, wm } from '../core/system';
import { projects, type Project } from '../data/projects';

type View = 'large' | 'small' | 'list' | 'details';

export function openProject(project: Project): void {
  openApp('project', project);
}

function projectType(p: Project): string {
  return p.openIn === 'tab' ? t('mycomp.typeLink') : t('mycomp.typeDemo');
}

function openMyComputer(): void {
  let view: View = 'large';
  let showStatus = true;
  const selected = new Set<Project>();

  const area = h('div', { class: 'folder-view sunken-panel scroll', role: 'listbox', 'aria-multiselectable': 'true', tabindex: '0' });
  const countField = h('span');
  const infoField = h('span');
  const status = statusbar(h('div', { class: 'narrow' }, countField), h('div', null, infoField));

  const updateStatus = () => {
    countField.textContent = selected.size ? t('mycomp.selected', { n: selected.size }) : t('mycomp.objects', { n: projects.length });
    const one = selected.size === 1 ? [...selected][0] : null;
    infoField.textContent = one ? loc(one.description) : '';
    status.hidden = !showStatus;
  };

  const select = (p: Project | null, additive = false) => {
    if (!additive) selected.clear();
    if (p) {
      if (additive && selected.has(p)) selected.delete(p);
      else selected.add(p);
    }
    area.querySelectorAll<HTMLElement>('[data-project]').forEach((el) => {
      const on = [...selected].some((s) => s.id === el.dataset.project);
      el.classList.toggle('selected', on);
      el.setAttribute('aria-selected', String(on));
    });
    updateStatus();
  };

  const bindItem = (el: HTMLElement, p: Project) => {
    el.dataset.project = p.id;
    el.tabIndex = -1;
    el.setAttribute('role', 'option');
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      select(p, e.ctrlKey);
    });
    el.addEventListener('click', (e) => {
      if (isCoarsePointer() && e.detail > 0) openProject(p);
    });
    el.addEventListener('dblclick', () => {
      if (!isCoarsePointer()) openProject(p);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') openProject(p);
    });
  };

  const render = () => {
    area.className = `folder-view sunken-panel scroll view-${view}`;
    area.replaceChildren();
    if (view === 'details') {
      const tbody = h('tbody');
      const table = h(
        'table',
        { class: 'listview' },
        h(
          'colgroup',
          null,
          h('col', { style: 'width: 40%' }),
          h('col', { style: 'width: 20%' }),
          h('col', { style: 'width: 40%' }),
        ),
        h('thead', null, h('tr', null, h('th', null, t('mycomp.colName')), h('th', null, t('mycomp.colType')), h('th', null, t('mycomp.colDescription')))),
        tbody,
      );
      for (const p of projects) {
        const row = h('tr', null, h('td', null, icon(p.icon ?? 'app', 16), loc(p.name)), h('td', null, projectType(p)), h('td', null, loc(p.description)));
        bindItem(row, p);
        tbody.append(row);
      }
      area.append(table);
    } else {
      for (const p of projects) {
        const name = p.icon ?? 'app';
        const item = h(
          'div',
          { class: 'folder-item', title: loc(p.description) },
          h('span', { class: 'item-img', style: `--icon: url("${iconUrl(name)}")` }, icon(name, view === 'large' ? 32 : 16)),
          h('span', { class: 'item-label' }, loc(p.name)),
        );
        bindItem(item, p);
        area.append(item);
      }
    }
    select(null);
  };

  area.addEventListener('pointerdown', () => select(null));
  area.addEventListener('keydown', (e) => {
    if (!projects.length) return;
    const items = [...area.querySelectorAll<HTMLElement>('[data-project]')];
    const current = items.findIndex((el) => el.classList.contains('selected'));
    let next = -1;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(items.length - 1, current + 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(0, current - 1);
    if (e.key === 'Enter' && current >= 0) openProject(projects[current]);
    if (next >= 0) {
      e.preventDefault();
      select(projects[next]);
      items[next].focus();
    }
  });

  const setView = (v: View) => {
    view = v;
    render();
  };

  const menubar = createMenubar([
    {
      label: () => t('menu.file'),
      items: () => [
        { label: t('menu.open'), bold: true, disabled: selected.size === 0, action: () => selected.forEach(openProject) },
        { separator: true },
        { label: t('menu.close'), action: () => void win.close() },
      ],
    },
    {
      label: () => t('menu.edit'),
      items: () => [
        { label: t('menu.selectAll'), shortcut: 'Ctrl+A', disabled: !projects.length, action: () => (projects.forEach((p) => selected.add(p)), select(null, true)) },
        {
          label: t('menu.invertSelection'),
          disabled: !projects.length,
          action: () => {
            const inverted = projects.filter((p) => !selected.has(p));
            selected.clear();
            inverted.forEach((p) => selected.add(p));
            select(null, true);
          },
        },
      ],
    },
    {
      label: () => t('menu.view'),
      items: () => [
        { label: t('menu.statusBar'), checked: showStatus, action: () => ((showStatus = !showStatus), updateStatus()) },
        { separator: true },
        { label: t('menu.largeIcons'), radio: true, checked: view === 'large', action: () => setView('large'), id: 'view-large' },
        { label: t('menu.smallIcons'), radio: true, checked: view === 'small', action: () => setView('small'), id: 'view-small' },
        { label: t('menu.list'), radio: true, checked: view === 'list', action: () => setView('list'), id: 'view-list' },
        { label: t('menu.details'), radio: true, checked: view === 'details', action: () => setView('details'), id: 'view-details' },
      ],
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
    key: 'my-computer',
    title: () => t('mycomp.title'),
    icon: 'computer',
    width: 420,
    height: 300,
    minWidth: 200,
    minHeight: 150,
    className: 'explorer-window',
    menubar,
    body: area,
    statusbar: status,
  });
  area.addEventListener('keydown', (e) => {
    if (e.key === 'a' && e.ctrlKey) {
      e.preventDefault();
      projects.forEach((p) => selected.add(p));
      select(null, true);
    }
  });
  render();
  whileConnected(area, render);
}

export function registerMyComputer(): void {
  registerApp('my-computer', openMyComputer);
}
