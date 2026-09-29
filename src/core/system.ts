import { WindowManager } from './window-manager';

export type AppId =
  | 'my-computer'
  | 'outlook'
  | 'compose'
  | 'ie'
  | 'find'
  | 'help'
  | 'about'
  | 'welcome'
  | 'shutdown'
  | 'dos'
  | 'github'
  | 'project';

type Launcher = (arg?: unknown) => void;

const registry = new Map<AppId, Launcher>();
let manager: WindowManager | null = null;

export function initSystem(container: HTMLElement): WindowManager {
  manager = new WindowManager(container);
  return manager;
}

export function wm(): WindowManager {
  if (!manager) throw new Error('System not initialised');
  return manager;
}

export function registerApp(id: AppId, launch: Launcher): void {
  registry.set(id, launch);
}

/** Launch an application, showing the hourglass cursor briefly like Windows did. */
export function openApp(id: AppId, arg?: unknown): void {
  const launch = registry.get(id);
  if (!launch) throw new Error(`Unknown app: ${id}`);
  busy();
  launch(arg);
}

let busyTimer: number | undefined;

export function busy(ms = 450): void {
  document.body.classList.add('busy');
  clearTimeout(busyTimer);
  busyTimer = window.setTimeout(() => document.body.classList.remove('busy'), ms);
}

/** Open an external URL in a new browser tab. */
export function openExternal(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}
