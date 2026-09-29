import { button, buttonAccel } from './controls';
import { h, uniqueId } from './dom';
import { type StringKey } from './i18n';
import { icon } from './icons';
import { wm } from './system';
import type { Win } from './window-manager';

export type MsgButton = 'ok' | 'cancel' | 'yes' | 'no';
export type MsgIcon = 'info' | 'error' | 'warning' | 'question';

export interface MessageBoxOptions {
  title: () => string;
  text: () => string;
  icon?: MsgIcon;
  buttons?: MsgButton[];
  /** Index into `buttons` of the default button. */
  defaultIndex?: number;
  owner?: Win;
}

const LABELS: Record<MsgButton, StringKey> = { ok: 'btn.ok', cancel: 'btn.cancel', yes: 'btn.yes', no: 'btn.no' };

/** Resolves with the button that dismissed the box. */
export function messageBox(opts: MessageBoxOptions): Promise<MsgButton> {
  return showMessage(opts).result;
}

/**
 * Show a message box and get a handle to close it programmatically –
 * with `buttons: []` it works as a progress notice ("Checking for new messages...").
 */
export function showMessage(opts: MessageBoxOptions): { result: Promise<MsgButton>; close: () => void } {
  const buttons = opts.buttons ?? ['ok'];
  const escapeResult: MsgButton = buttons.includes('cancel') ? 'cancel' : buttons.includes('no') ? 'no' : 'ok';
  let win!: Win;
  const result = new Promise<MsgButton>((resolve) => {
    let chosen: MsgButton = escapeResult;
    const text = h('div', { class: 'msgbox-text' });
    const renderText = () => (text.textContent = opts.text());
    renderText();
    const row = h('div', { class: 'msgbox-buttons' });
    row.hidden = buttons.length === 0;
    const btns = buttons.map((b, i) =>
      button(
        LABELS[b],
        () => {
          chosen = b;
          void win.close(true);
        },
        { isDefault: i === (opts.defaultIndex ?? 0), id: `msg-${b}` },
      ),
    );
    row.append(...btns);
    const body = h(
      'div',
      { class: 'msgbox' },
      h('div', { class: 'msgbox-main' }, opts.icon ? icon(opts.icon, 32, 'msgbox-icon') : null, text),
      row,
    );
    body.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        chosen = escapeResult;
        void win.close(true);
        return;
      }
      if (e.altKey || e.ctrlKey || e.metaKey || e.key.length !== 1) return;
      const match = btns.find((btn) => buttonAccel(btn) === e.key.toLowerCase());
      if (match) {
        e.preventDefault();
        match.click();
      }
    });
    win = wm().open({
      key: uniqueId('msgbox'),
      title: opts.title,
      icon: opts.icon ?? 'info',
      width: 360,
      height: 150,
      resizable: false,
      minimizable: false,
      maximizable: false,
      owner: opts.owner,
      modal: !!opts.owner,
      taskbar: !opts.owner,
      className: 'msgbox-window',
      autoSize: 'both',
      body,
      onClosed: () => {
        resolve(chosen);
      },
      onResize: renderText,
    });
    btns[opts.defaultIndex ?? 0]?.focus();
  });
  return { result, close: () => void win.close(true) };
}
