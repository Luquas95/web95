import { beforeEach, describe, expect, it } from 'vitest';
import { cs, en } from '../../src/core/strings';
import { getLang, initLang, onLangChange, setLang, t } from '../../src/core/i18n';

describe('translations', () => {
  it('Czech and English have the same keys', () => {
    expect(Object.keys(cs).sort()).toEqual(Object.keys(en).sort());
  });

  it('no translation is empty', () => {
    for (const [key, value] of [...Object.entries(en), ...Object.entries(cs)]) {
      expect(value.trim(), key).not.toBe('');
    }
  });

  it('placeholders match between languages', () => {
    const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(vars(cs[key]), key).toEqual(vars(en[key]));
    }
  });
});

describe('t()', () => {
  beforeEach(() => initLang('en'));

  it('substitutes variables and built-ins', () => {
    expect(t('mycomp.objects', { n: 3 })).toBe('3 object(s)');
    expect(t('about.title')).toBe('About Lukas95');
  });

  it('switches language and notifies listeners', () => {
    const seen: string[] = [];
    const off = onLangChange((lang) => seen.push(lang));
    setLang('cs');
    expect(getLang()).toBe('cs');
    expect(t('desktop.myComputer')).toBe('Tento počítač');
    off();
    setLang('en');
    expect(seen).toEqual(['cs']);
  });
});
