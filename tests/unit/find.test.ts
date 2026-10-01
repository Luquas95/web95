import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registerFind } from '../../src/apps/find';
import { h } from '../../src/core/dom';
import { initLang } from '../../src/core/i18n';
import { initSystem, openApp } from '../../src/core/system';

const click = (id: string) => document.querySelector<HTMLButtonElement>(`[data-id="${id}"]`)!.click();
const rows = () => [...document.querySelectorAll<HTMLElement>('.find-results tbody tr')].map((r) => r.dataset.result);

describe('Find', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    initLang('en');
    document.body.innerHTML = '';
    const desktop = h('div');
    document.body.append(desktop);
    initSystem(desktop);
    registerFind();
    openApp('find');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists every entry exactly once after Stop followed by Find Now', async () => {
    click('find-now');
    await vi.advanceTimersByTimeAsync(100);
    expect(rows()).toHaveLength(1);

    click('find-stop');
    expect(document.querySelector('.find-window .statusbar')!.textContent).toContain('1 file(s) found');
    expect(document.querySelector<HTMLButtonElement>('[data-id="find-now"]')!.disabled).toBe(false);
    expect(document.querySelector<HTMLButtonElement>('[data-id="find-stop"]')!.disabled).toBe(true);

    click('find-now');
    await vi.advanceTimersByTimeAsync(5000);
    const ids = rows();
    expect(ids.length).toBeGreaterThan(1);
    expect(new Set(ids).size).toBe(ids.length);
    expect(document.querySelector('.find-window .statusbar')!.textContent).toContain(`${ids.length} file(s) found`);
  });

  it('New Search cancels a running search', async () => {
    click('find-now');
    await vi.advanceTimersByTimeAsync(100);
    click('find-new');
    await vi.advanceTimersByTimeAsync(5000);
    expect(rows()).toHaveLength(0);
    expect(document.querySelector<HTMLButtonElement>('[data-id="find-now"]')!.disabled).toBe(false);
  });
});
