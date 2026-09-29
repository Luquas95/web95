import { h, prefersReducedMotion } from './dom';

function fxLayer(): HTMLElement {
  let el = document.getElementById('fx-layer');
  if (!el) {
    el = h('div', { id: 'fx-layer', 'aria-hidden': 'true' });
    document.body.append(el);
  }
  return el;
}

export type Box = { left: number; top: number; width: number; height: number };

/**
 * The Windows 95 minimize/maximize effect: a title-bar-sized caption slides
 * between two rectangles (e.g. a window's title bar and its taskbar button).
 */
export function zoomCaption(from: Box, to: Box, active = true): Promise<void> {
  if (prefersReducedMotion() || typeof Element.prototype.animate !== 'function') return Promise.resolve();
  const caption = h('div', { class: `fx-caption${active ? '' : ' inactive'}` });
  fxLayer().append(caption);
  const frame = (b: Box) => ({
    left: `${b.left}px`,
    top: `${b.top}px`,
    width: `${Math.max(b.width, 8)}px`,
    height: `${Math.max(b.height, 4)}px`,
  });
  const anim = caption.animate([frame(from), frame(to)], { duration: 240, easing: 'steps(10, end)', fill: 'forwards' });
  return anim.finished
    .catch(() => undefined)
    .then(() => {
      caption.remove();
    });
}

export function toBox(rect: DOMRect | Box): Box {
  return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
}
