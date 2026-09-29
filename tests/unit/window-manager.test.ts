import { beforeEach, describe, expect, it } from 'vitest';
import { h } from '../../src/core/dom';
import { initLang } from '../../src/core/i18n';
import { WindowManager } from '../../src/core/window-manager';

let wm: WindowManager;

function open(key: string, extra = {}) {
  return wm.open({ key, title: () => key, icon: 'app', width: 300, height: 200, body: h('div'), ...extra });
}

beforeEach(() => {
  initLang('en');
  document.body.innerHTML = '';
  const container = h('div');
  document.body.append(container);
  wm = new WindowManager(container);
});

describe('WindowManager', () => {
  it('opens windows once per key and focuses the newest', () => {
    const a = open('a');
    const b = open('b');
    expect(wm.active).toBe(b);
    expect(open('a')).toBe(a);
    expect(wm.active).toBe(a);
    expect(wm.windows).toHaveLength(2);
  });

  it('keeps z-order in focus order', () => {
    const a = open('a');
    const b = open('b');
    wm.focus(a);
    expect(Number(a.el.style.zIndex)).toBeGreaterThan(Number(b.el.style.zIndex));
  });

  it('minimizes, restores and maximizes', () => {
    const a = open('a');
    const b = open('b');
    b.minimize();
    expect(b.state).toBe('minimized');
    expect(b.el.hidden).toBe(true);
    expect(wm.active).toBe(a);
    b.restore();
    expect(b.state).toBe('normal');
    b.maximize();
    expect(b.el.classList.contains('maximized')).toBe(true);
    b.minimize();
    b.restore();
    expect(b.state).toBe('maximized');
  });

  it('closes windows and honours onClose vetoes', async () => {
    const a = open('a', { onClose: () => false });
    expect(await a.close()).toBe(false);
    expect(wm.get('a')).toBe(a);
    expect(await a.close(true)).toBe(true);
    expect(wm.get('a')).toBeUndefined();
    expect(a.el.isConnected).toBe(false);
  });

  it('modal children block their owner and receive focus', async () => {
    const owner = open('owner');
    const modal = open('modal', { owner, modal: true, resizable: false });
    expect(owner.el.querySelector('.modal-blocker')).not.toBeNull();
    wm.focus(owner);
    expect(wm.active).toBe(modal);
    await modal.close();
    expect(owner.el.querySelector('.modal-blocker')).toBeNull();
    expect(wm.active).toBe(owner);
  });

  it('lists taskbar windows in opening order, excluding owned ones', () => {
    const a = open('a');
    const b = open('b');
    open('c', { owner: a });
    wm.focus(a);
    expect(wm.taskWindows.map((w) => w.opts.key)).toEqual(['a', 'b']);
    void b;
  });
});
