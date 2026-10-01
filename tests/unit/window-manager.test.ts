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

describe('resizing', () => {
  const drag = (handle: Element, from: { x: number; y: number }, to: { x: number; y: number }) => {
    handle.dispatchEvent(new MouseEvent('pointerdown', { button: 0, clientX: from.x, clientY: from.y, bubbles: true }));
    handle.dispatchEvent(new MouseEvent('pointermove', { clientX: to.x, clientY: to.y, bubbles: true }));
    handle.dispatchEvent(new MouseEvent('pointerup', { clientX: to.x, clientY: to.y, bubbles: true }));
  };

  it('keeps the bottom edge in place when the top edge is dragged past the desktop', () => {
    const win = open('a', { x: 100, y: 50, width: 300, height: 200 });
    const bottom = win.bounds.y + win.bounds.h;
    drag(win.el.querySelector('.resize-n')!, { x: 200, y: 50 }, { x: 200, y: -300 });
    expect(win.bounds.y).toBe(0);
    expect(win.bounds.y + win.bounds.h).toBe(bottom);
  });

  it('keeps the right edge in place when the left edge is dragged past the desktop', () => {
    const win = open('a', { x: 100, y: 50, width: 300, height: 200 });
    const right = win.bounds.x + win.bounds.w;
    drag(win.el.querySelector('.resize-w')!, { x: 100, y: 100 }, { x: -500, y: 100 });
    expect(win.bounds.x).toBe(0);
    expect(win.bounds.x + win.bounds.w).toBe(right);
  });

  it('respects the minimum size', () => {
    const win = open('a', { x: 100, y: 50, width: 300, height: 200, minHeight: 100 });
    drag(win.el.querySelector('.resize-n')!, { x: 200, y: 50 }, { x: 200, y: 400 });
    expect(win.bounds.h).toBe(100);
    expect(win.bounds.y + win.bounds.h).toBe(250);
  });

  it('still clamps windows that are moved off the desktop', () => {
    const win = open('a', { x: 100, y: 50, width: 300, height: 200 });
    drag(win.titlebar, { x: 150, y: 55 }, { x: 150, y: -400 });
    expect(win.bounds.y).toBe(0);
    expect(win.bounds.h).toBe(200);
  });
});
