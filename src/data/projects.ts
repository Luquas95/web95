import type { Localized } from '../core/i18n';
import type { IconName } from '../core/icons';

export interface Project {
  /** Unique, URL-safe id. */
  id: string;
  /** File name shown in My Computer, e.g. "Weather.exe". */
  name: Localized;
  description: Localized;
  /** Where the demo lives. Relative paths (e.g. "demos/weather/") are served from /public. */
  url: string;
  /** Defaults to "app". */
  icon?: IconName;
  /**
   * "window" (default) opens the demo inside an Internet Explorer window;
   * "tab" opens it in a new browser tab (for sites that refuse to be framed).
   */
  openIn?: 'window' | 'tab';
}

/**
 * Projects shown in My Computer. Add an entry here and it appears in the
 * folder, in Start > Documents and in Find – no other code changes needed.
 *
 * Example:
 * {
 *   id: 'weather',
 *   name: 'Weather.exe',
 *   description: { en: 'A tiny weather app', cs: 'Malá aplikace na počasí' },
 *   url: 'https://luquas95.github.io/weather/',
 * },
 */
export const projects: Project[] = [];
