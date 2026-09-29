import { describe, expect, it } from 'vitest';
import { namePattern, normalize, search, type SearchEntry } from '../../src/search';

const entries: SearchEntry[] = [
  { id: 'a', name: 'Tento počítač', folder: 'C:\\', type: 'App', content: 'projekty' },
  { id: 'b', name: 'bio.htm', folder: 'C:\\', type: 'Page', content: 'Developer from Czech Republic' },
  { id: 'c', name: 'Weather.exe', folder: 'C:\\', type: 'App', content: 'forecast demo' },
];

describe('normalize', () => {
  it('strips diacritics and lower-cases', () => {
    expect(normalize('Počítač ŽLUŤOUČKÝ')).toBe('pocitac zlutoucky');
  });
});

describe('namePattern', () => {
  it('matches everything when empty', () => {
    expect(namePattern('')('anything')).toBe(true);
  });
  it('matches substrings without wildcards', () => {
    expect(namePattern('bio')('bio.htm')).toBe(true);
    expect(namePattern('pocitac')('Tento počítač')).toBe(true);
  });
  it('supports * and ? wildcards anchored to the whole name', () => {
    expect(namePattern('*.htm')('bio.htm')).toBe(true);
    expect(namePattern('*.htm')('bio.html')).toBe(false);
    expect(namePattern('b?o.*')('bio.htm')).toBe(true);
  });
  it('accepts several patterns', () => {
    const m = namePattern('*.exe; *.htm');
    expect(m('Weather.exe')).toBe(true);
    expect(m('bio.htm')).toBe(true);
    expect(m('Tento počítač')).toBe(false);
  });
  it('escapes regex characters', () => {
    expect(namePattern('(')('a(b')).toBe(true);
  });
});

describe('search', () => {
  it('filters by name and containing text', () => {
    expect(search(entries, { named: '', containing: '' }).map((e) => e.id)).toEqual(['a', 'b', 'c']);
    expect(search(entries, { named: '*.exe', containing: '' }).map((e) => e.id)).toEqual(['c']);
    expect(search(entries, { named: '', containing: 'czech developer' }).map((e) => e.id)).toEqual(['b']);
    expect(search(entries, { named: 'bio', containing: 'forecast' })).toEqual([]);
  });
});
