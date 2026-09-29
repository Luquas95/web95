import { accelKey, accelLabel, h } from './dom';
import { t, whileConnected } from './i18n';
import { icon, type IconName } from './icons';

export interface MenuItem {
  /** Label; `&` marks the access key. */
  label?: string | (() => string);
  icon?: IconName;
  shortcut?: string;
  disabled?: boolean | (() => boolean);
  checked?: boolean | (() => boolean);
  /** Draw a bullet instead of a check mark when checked. */
  radio?: boolean;
  bold?: boolean;
  separator?: boolean;
  submenu?: MenuItem[] | (() => MenuItem[]);
  action?: () => void;
  /** Stable hook for tests and styling. */
  id?: string;
}

export type Anchor =
  | { x: number; y: number }
  | { rect: DOMRect; side: 'below' | 'right' | 'above' };

export interface MenuOptions {
  /** `start` renders large icons for the top level of the Start menu. */
  variant?: 'default' | 'start';
  /** Vertical banner shown on the left (Start menu). */
  banner?: HTMLElement;
  /** Called once the whole menu tree is closed. */
  onClose?: () => void;
  /** Elements whose clicks should not dismiss the menu (e.g. the Start button). */
  ignore?: Element[];
  /** Focus the first item right away (keyboard invocation). */
  focusFirst?: boolean;
  /** Menubar hook: ArrowLeft/ArrowRight at the top level. */
  onNavigate?: (dir: -1 | 1) => void;
  ariaLabel?: string;
}

const SUBMENU_DELAY = 350;

const value = <T>(v: T | (() => T) | undefined): T | undefined =>
  typeof v === 'function' ? (v as () => T)() : v;

let root: Menu | null = null;

function layer(): HTMLElement {
  let el = document.getElementById('menu-layer');
  if (!el) {
    el = h('div', { id: 'menu-layer' });
    document.body.append(el);
  }
  return el;
}

class Menu {
  readonly el: HTMLElement;
  private readonly itemEls: HTMLElement[] = [];
  private readonly items: MenuItem[];
  private active = -1;
  private child: Menu | null = null;
  private timer: number | undefined;

  constructor(
    items: MenuItem[],
    anchor: Anchor,
    readonly opts: MenuOptions,
    readonly parent: Menu | null = null,
  ) {
    this.items = items;
    const list = h('ul', { class: 'menu-list', role: 'none' });
    this.el = h(
      'div',
      {
        class: `menu ${opts.variant === 'start' && !parent ? 'menu-start' : ''}`,
        role: 'menu',
        'aria-label': !parent ? opts.ariaLabel : undefined,
      },
      !parent && opts.banner ? opts.banner : null,
      list,
    );
    items.forEach((item, index) => {
      const el = this.renderItem(item, index);
      this.itemEls.push(el);
      list.append(el);
    });
    this.el.addEventListener('pointerleave', () => {
      // Moving off a menu keeps an open submenu's parent item highlighted.
      if (!this.child) this.setActive(-1);
    });
    this.el.addEventListener('contextmenu', (e) => e.preventDefault());
    layer().append(this.el);
    this.position(anchor);
    whileConnected(this.el, () => closeMenus());
  }

  private renderItem(item: MenuItem, index: number): HTMLElement {
    if (item.separator) return h('li', { class: 'menu-sep', role: 'separator' });
    const label = value(item.label) ?? '';
    const disabled = !!value(item.disabled);
    const checked = value(item.checked);
    const large = this.opts.variant === 'start' && !this.parent;
    const hasSub = !!item.submenu;
    const li = h(
      'li',
      {
        class: `menu-item${disabled ? ' disabled' : ''}${item.bold ? ' bold' : ''}`,
        role: checked !== undefined ? (item.radio ? 'menuitemradio' : 'menuitemcheckbox') : 'menuitem',
        'aria-disabled': disabled ? 'true' : undefined,
        'aria-checked': checked !== undefined ? String(checked) : undefined,
        'aria-haspopup': hasSub ? 'menu' : undefined,
        'data-id': item.id,
        tabindex: '-1',
      },
      h(
        'span',
        { class: 'menu-icon' },
        item.icon ? icon(item.icon, large ? 32 : 16) : checked ? h('span', { class: item.radio ? 'menu-radio' : 'menu-check' }) : null,
      ),
      h('span', { class: 'menu-label' }, accelLabel(label)),
      item.shortcut ? h('span', { class: 'menu-shortcut' }, item.shortcut) : null,
      h('span', { class: `menu-arrow${hasSub ? ' has-sub' : ''}` }),
    );
    li.addEventListener('pointerenter', () => this.hover(index));
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      this.activate(index);
    });
    return li;
  }

  private position(anchor: Anchor): void {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const { width, height } = this.el.getBoundingClientRect();
    let x: number;
    let y: number;
    if ('x' in anchor) {
      x = anchor.x + width > vw ? Math.max(0, anchor.x - width) : anchor.x;
      y = anchor.y + height > vh ? Math.max(0, anchor.y - height) : anchor.y;
    } else if (anchor.side === 'right') {
      x = anchor.rect.right - 3;
      if (x + width > vw) x = Math.max(0, anchor.rect.left - width + 3);
      y = anchor.rect.top - 3;
      if (y + height > vh) y = Math.max(0, vh - height);
    } else if (anchor.side === 'above') {
      x = Math.min(anchor.rect.left, Math.max(0, vw - width));
      y = Math.max(0, anchor.rect.top - height);
    } else {
      x = Math.min(anchor.rect.left, Math.max(0, vw - width));
      y = anchor.rect.bottom;
      if (y + height > vh) y = Math.max(0, anchor.rect.top - height);
    }
    this.el.style.left = `${Math.round(x)}px`;
    this.el.style.top = `${Math.round(y)}px`;
  }

  setActive(index: number, focus = false): void {
    if (this.active >= 0) this.itemEls[this.active]?.classList.remove('active');
    this.active = index;
    const el = this.itemEls[index];
    if (el) {
      el.classList.add('active');
      if (focus) el.focus({ preventScroll: true });
    }
  }

  private hover(index: number): void {
    clearTimeout(this.timer);
    this.setActive(index);
    const item = this.items[index];
    if (this.child && this.child.openedFrom !== index) {
      this.timer = window.setTimeout(() => this.closeChild(), SUBMENU_DELAY);
    }
    if (item.submenu && !value(item.disabled) && this.child?.openedFrom !== index) {
      this.timer = window.setTimeout(() => this.openChild(index, false), SUBMENU_DELAY);
    }
  }

  private openChild(index: number, focusFirst: boolean): void {
    clearTimeout(this.timer);
    this.closeChild();
    const item = this.items[index];
    const sub = value(item.submenu);
    if (!sub) return;
    this.setActive(index);
    const items = sub.length ? sub : [{ label: t('start.empty'), disabled: true }];
    const child = new Menu(items, { rect: this.itemEls[index].getBoundingClientRect(), side: 'right' }, this.opts, this);
    child.openedFrom = index;
    this.child = child;
    if (focusFirst) child.moveBy(1);
  }

  openedFrom = -1;

  closeChild(): void {
    if (this.child) {
      this.child.destroy();
      this.child = null;
    }
  }

  activate(index: number): void {
    const item = this.items[index];
    if (!item || item.separator || value(item.disabled)) return;
    if (item.submenu) {
      this.openChild(index, false);
      return;
    }
    closeMenus();
    item.action?.();
  }

  moveBy(step: 1 | -1): void {
    const n = this.items.length;
    let i = this.active;
    for (let tries = 0; tries < n; tries++) {
      i = (i + step + n) % n;
      if (!this.items[i].separator) {
        this.setActive(i, true);
        return;
      }
    }
  }

  /** The deepest open menu in this chain. */
  deepest(): Menu {
    return this.child ? this.child.deepest() : this;
  }

  handleKey(e: KeyboardEvent): void {
    const item = this.items[this.active];
    switch (e.key) {
      case 'ArrowDown':
        this.moveBy(1);
        break;
      case 'ArrowUp':
        this.moveBy(-1);
        break;
      case 'ArrowRight':
        if (item?.submenu && !value(item.disabled)) this.openChild(this.active, true);
        else this.opts.onNavigate?.(1);
        break;
      case 'ArrowLeft':
        if (this.parent) {
          const parent = this.parent;
          parent.closeChild();
          parent.itemEls[parent.active]?.focus({ preventScroll: true });
        } else this.opts.onNavigate?.(-1);
        break;
      case 'Enter':
      case ' ':
        if (this.active >= 0) {
          if (item?.submenu) this.openChild(this.active, true);
          else this.activate(this.active);
        }
        break;
      case 'Escape':
        if (this.parent) {
          const parent = this.parent;
          parent.closeChild();
          parent.itemEls[parent.active]?.focus({ preventScroll: true });
        } else closeMenus();
        break;
      case 'Tab':
        closeMenus();
        return;
      default: {
        const key = e.key.toLowerCase();
        if (key.length !== 1) return;
        const index = this.items.findIndex((it) => !it.separator && accelKey(value(it.label) ?? '') === key);
        if (index < 0) return;
        this.setActive(index, true);
        if (this.items[index].submenu) this.openChild(index, true);
        else this.activate(index);
      }
    }
    e.preventDefault();
    e.stopPropagation();
  }

  destroy(): void {
    clearTimeout(this.timer);
    this.closeChild();
    this.el.remove();
  }
}

function onPointerDown(e: PointerEvent): void {
  if (!root) return;
  const target = e.target as Node;
  if (target instanceof Element && target.closest('.menu')) return;
  if (root.opts.ignore?.some((el) => el.contains(target))) return;
  closeMenus();
}

function onKeyDown(e: KeyboardEvent): void {
  if (root) root.deepest().handleKey(e);
}

function onBlur(): void {
  closeMenus();
}

/** Open a menu tree, closing any other open menu first. */
export function openMenu(items: MenuItem[], anchor: Anchor, opts: MenuOptions = {}): void {
  closeMenus();
  root = new Menu(items, anchor, opts);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('blur', onBlur);
  window.addEventListener('resize', onBlur);
  if (opts.focusFirst) root.moveBy(1);
  else root.el.focus?.();
}

export function closeMenus(): void {
  if (!root) return;
  const closing = root;
  root = null;
  closing.destroy();
  document.removeEventListener('pointerdown', onPointerDown, true);
  document.removeEventListener('keydown', onKeyDown, true);
  window.removeEventListener('blur', onBlur);
  window.removeEventListener('resize', onBlur);
  closing.opts.onClose?.();
}

export function isMenuOpen(): boolean {
  return root !== null;
}

export interface MenubarMenu {
  label: () => string;
  items: () => MenuItem[];
}

/** A window menu bar (File, Edit, View…). */
export function createMenubar(menus: MenubarMenu[]): HTMLElement {
  const bar = h('div', { class: 'menubar', role: 'menubar' });
  let openIndex = -1;
  const buttons = menus.map((menu, index) => {
    const btn = h('button', { class: 'menubar-item', type: 'button', role: 'menuitem', 'aria-haspopup': 'menu', tabindex: '-1' });
    btn.append(accelLabel(menu.label()));
    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      if (openIndex === index) closeMenus();
      else open(index, false);
    });
    btn.addEventListener('pointerenter', () => {
      if (openIndex >= 0 && openIndex !== index) open(index, false);
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        open(index, true);
      }
    });
    bar.append(btn);
    return btn;
  });

  function open(index: number, focusFirst: boolean): void {
    const btn = buttons[index];
    openMenu(menus[index].items(), { rect: btn.getBoundingClientRect(), side: 'below' }, {
      ignore: [bar],
      focusFirst,
      onClose: () => {
        btn.classList.remove('open');
        if (openIndex === index) openIndex = -1;
      },
      onNavigate: (dir) => open((index + dir + menus.length) % menus.length, true),
    });
    btn.classList.add('open');
    openIndex = index;
  }

  whileConnected(bar, () => {
    buttons.forEach((btn, i) => btn.replaceChildren(accelLabel(menus[i].label())));
  });
  return bar;
}
