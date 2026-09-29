import { config } from '../config';
import { button, checkbox, liveText } from '../core/controls';
import { h, isCoarsePointer } from '../core/dom';
import { t, whileConnected, type StringKey } from '../core/i18n';
import { load, save } from '../core/storage';
import { openApp, registerApp, wm } from '../core/system';

const TIPS: StringKey[] = ['welcome.tip1', 'welcome.tip2', 'welcome.tip3', 'welcome.tip4', 'welcome.tip5', 'welcome.tip6', 'welcome.tip7'];

export function welcomeEnabled(): boolean {
  if (new URLSearchParams(location.search).get('welcome') === '0') return false;
  return load('welcome') !== '0';
}

function openWelcome(): void {
  let tip = 0;
  const tipKey = (): StringKey => (TIPS[tip] === 'welcome.tip1' && isCoarsePointer() ? 'welcome.tip1Touch' : TIPS[tip]);
  const tipText = h('p', { class: 'welcome-tip-text' });
  const renderTip = () => (tipText.textContent = t(tipKey()));
  renderTip();
  whileConnected(tipText, renderTip);

  const close = () => void win.close();
  const body = h(
    'div',
    { class: 'welcome' },
    h(
      'div',
      { class: 'welcome-main' },
      h(
        'h1',
        { class: 'welcome-heading' },
        liveText(h('span', { class: 'welcome-to' }), 'welcome.heading'),
        ' ',
        h('b', null, config.brand.bold),
        h('span', { class: 'light' }, config.brand.light),
      ),
      h(
        'div',
        { class: 'welcome-tip sunken-panel' },
        h('div', { class: 'welcome-tip-head' }, h('span', { class: 'welcome-bulb', 'aria-hidden': 'true' }), liveText(h('b'), 'welcome.didYouKnow')),
        tipText,
      ),
    ),
    h(
      'div',
      { class: 'welcome-buttons' },
      button('welcome.bio', () => (close(), openApp('ie')), { id: 'welcome-bio' }),
      button('welcome.contact', () => (close(), openApp('compose')), { id: 'welcome-contact' }),
      h('span', { class: 'welcome-spacer' }),
      button(
        'welcome.nextTip',
        () => {
          tip = (tip + 1) % TIPS.length;
          renderTip();
        },
        { id: 'welcome-next' },
      ),
      button('btn.close', close, { isDefault: true, id: 'welcome-close' }),
    ),
    h(
      'div',
      { class: 'welcome-footer' },
      checkbox('welcome.showNext', load('welcome') !== '0', (on) => save('welcome', on ? '1' : '0')),
    ),
  );

  const win = wm().open({
    key: 'welcome',
    title: () => t('welcome.title'),
    icon: 'compass',
    width: 520,
    height: 300,
    autoSize: 'height',
    resizable: false,
    maximizable: false,
    className: 'welcome-window',
    body,
  });
  body.querySelector<HTMLButtonElement>('[data-id="welcome-close"]')?.focus();
}

export function registerWelcome(): void {
  registerApp('welcome', openWelcome);
}
