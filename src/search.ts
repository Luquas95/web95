/** Searchable "files" for Start > Find. Pure logic – no DOM – so it is easy to test. */

export interface SearchEntry {
  id: string;
  name: string;
  folder: string;
  type: string;
  /** Extra text matched by "Containing text". */
  content: string;
}

export interface SearchQuery {
  named: string;
  containing: string;
}

/** Lower-case and strip diacritics so "pocitac" finds "Počítač". */
export function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Turn a Windows-style file pattern into a matcher.
 * `*` and `?` are wildcards; a pattern without wildcards matches anywhere in the name.
 * Several space- or semicolon-separated patterns match if any of them does.
 */
export function namePattern(pattern: string): (name: string) => boolean {
  const parts = normalize(pattern)
    .split(/[;,\s]+/)
    .filter(Boolean);
  if (!parts.length) return () => true;
  const regexes = parts.map((part) => {
    const escaped = part.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    if (!/[*?]/.test(part)) return new RegExp(escaped);
    return new RegExp(`^${escaped.replace(/\*/g, '.*').replace(/\?/g, '.')}$`);
  });
  return (name) => {
    const n = normalize(name);
    return regexes.some((re) => re.test(n));
  };
}

export function search(entries: SearchEntry[], query: SearchQuery): SearchEntry[] {
  const matchName = namePattern(query.named);
  const words = normalize(query.containing).split(/\s+/).filter(Boolean);
  return entries.filter((entry) => {
    if (!matchName(entry.name)) return false;
    if (!words.length) return true;
    const haystack = normalize(`${entry.name} ${entry.content}`);
    return words.every((w) => haystack.includes(w));
  });
}
