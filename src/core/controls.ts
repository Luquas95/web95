import { accelKey, accelLabel, h, uniqueId } from './dom';
import { t, whileConnected, type StringKey } from './i18n';
import { toolIcon, type ToolIconName } from './icons';

/** Either a translation key or a function producing the (already localized) text. */
export type TextSource = StringKey | (() => string);

export function resolveText(src: TextSource): string {
  return typeof src === 'function' ? src() : t(src);
}

/** Fill `el` with text from `src` and keep it in sync with the language. */
export function liveText(el: HTMLElement, src: TextSource, accel = false): HTMLElement {
  const render = () => {
    const text = resolveText(src);
    if (accel) el.replaceChildren(accelLabel(text));
    else el.textContent = text.replace(/&(.)/g, '$1');
  };
  render();
  whileConnected(el, render);
  return el;
}

export interface ButtonOptions {
  isDefault?: boolean;
  disabled?: boolean;
  className?: string;
  id?: string;
}

/** A standard push button. Labels may contain `&` access keys. */
export function button(label: TextSource, onClick: (e: MouseEvent) => void, opts: ButtonOptions = {}): HTMLButtonElement {
  const btn = h('button', {
    type: 'button',
    class: `btn${opts.isDefault ? ' default' : ''} ${opts.className ?? ''}`.trim(),
    disabled: opts.disabled,
    'data-id': opts.id,
  });
  liveText(btn, label, true);
  btn.addEventListener('click', onClick);
  return btn;
}

/** Access key of a button's current label. */
export function buttonAccel(btn: HTMLButtonElement): string | null {
  const u = btn.querySelector('u');
  return u?.textContent?.toLowerCase() ?? accelKey(btn.textContent ?? '');
}

/** Toolbar button with a 20px icon and a caption underneath (IE/Outlook Express style). */
export function toolButton(
  iconName: ToolIconName,
  label: TextSource,
  onClick: () => void,
  /** `primary` keeps its caption on narrow windows, where other toolbar buttons show only icons. */
  opts: { disabled?: boolean; id?: string; compact?: boolean; primary?: boolean } = {},
): HTMLButtonElement {
  const caption = liveText(h('span', { class: 'tool-label' }), label);
  const btn = h(
    'button',
    { type: 'button', class: `tool-btn${opts.compact ? ' compact' : ''}${opts.primary ? ' primary' : ''}`, disabled: opts.disabled, 'data-id': opts.id },
    toolIcon(iconName),
    caption,
  );
  const updateTitle = () => {
    btn.title = resolveText(label);
  };
  updateTitle();
  whileConnected(btn, updateTitle);
  btn.addEventListener('click', () => onClick());
  return btn;
}

export function toolbar(...children: (HTMLElement | null)[]): HTMLElement {
  return h('div', { class: 'toolbar', role: 'toolbar' }, ...children);
}

export function toolSeparator(): HTMLElement {
  return h('span', { class: 'tool-sep', 'aria-hidden': 'true' });
}

export function statusbar(...fields: HTMLElement[]): HTMLElement {
  return h('div', { class: 'statusbar' }, ...fields.map((f) => (f.classList.add('status-field'), f)));
}

export function checkbox(label: TextSource, checked: boolean, onChange: (checked: boolean) => void): HTMLLabelElement {
  const id = uniqueId('cb');
  const input = h('input', { type: 'checkbox', id, class: 'checkbox', checked });
  input.addEventListener('change', () => onChange(input.checked));
  return h('label', { class: 'check-label', for: id }, input, liveText(h('span'), label, true));
}

export function radio(name: string, label: TextSource, checked: boolean, value: string, disabled = false): HTMLLabelElement {
  const id = uniqueId('rb');
  const input = h('input', { type: 'radio', id, name, value, class: 'radio', checked, disabled });
  return h('label', { class: `check-label${disabled ? ' disabled' : ''}`, for: id }, input, liveText(h('span'), label, true));
}

/** Label + control row where the label's access key focuses the control. */
export function fieldLabel(label: TextSource, control: HTMLElement): HTMLLabelElement {
  if (!control.id) control.id = uniqueId('fld');
  return liveText(h('label', { for: control.id, class: 'field-label' }), label, true) as HTMLLabelElement;
}
