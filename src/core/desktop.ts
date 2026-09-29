import { liveText } from './controls';
import { clamp, h, isCoarsePointer } from './dom';
import { t, type StringKey } from './i18n';
import { icon, type IconName } from './icons';
import { openMenu } from './menu';
import { openApp, wm, type AppId } from './system';

interface DesktopIconDef {
  id: string;
  icon: IconName;
  label: StringKey;
  app: AppId;
}

export const DESKTOP_ICONS: DesktopIconDef[] = [
  { id: 'my-computer', icon: 'computer', label: 'desktop.myComputer', app: 'my-computer' },
  { id: 'outlook', icon: 'mail', label: 'desktop.outlook', app: 'outlook' },
  { id: 'ie', icon: 'ie', label: 'desktop.ie', app: 'ie' },
];

const GRID_X = 75;
const GRID_Y = 75;
const MARGIN = 4;

interface IconState {
  def: DesktopIconDef;
  el: HTMLButtonElement;
  x: number;
  y: number;
}

/**
 * The desktop surface: icons (select, double-click, drag, rubber-band
 * selection, keyboard navigation) and the desktop context menu.
 */
export function initDesktop(desktop: HTMLElement): void {
  const layer = h('div', { class: 'desktop-icons', role: 'listbox', 'aria-label': 'Desktop', 'aria-multiselectable': 'true' });
  desktop.append(layer);
  const icons: IconState[] = [];

  const place = (s: IconState) => {
    s.el.style.left = `${s.x}px`;
    s.el.style.top = `${s.y}px`;
  };

  const arrange = () => {
    // Column-first layout from the top-left corner, as Windows does.
    const rows = Math.max(1, Math.floor((desktop.clientHeight - MARGIN) / GRID_Y));
    icons.forEach((s, i) => {
      s.x = MARGIN + Math.floor(i / rows) * GRID_X;
      s.y = MARGIN + (i % rows) * GRID_Y;
      place(s);
    });
  };

  const select = (s: IconState | null, additive = false) => {
    for (const other of icons) {
      if (!additive || other === s) {
        const on = other === s ? (additive ? !other.el.classList.contains('selected') : true) : false;
        other.el.classList.toggle('selected', on);
        other.el.setAttribute('aria-selected', String(on));
      }
    }
    if (s) {
      for (const other of icons) other.el.tabIndex = other === s ? 0 : -1;
    }
  };

  const openIcon = (s: IconState) => {
    select(s);
    openApp(s.def.app);
  };

  DESKTOP_ICONS.forEach((def, i) => {
    const label = liveText(h('span', { class: 'desktop-icon-label' }), def.label);
    const el = h(
      'button',
      { class: 'desktop-icon', type: 'button', role: 'option', 'aria-selected': 'false', 'data-id': def.id, tabindex: i === 0 ? '0' : '-1' },
      h('span', { class: 'desktop-icon-img', style: `--icon: url("${icon(def.icon).src}")` }, icon(def.icon, 32)),
      label,
    );
    const state: IconState = { def, el, x: 0, y: 0 };
    icons.push(state);
    layer.append(el);

    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      wm().deactivate();
      if (e.ctrlKey) select(state, true);
      else if (!el.classList.contains('selected')) select(state);
      startIconDrag(e, state);
    });
    el.addEventListener('click', (e) => {
      // On touch screens a single tap opens; with a mouse it takes a double-click.
      // Keyboard activation (detail 0) is handled by the Enter key below.
      if (!dragged && isCoarsePointer() && e.detail > 0) openIcon(state);
    });
    el.addEventListener('dblclick', () => {
      if (!isCoarsePointer()) openIcon(state);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        openIcon(state);
      } else if (e.key.startsWith('Arrow')) {
        e.preventDefault();
        const next = neighbour(state, e.key);
        if (next) {
          select(next);
          next.el.focus();
        }
      }
    });
    el.addEventListener('focus', () => {
      if (!icons.some((s) => s.el.classList.contains('selected'))) select(state);
    });
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      select(state);
      openMenu(
        [
          { label: t('desktop.open'), bold: true, action: () => openIcon(state), id: 'icon-open' },
          { separator: true },
          { label: t('desktop.properties'), disabled: true },
        ],
        { x: e.clientX, y: e.clientY },
      );
    });
  });

  const neighbour = (from: IconState, key: string): IconState | undefined => {
    const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[key];
    if (!dir) return undefined;
    let best: IconState | undefined;
    let bestScore = Infinity;
    for (const s of icons) {
      if (s === from) continue;
      const dx = s.x - from.x;
      const dy = s.y - from.y;
      const along = dx * dir[0] + dy * dir[1];
      if (along <= 0) continue;
      const across = Math.abs(dx * dir[1]) + Math.abs(dy * dir[0]);
      const score = along + across * 2;
      if (score < bestScore) {
        bestScore = score;
        best = s;
      }
    }
    return best;
  };

  // --- dragging icons around the desktop ---
  let dragged = false;
  const startIconDrag = (e: PointerEvent, state: IconState) => {
    dragged = false;
    const start = { x: e.clientX, y: e.clientY };
    const origin = { x: state.x, y: state.y };
    let ghost: HTMLElement | null = null;
    const el = state.el;
    el.setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      if (!ghost && Math.hypot(dx, dy) < 5) return;
      if (isCoarsePointer()) return; // no icon dragging on touch – it fights with scrolling and taps
      dragged = true;
      if (!ghost) {
        ghost = el.cloneNode(true) as HTMLElement;
        ghost.classList.add('drag-ghost');
        ghost.removeAttribute('data-id');
        layer.append(ghost);
      }
      ghost.style.left = `${origin.x + dx}px`;
      ghost.style.top = `${origin.y + dy}px`;
    };
    const up = (ev: PointerEvent) => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      if (ghost) {
        ghost.remove();
        if (ev.type === 'pointerup') {
          state.x = clamp(origin.x + ev.clientX - start.x, 0, desktop.clientWidth - GRID_X);
          state.y = clamp(origin.y + ev.clientY - start.y, 0, desktop.clientHeight - GRID_Y);
          place(state);
        }
      }
      // Let the click that follows this pointerup see `dragged` before resetting.
      setTimeout(() => (dragged = false), 0);
    };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  };

  // --- rubber-band selection on the empty desktop ---
  desktop.addEventListener('pointerdown', (e) => {
    if (e.target !== desktop && e.target !== layer) return;
    if (e.button !== 0) return;
    wm().deactivate();
    select(null);
    const rect = desktop.getBoundingClientRect();
    const start = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    let band: HTMLElement | null = null;
    desktop.setPointerCapture?.(e.pointerId);
    const move = (ev: PointerEvent) => {
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      if (!band && Math.hypot(x - start.x, y - start.y) < 4) return;
      if (!band) {
        band = h('div', { class: 'rubber-band' });
        layer.append(band);
      }
      const box = { left: Math.min(x, start.x), top: Math.min(y, start.y), right: Math.max(x, start.x), bottom: Math.max(y, start.y) };
      Object.assign(band.style, {
        left: `${box.left}px`,
        top: `${box.top}px`,
        width: `${box.right - box.left}px`,
        height: `${box.bottom - box.top}px`,
      });
      for (const s of icons) {
        const hit = s.x < box.right && s.x + GRID_X - 10 > box.left && s.y < box.bottom && s.y + GRID_Y - 10 > box.top;
        s.el.classList.toggle('selected', hit);
        s.el.setAttribute('aria-selected', String(hit));
      }
    };
    const up = () => {
      desktop.removeEventListener('pointermove', move);
      desktop.removeEventListener('pointerup', up);
      desktop.removeEventListener('pointercancel', up);
      band?.remove();
    };
    desktop.addEventListener('pointermove', move);
    desktop.addEventListener('pointerup', up);
    desktop.addEventListener('pointercancel', up);
  });

  desktop.addEventListener('contextmenu', (e) => {
    if (e.target !== desktop && e.target !== layer) return;
    e.preventDefault();
    openMenu(
      [
        {
          label: t('desktop.arrangeIcons'),
          submenu: () => [{ label: t('desktop.byName'), action: arrange, id: 'arrange-name' }],
        },
        {
          label: t('desktop.lineUp'),
          action: () => {
            for (const s of icons) {
              s.x = MARGIN + Math.round((s.x - MARGIN) / GRID_X) * GRID_X;
              s.y = MARGIN + Math.round((s.y - MARGIN) / GRID_Y) * GRID_Y;
              place(s);
            }
          },
        },
        { separator: true },
        {
          label: t('desktop.refresh'),
          action: () => {
            layer.style.visibility = 'hidden';
            setTimeout(() => (layer.style.visibility = ''), 120);
          },
        },
        { separator: true },
        { label: t('desktop.properties'), disabled: true },
      ],
      { x: e.clientX, y: e.clientY },
    );
  });

  arrange();
  let lastHeight = desktop.clientHeight;
  window.addEventListener('resize', () => {
    if (desktop.clientHeight !== lastHeight) {
      lastHeight = desktop.clientHeight;
      // Keep icons on screen when the viewport shrinks.
      if (icons.some((s) => s.y + GRID_Y > desktop.clientHeight || s.x + GRID_X > desktop.clientWidth)) arrange();
    }
  });
}
