import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/data/projects', () => ({
  projects: [{ id: 'demo', name: 'Demo.exe', description: 'A demo', url: 'https://example.com/', openIn: 'tab' }],
}));

import { registerMyComputer } from '../../src/apps/my-computer';
import { h } from '../../src/core/dom';
import { initLang } from '../../src/core/i18n';
import { initSystem, openApp, registerApp } from '../../src/core/system';

describe('My Computer', () => {
  const opened = vi.fn();

  beforeEach(() => {
    initLang('en');
    document.body.innerHTML = '';
    const desktop = h('div');
    document.body.append(desktop);
    initSystem(desktop);
    registerMyComputer();
    registerApp('project', opened);
    opened.mockClear();
    openApp('my-computer');
  });

  it('opens a selected project once per Enter on the item', () => {
    const item = document.querySelector<HTMLElement>('[data-project="demo"]')!;
    item.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(opened).toHaveBeenCalledTimes(1);
  });

  it('opens the selected project once when the folder itself has focus', () => {
    const item = document.querySelector<HTMLElement>('[data-project="demo"]')!;
    item.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    const area = document.querySelector<HTMLElement>('.folder-view')!;
    area.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(opened).toHaveBeenCalledTimes(1);
  });
});
