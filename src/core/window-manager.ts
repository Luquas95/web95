import { zoomCaption, toBox, type Box } from './animate';
import { clamp, h, prefersReducedMotion, uniqueId } from './dom';
import { t, whileConnected } from './i18n';
import { icon, type IconName } from './icons';
import { openMenu, type MenuItem } from './menu';

export type WinState = 'normal' | 'minimized' | 'maximized';
type Bounds = { x: number; y: number; w: number; h: number };
type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface WindowOptions {
  /** Instance key: opening a window with an existing key focuses that window instead. */
  key: string;
  title: () => string;
  icon: IconName;
  width: number;
  height: number;
  x?: number;
  y?: number;
  minWidth?: number;
  minHeight?: number;
  resizable?: boolean;
  minimizable?: boolean;
  maximizable?: boolean;
  /** Start maximized. Windows also start maximized on small screens when maximizable. */
  maximized?: boolean;
  /** Show on the taskbar (default: true unless owned). */
  taskbar?: boolean;
  /** Owner window; a modal window blocks its owner until closed. */
  owner?: Win;
  modal?: boolean;
  className?: string;
  /** Size a fixed-size window to its content: `height`, or `both` (message boxes). */
  autoSize?: 'height' | 'both';
  menubar?: HTMLElement;
  toolbar?: HTMLElement;
  body: HTMLElement;
  statusbar?: HTMLElement;
  /** Return false (or a promise of false) to keep the window open. Skipped on forced close. */
  onClose?: () => boolean | void | Promise<boolean | void>;
  /** Always called once the window is gone. */
  onClosed?: () => void;
  onResize?: () => void;
  onFocus?: () => void;
}

const TITLE_H = 18;
let nextSeq = 0;
const MIN_W = 120;
const MIN_H = 60;

export class Win {
  readonly id = uniqueId('win');
  /** Opening order, used for taskbar button order. */
  readonly seq = nextSeq++;
  readonly el: HTMLElement;
  readonly titlebar: HTMLElement;
  readonly bodyEl: HTMLElement;
  state: WinState = 'normal';
  /** State to return to when restored from the taskbar. */
  private beforeMinimize: WinState = 'normal';
  bounds: Bounds;
  children = new Set<Win>();
  private blocker: HTMLElement | null = null;
  private readonly titleText: HTMLElement;
  private readonly maxBtn: HTMLButtonElement | null;
  closed = false;

  constructor(
    readonly wm: WindowManager,
    readonly opts: WindowOptions,
  ) {
    const titleId = uniqueId('wt');
    this.titleText = h('span', { class: 'title-text', id: titleId }, opts.title());
    const titleIcon = h('button', { class: 'title-icon', type: 'button', tabindex: '-1', 'aria-hidden': 'true' }, icon(opts.icon, 16));
    const buttons = h('div', { class: 'title-buttons' });
    const minimizable = opts.minimizable ?? !opts.owner;
    const maximizable = opts.maximizable ?? opts.resizable !== false;
    if (minimizable) buttons.append(this.titleButton('min', 'win.minimizeTip', () => this.minimize()));
    this.maxBtn = maximizable ? this.titleButton('max', 'win.maximizeTip', () => this.toggleMaximize()) : null;
    if (this.maxBtn) buttons.append(this.maxBtn);
    buttons.append(this.titleButton('close', 'win.closeTip', () => void this.close()));
    if (minimizable || maximizable) buttons.lastElementChild!.classList.add('gap');

    this.titlebar = h('div', { class: 'titlebar' }, titleIcon, this.titleText, buttons);
    this.bodyEl = h('div', { class: 'window-body' }, opts.body);
    this.el = h(
      'div',
      {
        class: `window ${opts.className ?? ''}`,
        role: opts.modal ? 'alertdialog' : 'dialog',
        'aria-labelledby': titleId,
        'aria-modal': opts.modal ? 'true' : undefined,
        tabindex: '-1',
        'data-key': opts.key,
      },
      this.titlebar,
      opts.menubar ?? null,
      opts.toolbar ?? null,
      this.bodyEl,
      opts.statusbar ?? null,
    );
    if (opts.resizable !== false) {
      for (const edge of ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as Edge[]) {
        const handle = h('div', { class: `resize resize-${edge}`, 'aria-hidden': 'true' });
        handle.addEventListener('pointerdown', (e) => this.startResize(e, edge));
        this.el.append(handle);
      }
    } else {
      this.el.classList.add('fixed-size');
    }

    this.bounds = { x: 0, y: 0, w: opts.width, h: opts.height };
    this.el.addEventListener('pointerdown', () => wm.focus(this), true);
    this.el.addEventListener('focusin', () => {
      if (wm.active !== this) wm.focus(this);
    });
    this.titlebar.addEventListener('pointerdown', (e) => this.startMove(e));
    this.titlebar.addEventListener('dblclick', (e) => {
      if ((e.target as Element).closest('.title-buttons, .title-icon')) return;
      if (this.maxBtn) this.toggleMaximize();
    });
    titleIcon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openSystemMenu(titleIcon);
    });
    titleIcon.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      void this.close();
    });
    this.titlebar.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.openSystemMenu({ x: e.clientX, y: e.clientY });
    });
    whileConnected(this.el, () => this.refreshTitle());
  }

  private titleButton(kind: 'min' | 'max' | 'close', tip: 'win.minimizeTip' | 'win.maximizeTip' | 'win.closeTip', fn: () => void) {
    const btn = h('button', {
      class: `title-btn title-${kind}`,
      type: 'button',
      tabindex: '-1',
      'data-i18n-title': tip,
      'data-i18n-label': tip,
      title: t(tip),
      'aria-label': t(tip),
    });
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      fn();
    });
    return btn;
  }

  get title(): string {
    return this.opts.title();
  }

  get iconName(): IconName {
    return this.opts.icon;
  }

  refreshTitle(): void {
    this.titleText.textContent = this.opts.title();
    this.wm.changed();
  }

  focus(): void {
    this.wm.focus(this);
  }

  // ---------- geometry ----------

  applyGeometry(): void {
    const s = this.el.style;
    if (this.state === 'maximized') {
      s.left = '0px';
      s.top = '0px';
      s.width = '100%';
      s.height = '100%';
    } else {
      const b = this.bounds;
      s.left = `${Math.round(b.x)}px`;
      s.top = `${Math.round(b.y)}px`;
      s.width = this.opts.autoSize === 'both' ? 'auto' : `${Math.round(b.w)}px`;
      s.height = this.opts.autoSize ? 'auto' : `${Math.round(b.h)}px`;
    }
    this.el.classList.toggle('maximized', this.state === 'maximized');
    this.el.hidden = this.state === 'minimized';
    if (this.maxBtn) {
      const max = this.state === 'maximized';
      this.maxBtn.classList.toggle('title-restore', max);
      const tip = max ? 'win.restoreTip' : 'win.maximizeTip';
      this.maxBtn.dataset.i18nTitle = tip;
      this.maxBtn.dataset.i18nLabel = tip;
      this.maxBtn.title = t(tip);
      this.maxBtn.setAttribute('aria-label', t(tip));
    }
    this.opts.onResize?.();
  }

  /** Keep at least part of the title bar reachable inside the desktop. */
  clampToDesktop(): void {
    const { w: dw, h: dh } = this.wm.desktopSize();
    const b = this.bounds;
    b.w = Math.min(b.w, Math.max(MIN_W, dw));
    b.h = Math.min(b.h, Math.max(MIN_H, dh));
    b.x = clamp(b.x, Math.min(0, -b.w + 60), dw - 60);
    b.y = clamp(b.y, 0, dh - TITLE_H - 6);
  }

  /** Screen rectangle of the title bar for a given state (used by animations). */
  captionBox(state: WinState = this.state): Box {
    const desk = this.wm.container.getBoundingClientRect();
    if (state === 'maximized') return { left: desk.left, top: desk.top, width: desk.width, height: TITLE_H };
    const b = this.bounds;
    return { left: desk.left + b.x + 3, top: desk.top + b.y + 3, width: b.w - 6, height: TITLE_H };
  }

  // ---------- state changes ----------

  minimize(): void {
    if (this.state === 'minimized' || this.opts.owner) return;
    const from = this.captionBox();
    this.beforeMinimize = this.state;
    this.state = 'minimized';
    this.applyGeometry();
    for (const child of this.children) child.el.hidden = true;
    const target = this.wm.taskbarRect(this);
    if (target) void zoomCaption(from, toBox(target), this.wm.active === this);
    this.wm.activateTop(this);
  }

  /** Restore from minimized (to its previous state) or from maximized. */
  restore(): void {
    if (this.state === 'minimized') {
      const target = this.beforeMinimize;
      const from = this.wm.taskbarRect(this);
      const show = () => {
        this.state = target;
        this.applyGeometry();
        for (const child of this.children) child.el.hidden = child.state === 'minimized';
        this.wm.focus(this);
      };
      if (from && !prefersReducedMotion()) void zoomCaption(toBox(from), this.captionBox(target)).then(show);
      else show();
      return;
    }
    if (this.state === 'maximized') {
      void zoomCaption(this.captionBox('maximized'), this.captionBox('normal'));
      this.state = 'normal';
      this.clampToDesktop();
      this.applyGeometry();
    }
  }

  maximize(): void {
    if (this.state === 'maximized' || !this.maxBtn) return;
    if (this.state === 'minimized') {
      this.beforeMinimize = 'maximized';
      this.restore();
      return;
    }
    void zoomCaption(this.captionBox('normal'), this.captionBox('maximized'));
    this.state = 'maximized';
    this.applyGeometry();
  }

  toggleMaximize(): void {
    if (this.state === 'maximized') this.restore();
    else this.maximize();
  }

  /** Close the window. `force` skips the onClose confirmation (used on shut down). */
  async close(force = false): Promise<boolean> {
    if (this.closed) return true;
    for (const child of [...this.children]) {
      if (!(await child.close(force))) return false;
    }
    if (this.opts.onClose && !force) {
      const result = await this.opts.onClose();
      if (result === false) return false;
    }
    this.closed = true;
    this.wm.remove(this);
    this.opts.onClosed?.();
    return true;
  }

  // ---------- modal handling ----------

  block(modal: Win): void {
    if (this.blocker) return;
    this.blocker = h('div', { class: 'modal-blocker' });
    this.blocker.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      modal.flash();
    });
    this.el.append(this.blocker);
  }

  unblock(): void {
    this.blocker?.remove();
    this.blocker = null;
  }

  get modalChild(): Win | null {
    for (const child of this.children) if (child.opts.modal && !child.closed) return child.modalChild ?? child;
    return null;
  }

  /** Blink the title bar, as Windows does when you click a blocked owner. */
  flash(): void {
    this.wm.focus(this);
    let n = 0;
    const tick = () => {
      this.el.classList.toggle('inactive-flash');
      if (++n < 6) setTimeout(tick, 70);
      else this.el.classList.remove('inactive-flash');
    };
    tick();
  }

  // ---------- system menu ----------

  openSystemMenu(anchor: HTMLElement | { x: number; y: number }): void {
    const max = this.state === 'maximized';
    const canMax = !!this.maxBtn;
    const canMin = this.opts.minimizable ?? !this.opts.owner;
    const items: MenuItem[] = [
      { label: t('win.restore'), disabled: !max, action: () => this.restore(), id: 'sys-restore' },
      { label: t('win.move'), disabled: true },
      { label: t('win.size'), disabled: true },
      { label: t('win.minimize'), disabled: !canMin, action: () => this.minimize(), id: 'sys-minimize' },
      { label: t('win.maximize'), disabled: !canMax || max, action: () => this.maximize(), id: 'sys-maximize' },
      { separator: true },
      { label: t('win.close'), shortcut: t('win.closeShortcut'), bold: true, action: () => void this.close(), id: 'sys-close' },
    ];
    const pos = anchor instanceof HTMLElement ? { rect: anchor.getBoundingClientRect(), side: 'below' as const } : anchor;
    openMenu(items, pos, { ignore: [this.titlebar.querySelector('.title-icon')!] });
  }

  // ---------- move & resize (outline drag, as in Windows 95) ----------

  private startMove(e: PointerEvent): void {
    if (e.button !== 0 || (e.target as Element).closest('.title-buttons, .title-icon')) return;
    if (this.state === 'maximized') return;
    e.preventDefault();
    const start = { x: e.clientX, y: e.clientY };
    const origin = { ...this.bounds };
    const { w: dw, h: dh } = this.wm.desktopSize();
    this.dragOutline(
      e,
      (dx, dy) => ({
        ...origin,
        // Keep part of the title bar reachable.
        x: clamp(origin.x + dx, -origin.w + 40, dw - 40),
        y: clamp(origin.y + dy, 0, dh - TITLE_H),
      }),
      start,
    );
  }

  private startResize(e: PointerEvent, edge: Edge): void {
    if (e.button !== 0 || this.state === 'maximized') return;
    e.preventDefault();
    e.stopPropagation();
    this.wm.focus(this);
    const origin = { ...this.bounds };
    const minW = this.opts.minWidth ?? MIN_W;
    const minH = this.opts.minHeight ?? MIN_H;
    this.dragOutline(
      e,
      (dx, dy) => {
        const b = { ...origin };
        if (edge.includes('e')) b.w = Math.max(minW, origin.w + dx);
        if (edge.includes('s')) b.h = Math.max(minH, origin.h + dy);
        // The opposite edge stays anchored, also when the pointer leaves the desktop.
        if (edge.includes('w')) {
          const right = origin.x + origin.w;
          b.x = clamp(origin.x + dx, Math.min(0, origin.x), right - minW);
          b.w = right - b.x;
        }
        if (edge.includes('n')) {
          const bottom = origin.y + origin.h;
          b.y = clamp(origin.y + dy, 0, bottom - minH);
          b.h = bottom - b.y;
        }
        return b;
      },
      { x: e.clientX, y: e.clientY },
    );
  }

  private dragOutline(e: PointerEvent, compute: (dx: number, dy: number) => Bounds, start: { x: number; y: number }): void {
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture?.(e.pointerId);
    let outline: HTMLElement | null = null;
    let next: Bounds | null = null;

    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!outline && Math.abs(dx) + Math.abs(dy) < 3) return;
      next = compute(dx, dy);
      if (!outline) {
        outline = this.wm.createOutline();
      }
      Object.assign(outline.style, {
        left: `${next.x}px`,
        top: `${next.y}px`,
        width: `${next.w}px`,
        height: `${next.h}px`,
      });
    };
    const finish = (commit: boolean) => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', cancel);
      document.removeEventListener('keydown', key, true);
      outline?.remove();
      if (commit && next) {
        this.bounds = next;
        this.applyGeometry();
      }
    };
    const up = () => finish(true);
    const cancel = () => finish(false);
    const key = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        finish(false);
      }
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', cancel);
    document.addEventListener('keydown', key, true);
  }
}

export class WindowManager {
  readonly windows: Win[] = [];
  active: Win | null = null;
  private listeners = new Set<() => void>();
  private cascade = 0;
  /** Provided by the taskbar so animations know where buttons are. */
  taskbarRectFor: ((win: Win) => DOMRect | null) | null = null;

  constructor(readonly container: HTMLElement) {
    window.addEventListener('resize', () => {
      for (const win of this.windows) {
        if (win.state !== 'maximized') {
          win.clampToDesktop();
          win.applyGeometry();
        } else win.opts.onResize?.();
      }
    });
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  changed(): void {
    for (const fn of this.listeners) fn();
  }

  desktopSize(): { w: number; h: number } {
    return { w: this.container.clientWidth || window.innerWidth, h: this.container.clientHeight || window.innerHeight };
  }

  isSmallScreen(): boolean {
    const { w, h: hh } = this.desktopSize();
    return w < 640 || hh < 420;
  }

  get(key: string): Win | undefined {
    return this.windows.find((w) => w.opts.key === key && !w.closed);
  }

  /** Taskbar-visible windows in the order they were opened. */
  get taskWindows(): Win[] {
    return [...this.windows].filter((w) => w.opts.taskbar ?? !w.opts.owner).sort((a, b) => a.seq - b.seq);
  }

  open(opts: WindowOptions): Win {
    const existing = this.get(opts.key);
    if (existing) {
      if (existing.state === 'minimized') existing.restore();
      else this.focus(existing);
      return existing;
    }
    const win = new Win(this, opts);
    const { w: dw, h: dh } = this.desktopSize();
    const b = win.bounds;
    b.w = Math.min(opts.width, dw - 4);
    b.h = Math.min(opts.height, dh - 4);
    if (opts.x !== undefined && opts.y !== undefined) {
      b.x = opts.x;
      b.y = opts.y;
    } else if (opts.owner || opts.resizable === false) {
      b.x = (dw - b.w) / 2;
      b.y = Math.max(0, (dh - b.h) / 2.4);
    } else {
      const step = 26;
      const slots = Math.max(1, Math.floor(Math.min(dw - b.w, dh - b.h) / step));
      const n = this.cascade++ % Math.min(slots, 8);
      b.x = 60 + n * step;
      b.y = 20 + n * step;
      if (b.x + b.w > dw) b.x = Math.max(0, dw - b.w - 2);
      if (b.y + b.h > dh) b.y = Math.max(0, dh - b.h - 2);
    }
    win.clampToDesktop();
    const canMax = (opts.maximizable ?? opts.resizable !== false) && !opts.owner;
    if (canMax && (opts.maximized || this.isSmallScreen())) win.state = 'maximized';
    win.applyGeometry();

    if (opts.owner) {
      opts.owner.children.add(win);
      if (opts.modal) opts.owner.block(win);
    }
    this.windows.push(win);
    this.container.append(win.el);
    if (opts.autoSize) {
      // Measure the content, then centre the window like a dialog.
      const rect = win.el.getBoundingClientRect();
      if (rect.height) {
        b.w = rect.width;
        b.h = rect.height;
        if (opts.x === undefined) {
          b.x = Math.max(0, (dw - b.w) / 2);
          b.y = Math.max(0, (dh - b.h) / 2.4);
        }
        win.applyGeometry();
      }
    }
    this.focus(win);
    win.el.focus({ preventScroll: true });
    return win;
  }

  focus(win: Win | null): void {
    if (win && win.closed) return;
    // A window blocked by a modal dialog hands focus to that dialog.
    const modal = win?.modalChild;
    if (win && modal && modal !== win) {
      this.raise(win);
      win = modal;
    }
    if (win) {
      this.raise(win);
      if (win.opts.owner) this.raiseChildren(win.opts.owner);
      this.raiseChildren(win);
    }
    if (this.active !== win) {
      this.active?.el.classList.remove('active');
      this.active = win;
      win?.el.classList.add('active');
      win?.opts.onFocus?.();
    }
    this.changed();
  }

  private raise(win: Win): void {
    const i = this.windows.indexOf(win);
    if (i >= 0) this.windows.splice(i, 1);
    this.windows.push(win);
    this.windows.forEach((w, index) => (w.el.style.zIndex = String(10 + index)));
  }

  private raiseChildren(win: Win): void {
    for (const child of win.children) {
      if (!child.closed) this.raise(child);
    }
  }

  /** Focus the topmost visible window other than `except`. */
  activateTop(except?: Win): void {
    const next = [...this.windows].reverse().find((w) => w !== except && w.state !== 'minimized' && !w.el.hidden);
    this.focus(next ?? null);
  }

  remove(win: Win): void {
    const i = this.windows.indexOf(win);
    if (i >= 0) this.windows.splice(i, 1);
    if (win.opts.owner) {
      win.opts.owner.children.delete(win);
      if (!win.opts.owner.modalChild) win.opts.owner.unblock();
    }
    win.el.remove();
    if (this.active === win) {
      this.active = null;
      const owner = win.opts.owner;
      if (owner && !owner.closed && owner.state !== 'minimized') this.focus(owner);
      else this.activateTop();
    } else this.changed();
  }

  /** Clicking the empty desktop deactivates every window. */
  deactivate(): void {
    this.focus(null);
  }

  taskbarRect(win: Win): DOMRect | null {
    return this.taskbarRectFor?.(win) ?? null;
  }

  createOutline(): HTMLElement {
    const el = h(
      'div',
      { class: 'drag-outline', 'aria-hidden': 'true' },
      h('i', { class: 'edge-t' }),
      h('i', { class: 'edge-b' }),
      h('i', { class: 'edge-l' }),
      h('i', { class: 'edge-r' }),
    );
    this.container.append(el);
    return el;
  }

  async closeAll(): Promise<void> {
    for (const win of [...this.windows].reverse()) {
      if (!win.closed) await win.close(true);
    }
  }
}
