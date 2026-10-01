import { config } from '../config';
import { fieldLabel, liveText, statusbar, toolButton, toolSeparator, toolbar } from '../core/controls';
import { h, keyLetter, uniqueId, wait } from '../core/dom';
import { getLang, t, whileConnected, type StringKey } from '../core/i18n';
import { icon, type IconName } from '../core/icons';
import { createMenubar } from '../core/menu';
import { messageBox, showMessage } from '../core/msgbox';
import { openApp, registerApp, wm } from '../core/system';
import type { Win } from '../core/window-manager';
import { isValidEmail, sendMail } from '../mail';

type FolderId = 'inbox' | 'outbox' | 'sent' | 'deleted' | 'drafts';

interface Message {
  id: string;
  from: () => string;
  to: () => string;
  subject: () => string;
  body: () => string;
  date: Date;
  read: boolean;
  /** Draft data so the message can be reopened for editing. */
  draft?: Draft;
}

interface Draft {
  email: string;
  name: string;
  subject: string;
  body: string;
}

const FOLDERS: { id: FolderId; label: StringKey; icon: IconName }[] = [
  { id: 'inbox', label: 'oe.inbox', icon: 'inbox' },
  { id: 'outbox', label: 'oe.outbox', icon: 'outbox' },
  { id: 'sent', label: 'oe.sent', icon: 'sent' },
  { id: 'deleted', label: 'oe.deleted', icon: 'trash' },
  { id: 'drafts', label: 'oe.drafts', icon: 'drafts' },
];

/** Mailbox state for this visit. */
const mailbox: Record<FolderId, Message[]> = {
  inbox: [
    {
      id: 'welcome',
      from: () => config.ownerName,
      to: () => (getLang() === 'cs' ? 'Návštěvník' : 'Visitor'),
      subject: () => t('oe.welcomeSubject'),
      body: () => t('oe.welcomeBody'),
      date: new Date(),
      read: false,
    },
  ],
  outbox: [],
  sent: [],
  deleted: [],
  drafts: [],
};

const listeners = new Set<() => void>();
const mailboxChanged = () => listeners.forEach((fn) => fn());

function formatDate(date: Date): string {
  return date.toLocaleString(getLang() === 'cs' ? 'cs-CZ' : 'en-US', {
    day: 'numeric',
    month: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Main window
// ---------------------------------------------------------------------------

function openOutlook(): void {
  const existing = wm().get('outlook');
  if (existing) {
    wm().open(existing.opts); // restores if minimized, otherwise focuses
    return;
  }
  let folder: FolderId = 'inbox';
  let current: Message | null = null;

  const tree = h('ul', { class: 'oe-tree', role: 'tree' });
  const listBody = h('tbody');
  const list = h(
    'div',
    { class: 'oe-list sunken-panel scroll' },
    h(
      'table',
      { class: 'listview' },
      h('colgroup', null, h('col', { style: 'width: 30%' }), h('col', { style: 'width: 45%' }), h('col', { style: 'width: 25%' })),
      h('thead', null, h('tr', null, h('th', { class: 'col-from' }), h('th', { class: 'col-subject' }), h('th', { class: 'col-date' }))),
      listBody,
    ),
  );
  const previewHead = h('div', { class: 'oe-preview-head' });
  const previewBody = h('div', { class: 'oe-preview-body scroll' });
  const preview = h('div', { class: 'oe-preview sunken-panel' }, previewHead, previewBody);
  const folderTitle = h('div', { class: 'oe-folder-title' });
  // On narrow screens the folder tree is hidden; this drop-down replaces it.
  const folderSelect = h('select', { class: 'oe-folder-select', 'aria-label': 'Folder' });
  folderSelect.addEventListener('change', () => selectFolder(folderSelect.value as FolderId));
  const statusText = h('span');

  const renderTree = () => {
    tree.replaceChildren(
      h(
        'li',
        { class: 'oe-tree-root', role: 'treeitem', 'aria-expanded': 'true' },
        h('span', { class: 'oe-tree-label' }, icon('oeRoot', 16), 'Outlook Express'),
        h(
          'ul',
          { role: 'group' },
          ...FOLDERS.map((f) => {
            const unread = mailbox[f.id].filter((m) => !m.read).length;
            const label = h(
              'span',
              { class: `oe-tree-label${folder === f.id ? ' selected' : ''}${unread ? ' unread' : ''}`, tabindex: folder === f.id ? '0' : '-1', 'data-folder': f.id },
              icon(f.icon, 16),
              h('span', null, t(f.label) + (unread ? ` (${unread})` : '')),
            );
            label.addEventListener('click', () => selectFolder(f.id));
            label.addEventListener('keydown', (e) => {
              const i = FOLDERS.findIndex((x) => x.id === folder);
              if (e.key === 'ArrowDown' && i < FOLDERS.length - 1) selectFolder(FOLDERS[i + 1].id, true);
              if (e.key === 'ArrowUp' && i > 0) selectFolder(FOLDERS[i - 1].id, true);
            });
            return h('li', { role: 'treeitem', 'aria-selected': String(folder === f.id) }, label);
          }),
        ),
      ),
    );
  };

  const renderList = () => {
    const outgoing = folder === 'sent' || folder === 'outbox' || folder === 'drafts';
    const [fromTh, subjectTh, dateTh] = list.querySelectorAll('th');
    fromTh.textContent = t(outgoing ? 'oe.colTo' : 'oe.colFrom');
    subjectTh.textContent = t('oe.colSubject');
    dateTh.textContent = t(outgoing ? 'oe.colSent' : 'oe.colReceived');
    listBody.replaceChildren();
    const messages = mailbox[folder];
    if (!messages.length) {
      listBody.append(h('tr', { class: 'empty' }, h('td', { colspan: '3' }, t('oe.noItems'))));
    }
    for (const m of messages) {
      const row = h(
        'tr',
        { class: `${m.read ? '' : 'unread'}${current === m ? ' selected' : ''}`, tabindex: '0', 'data-message': m.id },
        h('td', null, icon(m.read ? 'mailRead' : 'mail', 16), outgoing ? m.to() : m.from()),
        h('td', null, m.subject()),
        h('td', null, formatDate(m.date)),
      );
      row.addEventListener('click', () => selectMessage(m));
      row.addEventListener('dblclick', () => {
        if (m.draft) openCompose(m.draft, m);
      });
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && m.draft) openCompose(m.draft, m);
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          const i = messages.indexOf(m) + (e.key === 'ArrowDown' ? 1 : -1);
          if (messages[i]) {
            selectMessage(messages[i]);
            listBody.querySelector<HTMLElement>(`[data-message="${messages[i].id}"]`)?.focus();
          }
        }
      });
      listBody.append(row);
    }
    const info = FOLDERS.find((f) => f.id === folder)!;
    folderSelect.replaceChildren(
      ...FOLDERS.map((f) => {
        const unread = mailbox[f.id].filter((m) => !m.read).length;
        return h('option', { value: f.id, selected: f.id === folder }, t(f.label) + (unread ? ` (${unread})` : ''));
      }),
    );
    folderTitle.replaceChildren(icon(info.icon, 16), h('span', { class: 'oe-folder-name' }, t(info.label)), folderSelect);
    const unread = messages.filter((m) => !m.read).length;
    statusText.textContent = t('oe.messages', { n: messages.length, unread });
  };

  const renderPreview = () => {
    if (!current) {
      previewHead.replaceChildren();
      previewBody.replaceChildren(h('p', { class: 'oe-preview-empty' }, t('oe.noMessage')));
      return;
    }
    const m = current;
    previewHead.replaceChildren(
      h('div', null, h('b', null, `${t('oe.colFrom')}: `), m.from()),
      h('div', null, h('b', null, `${t('oe.colTo')}: `), m.to()),
      h('div', null, h('b', null, `${t('oe.colSubject')}: `), m.subject()),
    );
    const body = h('div', { class: 'oe-message-text' }, m.body());
    if (m.id === 'welcome') {
      const btn = h('button', { class: 'btn oe-inline-compose', type: 'button' }, icon('mail', 16), t('oe.compose'));
      btn.addEventListener('click', () => openCompose());
      previewBody.replaceChildren(body, h('p', null, btn));
    } else previewBody.replaceChildren(body);
  };

  const renderAll = () => {
    if (current && !mailbox[folder].includes(current)) current = null;
    renderTree();
    renderList();
    renderPreview();
    updateToolbar();
  };

  function selectFolder(id: FolderId, focus = false) {
    folder = id;
    current = null;
    renderAll();
    if (focus) tree.querySelector<HTMLElement>(`[data-folder="${id}"]`)?.focus();
  }

  function selectMessage(m: Message) {
    current = m;
    if (!m.read) {
      m.read = true;
      mailboxChanged();
    } else renderAll();
    // The list was re-rendered; keep keyboard focus on the selected row so Delete works.
    if (win.el.contains(document.activeElement) || document.activeElement === document.body) {
      listBody.querySelector<HTMLElement>(`[data-message="${m.id}"]`)?.focus({ preventScroll: true });
    }
  }

  function deleteCurrent() {
    if (!current) return;
    const m = current;
    mailbox[folder] = mailbox[folder].filter((x) => x !== m);
    if (folder !== 'deleted') mailbox.deleted.push(m);
    current = null;
    mailboxChanged();
  }

  async function sendReceive() {
    const progress = showMessage({ title: () => t('oe.sendReceiveTitle'), text: () => t('oe.checking'), icon: 'info', buttons: [], owner: win });
    await wait(900);
    progress.close();
    await progress.result;
    await messageBox({ title: () => t('oe.sendReceiveTitle'), text: () => t('oe.noNew'), icon: 'info', owner: win });
  }

  const composeBtn = toolButton('compose', 'oe.compose', () => openCompose(), { id: 'oe-compose', primary: true });
  const replyBtn = toolButton('reply', 'oe.reply', () => openCompose({ email: '', name: '', subject: `Re: ${current?.subject() ?? ''}`, body: '' }), { id: 'oe-reply' });
  const replyAllBtn = toolButton('replyAll', 'oe.replyAll', () => undefined, { disabled: true });
  const forwardBtn = toolButton('forwardMail', 'oe.forward', () => undefined, { disabled: true });
  const sendRecvBtn = toolButton('sendRecv', 'oe.sendReceive', () => void sendReceive(), { id: 'oe-sendrecv' });
  const deleteBtn = toolButton('delete', 'oe.delete', deleteCurrent, { id: 'oe-delete' });
  const addressBtn = toolButton('addressBook', 'oe.addressBook', () => undefined, { disabled: true });

  function updateToolbar() {
    replyBtn.disabled = !current || folder !== 'inbox';
    deleteBtn.disabled = !current;
  }

  const menubar = createMenubar([
    {
      label: () => t('menu.file'),
      items: () => [{ label: t('menu.close'), action: () => void win.close() }],
    },
    {
      label: () => t('menu.edit'),
      items: () => [{ label: t('oe.delete'), disabled: !current, shortcut: 'Del', action: deleteCurrent }],
    },
    {
      label: () => t('menu.view'),
      items: () => FOLDERS.map((f) => ({ label: t(f.label), radio: true, checked: folder === f.id, action: () => selectFolder(f.id) })),
    },
    {
      label: () => t('menu.compose'),
      items: () => [{ label: t('oe.compose'), shortcut: 'Ctrl+N', action: () => openCompose() }],
    },
    {
      label: () => t('menu.help'),
      items: () => [
        { label: t('menu.helpTopics'), action: () => openApp('help') },
        { separator: true },
        { label: t('menu.about'), action: () => openApp('about') },
      ],
    },
  ]);

  const body = h(
    'div',
    { class: 'oe-main' },
    h('div', { class: 'oe-folders' }, liveText(h('div', { class: 'oe-pane-title' }), 'oe.folders'), h('div', { class: 'oe-tree-wrap sunken-panel scroll' }, tree)),
    h('div', { class: 'oe-right' }, folderTitle, list, preview),
  );

  const win = wm().open({
    key: 'outlook',
    title: () => t('oe.title'),
    icon: 'mail',
    width: 620,
    height: 440,
    minWidth: 300,
    minHeight: 250,
    className: 'oe-window',
    menubar,
    toolbar: toolbar(composeBtn, toolSeparator(), replyBtn, replyAllBtn, forwardBtn, toolSeparator(), sendRecvBtn, deleteBtn, toolSeparator(), addressBtn),
    body,
    statusbar: statusbar(h('div', null, statusText)),
    onClosed: () => {
      listeners.delete(renderAll);
    },
  });
  win.el.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' && !(e.target as Element).closest('input, textarea')) deleteCurrent();
    if (e.key.toLowerCase() === 'n' && e.ctrlKey) {
      e.preventDefault();
      openCompose();
    }
  });
  listeners.add(renderAll);
  whileConnected(body, renderAll);
  // Open the welcome message straight away so first-time visitors know what to do.
  if (mailbox.inbox[0]) selectMessage(mailbox.inbox[0]);
}

// ---------------------------------------------------------------------------
// New Message window
// ---------------------------------------------------------------------------

function openCompose(initial?: Draft, fromDraft?: Message): void {
  const key = uniqueId('compose');
  const to = h('input', { type: 'text', readonly: true, value: config.ownerName, class: 'oe-to', tabindex: '-1' });
  const from = h('input', { type: 'email', class: 'oe-from', autocomplete: 'email', required: true, 'data-i18n-placeholder': 'compose.fromPlaceholder', placeholder: t('compose.fromPlaceholder'), value: initial?.email ?? '' });
  const name = h('input', { type: 'text', class: 'oe-name', autocomplete: 'name', 'data-i18n-placeholder': 'compose.namePlaceholder', placeholder: t('compose.namePlaceholder'), value: initial?.name ?? '' });
  const subject = h('input', { type: 'text', class: 'oe-subject', value: initial?.subject ?? '' });
  const message = h('textarea', { class: 'oe-body scroll', 'data-i18n-placeholder': 'compose.bodyPlaceholder', placeholder: t('compose.bodyPlaceholder'), spellcheck: 'true' });
  message.value = initial?.body ?? '';
  // Honeypot for bots – hidden from people and assistive tech.
  const trap = h('input', { type: 'checkbox', class: 'sr-only', tabindex: '-1', 'aria-hidden': 'true', name: 'botcheck' });

  const row = (label: StringKey, input: HTMLElement) => h('div', { class: 'oe-field' }, fieldLabel(label, input), input);

  const header = h(
    'div',
    { class: 'oe-header' },
    row('compose.to', to),
    row('compose.from', from),
    row('compose.name', name),
    row('compose.subject', subject),
  );

  let sending = false;
  let sent = false;
  const dirty = () => !!(from.value.trim() || subject.value.trim() || message.value.trim()) && !sent;

  async function send() {
    if (sending) return;
    if (trap.checked) return;
    if (!isValidEmail(from.value)) {
      await messageBox({ title: () => t('compose.title'), text: () => t('compose.errEmail'), icon: 'warning', owner: win });
      from.focus();
      return;
    }
    if (!message.value.trim()) {
      await messageBox({ title: () => t('compose.title'), text: () => t('compose.errBody'), icon: 'warning', owner: win });
      message.focus();
      return;
    }
    sending = true;
    win.el.classList.add('sending');
    sendBtn.disabled = true;
    statusText.textContent = t('compose.sending');
    const draft: Draft = { email: from.value.trim(), name: name.value.trim(), subject: subject.value.trim(), body: message.value };
    const [result] = await Promise.all([sendMail({ email: draft.email, name: draft.name, subject: draft.subject || t('compose.noSubject'), message: draft.body }), wait(700)]);
    sending = false;
    win.el.classList.remove('sending');
    sendBtn.disabled = false;
    statusText.textContent = '';
    if (result.ok) {
      sent = true;
      const subj = draft.subject;
      mailbox.sent.unshift({
        id: uniqueId('msg'),
        from: () => draft.name || draft.email,
        to: () => config.ownerName,
        subject: () => subj || t('compose.noSubject'),
        body: () => draft.body,
        date: new Date(),
        read: true,
      });
      if (fromDraft) mailbox.drafts = mailbox.drafts.filter((m) => m !== fromDraft);
      mailboxChanged();
      await messageBox({ title: () => t('oe.title'), text: () => t('compose.sent'), icon: 'info', owner: win });
      void win.close(true);
      return;
    }
    const text =
      result.reason === 'config'
        ? () => t('compose.errNotConfigured')
        : result.reason === 'network'
          ? () => t('compose.errNetwork')
          : () => t('compose.errSend', { error: result.message });
    await messageBox({ title: () => t('oe.title'), text, icon: 'error', owner: win });
  }

  const exec = (command: 'cut' | 'copy' | 'undo') => () => {
    document.execCommand(command);
  };
  const paste = async () => {
    const target = document.activeElement;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) || target.readOnly) return;
    try {
      const text = await navigator.clipboard.readText();
      target.setRangeText(text, target.selectionStart ?? 0, target.selectionEnd ?? 0, 'end');
    } catch {
      /* clipboard access denied – Ctrl+V still works */
    }
  };

  // Keep the focused field when toolbar buttons are clicked.
  const keepFocus = (btn: HTMLElement) => {
    btn.addEventListener('pointerdown', (e) => e.preventDefault());
    return btn;
  };
  const sendBtn = toolButton('send', 'compose.send', () => void send(), { id: 'compose-send', primary: true });
  const tools = toolbar(
    sendBtn,
    toolSeparator(),
    keepFocus(toolButton('cut', 'compose.cut', exec('cut'), { compact: true })),
    keepFocus(toolButton('copy', 'compose.copy', exec('copy'), { compact: true })),
    keepFocus(toolButton('paste', 'compose.paste', () => void paste(), { compact: true })),
    keepFocus(toolButton('undo', 'compose.undo', exec('undo'), { compact: true })),
    toolSeparator(),
    toolButton('check', 'compose.check', () => undefined, { disabled: true, compact: true }),
    toolButton('spelling', 'compose.spelling', () => undefined, { disabled: true, compact: true }),
    toolButton('attach', 'compose.attach', () => undefined, { disabled: true, compact: true }),
  );

  const statusText = h('span');
  const menubar = createMenubar([
    {
      label: () => t('menu.file'),
      items: () => [
        { label: t('menu.send'), shortcut: 'Alt+S', action: () => void send() },
        { separator: true },
        { label: t('menu.close'), action: () => void win.close() },
      ],
    },
    {
      label: () => t('menu.edit'),
      items: () => [
        { label: t('menu.undo'), shortcut: 'Ctrl+Z', action: exec('undo') },
        { separator: true },
        { label: t('menu.cut'), shortcut: 'Ctrl+X', action: exec('cut') },
        { label: t('menu.copy'), shortcut: 'Ctrl+C', action: exec('copy') },
        { label: t('menu.paste'), shortcut: 'Ctrl+V', action: () => void paste() },
        { separator: true },
        { label: t('menu.selectAll'), shortcut: 'Ctrl+A', action: () => message.select() },
      ],
    },
    { label: () => t('menu.view'), items: () => [{ label: t('menu.toolbar'), checked: !tools.hidden, action: () => (tools.hidden = !tools.hidden) }] },
    { label: () => t('menu.insert'), items: () => [{ label: t('compose.attach'), disabled: true }] },
    { label: () => t('menu.format'), items: () => [{ label: 'Plain Text', radio: true, checked: true }] },
    { label: () => t('menu.tools'), items: () => [{ label: t('compose.spelling'), disabled: true }] },
    { label: () => t('menu.help'), items: () => [{ label: t('menu.about'), action: () => openApp('about') }] },
  ]);

  const body = h('form', { class: 'oe-compose', novalidate: true }, header, message, trap);
  body.addEventListener('submit', (e) => {
    e.preventDefault();
    void send();
  });

  const win: Win = wm().open({
    key,
    title: () => (subject.value.trim() ? t('compose.titleSubject', { subject: subject.value.trim() }) : t('compose.title')),
    icon: 'mail',
    width: 520,
    height: 420,
    minWidth: 300,
    minHeight: 260,
    className: 'compose-window',
    menubar,
    toolbar: tools,
    body,
    statusbar: statusbar(h('div', null, statusText)),
    onClose: async () => {
      if (sending) return false;
      if (!dirty()) return true;
      const answer = await messageBox({
        title: () => t('compose.title'),
        text: () => t('compose.saveChanges'),
        icon: 'question',
        buttons: ['yes', 'no', 'cancel'],
        owner: win,
      });
      if (answer === 'cancel') return false;
      if (answer === 'yes') {
        const draft: Draft = { email: from.value.trim(), name: name.value.trim(), subject: subject.value.trim(), body: message.value };
        const subj = draft.subject;
        const saved: Message = {
          id: uniqueId('msg'),
          from: () => draft.name || draft.email || config.ownerName,
          to: () => config.ownerName,
          subject: () => subj || t('compose.noSubject'),
          body: () => draft.body,
          date: new Date(),
          read: true,
          draft,
        };
        if (fromDraft) mailbox.drafts = mailbox.drafts.filter((m) => m !== fromDraft);
        mailbox.drafts.unshift(saved);
        mailboxChanged();
      }
      return true;
    },
  });
  subject.addEventListener('input', () => win.refreshTitle());
  win.el.addEventListener('keydown', (e) => {
    if ((e.altKey && keyLetter(e) === 's') || (e.ctrlKey && e.key === 'Enter')) {
      e.preventDefault();
      void send();
    }
  });
  (initial?.email ? message : from).focus({ preventScroll: true });
}

export function registerOutlook(): void {
  registerApp('outlook', openOutlook);
  registerApp('compose', () => openCompose());
}
