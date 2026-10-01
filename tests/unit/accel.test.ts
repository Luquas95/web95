import { describe, expect, it } from 'vitest';
import { accelKey } from '../../src/core/dom';
import { initLang, t, type Lang, type StringKey } from '../../src/core/i18n';
import type { MenuItem } from '../../src/core/menu';
import { startMenuItems } from '../../src/core/start-menu';

/** Groups of labels shown together, so their access keys must differ. */
const GROUPS: Record<string, StringKey[]> = {
  'desktop context menu': ['desktop.arrangeIcons', 'desktop.lineUp', 'desktop.refresh', 'desktop.properties'],
  'desktop icon menu': ['desktop.open', 'desktop.properties'],
  'system menu': ['win.restore', 'win.move', 'win.size', 'win.minimize', 'win.maximize', 'win.close'],
  'tray language menu': ['taskbar.langEn', 'taskbar.langCs'],
  'Internet Explorer menu bar': ['menu.file', 'menu.edit', 'menu.view', 'menu.go', 'menu.favorites', 'menu.help'],
  'Internet Explorer File': ['ie.newWindow', 'menu.close'],
  'Internet Explorer Edit': ['menu.copy', 'menu.selectAll'],
  'Internet Explorer View': ['menu.toolbar', 'menu.statusBar'],
  'Internet Explorer Go': ['ie.goBack', 'ie.goForward', 'ie.goHome'],
  'Help menus': ['menu.helpTopics', 'menu.about'],
  'Outlook Express menu bar': ['menu.file', 'menu.edit', 'menu.view', 'menu.compose', 'menu.help'],
  'New Message menu bar': ['menu.file', 'menu.edit', 'menu.view', 'menu.insert', 'menu.format', 'menu.tools', 'menu.help'],
  'New Message File': ['menu.send', 'menu.close'],
  'New Message Edit': ['menu.undo', 'menu.cut', 'menu.copy', 'menu.paste', 'menu.selectAll'],
  'My Computer menu bar': ['menu.file', 'menu.edit', 'menu.view', 'menu.help'],
  'My Computer File': ['menu.open', 'menu.close'],
  'My Computer Edit': ['menu.selectAll', 'menu.invertSelection'],
  'My Computer View': ['menu.statusBar', 'menu.largeIcons', 'menu.smallIcons', 'menu.list', 'menu.details'],
  'Find menu bar': ['menu.file', 'menu.edit', 'menu.help'],
  'Find dialog': ['find.named', 'find.lookIn', 'find.subfolders', 'find.findNow', 'find.stop', 'find.newSearch'],
  'Find advanced tab': ['find.ofType', 'find.containing', 'find.findNow', 'find.stop', 'find.newSearch'],
  'Shut Down dialog': ['shutdown.optShutdown', 'shutdown.optRestart', 'shutdown.optDos', 'shutdown.optLogoff', 'btn.yes', 'btn.no', 'btn.help'],
  'Welcome dialog': ['welcome.bio', 'welcome.contact', 'welcome.nextTip', 'welcome.showNext'],
  'Yes/No/Cancel box': ['btn.yes', 'btn.no'],
};

function duplicates(labels: string[]): string[] {
  const seen = new Map<string, string>();
  const clashes: string[] = [];
  for (const label of labels) {
    const key = accelKey(label);
    if (!key) continue;
    if (seen.has(key)) clashes.push(`"${seen.get(key)}" and "${label}" both use ${key.toUpperCase()}`);
    else seen.set(key, label);
  }
  return clashes;
}

function menuLevels(items: MenuItem[], path: string, out: [string, string[]][]): void {
  const labels: string[] = [];
  for (const item of items) {
    if (item.separator) continue;
    const label = typeof item.label === 'function' ? item.label() : item.label ?? '';
    labels.push(label);
    const sub = typeof item.submenu === 'function' ? item.submenu() : item.submenu;
    if (sub?.length) menuLevels(sub, `${path} > ${label.replace(/&/g, '')}`, out);
  }
  out.push([path, labels]);
}

describe.each<Lang>(['en', 'cs'])('access keys (%s)', (lang) => {
  it('are unique on every level of the Start menu', () => {
    initLang(lang);
    const levels: [string, string[]][] = [];
    menuLevels(startMenuItems(), 'Start', levels);
    for (const [path, labels] of levels) expect(duplicates(labels), path).toEqual([]);
  });

  it.each(Object.entries(GROUPS))('are unique in the %s', (_name, keys) => {
    initLang(lang);
    expect(duplicates(keys.map((k) => t(k)))).toEqual([]);
  });
});
