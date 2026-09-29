import { button, liveText } from '../core/controls';
import { h, isCoarsePointer } from '../core/dom';
import { t, type StringKey } from '../core/i18n';
import { icon } from '../core/icons';
import { messageBox } from '../core/msgbox';
import { registerApp, wm } from '../core/system';

const TOPICS: { title: StringKey; body: StringKey }[] = [
  { title: 'help.t1', body: 'help.b1' },
  { title: 'help.t2', body: 'help.b2' },
  { title: 'help.t3', body: 'help.b3' },
  { title: 'help.t4', body: 'help.b4' },
  { title: 'help.t5', body: 'help.b5' },
];

function openHelp(): void {
  let selected = 0;

  const list = h('ul', { class: 'help-list sunken-panel scroll', role: 'listbox', tabindex: '0' });
  const topicView = h('div', { class: 'help-topic sunken-panel scroll' });
  const topicsBtn = button('help.topics', () => showTopics(), { id: 'help-topics' });
  const display = button('help.display', () => showTopic(selected), { isDefault: true, id: 'help-display' });
  const intro = liveText(h('p', { class: 'help-intro' }), 'help.intro');
  const contents = h('div', { class: 'help-contents' }, intro, list, h('div', { class: 'help-buttons' }, display));

  const renderList = () => {
    list.replaceChildren(
      ...TOPICS.map((topic, i) => {
        const li = h('li', { class: `help-item${i === selected ? ' selected' : ''}`, role: 'option', 'aria-selected': String(i === selected) }, icon('help', 16), liveText(h('span'), topic.title));
        li.addEventListener('click', (e) => {
          selected = i;
          renderList();
          if (isCoarsePointer() && e.detail > 0) showTopic(i);
        });
        li.addEventListener('dblclick', () => showTopic(i));
        return li;
      }),
    );
  };
  list.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') selected = Math.min(TOPICS.length - 1, selected + 1);
    else if (e.key === 'ArrowUp') selected = Math.max(0, selected - 1);
    else if (e.key === 'Enter') return showTopic(selected);
    else return;
    e.preventDefault();
    renderList();
  });

  function showTopic(i: number) {
    topicView.replaceChildren(liveText(h('h2'), TOPICS[i].title), liveText(h('p'), TOPICS[i].body));
    contents.hidden = true;
    topicView.hidden = false;
    topicsBtn.disabled = false;
  }

  function showTopics() {
    contents.hidden = false;
    topicView.hidden = true;
    topicsBtn.disabled = true;
    list.focus();
  }

  const body = h('div', { class: 'help' }, h('div', { class: 'help-nav' }, topicsBtn), contents, topicView);
  wm().open({
    key: 'help',
    title: () => t('help.title'),
    icon: 'help',
    width: 400,
    height: 340,
    minWidth: 260,
    minHeight: 220,
    className: 'help-window',
    body,
  });
  renderList();
  showTopics();
}

function openAbout(): void {
  void messageBox({ title: () => t('about.title'), text: () => t('about.text'), icon: 'info' });
}

export function registerHelp(): void {
  registerApp('help', openHelp);
  registerApp('about', openAbout);
}
