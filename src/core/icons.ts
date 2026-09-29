/**
 * Original pixel-style icons drawn in SVG with the 16-colour Windows 95 palette.
 * Large icons use a 32×32 grid (rendered at 32px or 16px), toolbar icons a 20×20 grid.
 */

const K = '#000000'; // black
const G = '#808080'; // gray
const S = '#c0c0c0'; // silver
const W = '#ffffff'; // white
const N = '#000080'; // navy
const B = '#0000ff'; // blue
const T = '#008080'; // teal
const C = '#00ffff'; // cyan
const R = '#ff0000'; // red
const M = '#800000'; // maroon
const Y = '#ffff00'; // yellow
const O = '#808000'; // olive
const GR = '#008000'; // green
const L = '#00ff00'; // lime
const PY = '#ffff80'; // pale yellow (folder face)

const r = (x: number, y: number, w: number, h: number, fill: string) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;

const svg = (size: number, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">${body}</svg>`;

/** A raised silver box with a black outline – monitors, windows… */
const bevelBox = (x: number, y: number, w: number, h: number) =>
  r(x, y, w, h, K) +
  r(x + 1, y + 1, w - 2, h - 2, S) +
  r(x + 1, y + 1, w - 3, 1, W) +
  r(x + 1, y + 1, 1, h - 3, W) +
  r(x + 2, y + h - 2, w - 3, 1, G) +
  r(x + w - 2, y + 2, 1, h - 3, G);

const monitor = (screen: string, extra = '') =>
  bevelBox(3, 2, 26, 20) +
  r(6, 5, 20, 13, G) +
  r(7, 6, 19, 12, K) +
  r(7, 6, 18, 11, screen) +
  extra +
  r(22, 19, 2, 1, L) +
  r(12, 22, 8, 2, K) +
  r(13, 22, 6, 1, G) +
  bevelBox(2, 24, 28, 6) +
  Array.from({ length: 11 }, (_, i) => r(5 + i * 2, 26, 1, 1, G) + r(6 + i * 2, 27, 1, 1, G)).join('');

const envelope = (x: number, y: number, w: number, h: number) =>
  r(x, y, w, h, K) +
  r(x + 1, y + 1, w - 2, h - 2, W) +
  `<path d="M${x + 1} ${y + 1.5} L${x + w / 2} ${y + h * 0.6} L${x + w - 1} ${y + 1.5}" fill="none" stroke="${G}" stroke-width="1" shape-rendering="auto"/>` +
  r(x + 1, y + h - 2, w - 2, 1, S);

const folder = (face = PY) =>
  `<path d="M2.5 27.5 V9.5 L4.5 7.5 H11.5 L13.5 9.5 H28.5 V27.5 Z" fill="${Y}" stroke="${K}"/>` +
  `<path d="M3 27 V13 H28 V27 Z" fill="${face}"/>` +
  r(3, 12, 25, 1, W) +
  r(3, 26, 25, 1, O) +
  r(27, 13, 1, 14, O);

const page = (x: number, y: number, w: number, h: number) =>
  `<path d="M${x + 0.5} ${y + 0.5} H${x + w - 5.5} L${x + w - 0.5} ${y + 5.5} V${y + h - 0.5} H${x + 0.5} Z" fill="${W}" stroke="${K}"/>` +
  `<path d="M${x + w - 5.5} ${y + 0.5} V${y + 5.5} H${x + w - 0.5}" fill="${S}" stroke="${K}"/>`;

const appWindow = (x: number, y: number, w: number, h: number, body: string) =>
  r(x, y, w, h, K) + r(x + 1, y + 1, w - 2, h - 2, S) + r(x + 2, y + 2, w - 4, 3, N) + r(x + w - 5, y + 3, 2, 1, W) + r(x + 2, y + 6, w - 4, h - 8, body);

const globe = (cx: number, cy: number, rad: number) =>
  `<g shape-rendering="auto"><circle cx="${cx}" cy="${cy}" r="${rad}" fill="${B}" stroke="${N}" stroke-width="1"/>` +
  `<path d="M${cx - rad * 0.6} ${cy - rad * 0.55} q${rad * 0.35} ${-rad * 0.3} ${rad * 0.75} ${-rad * 0.15} q${rad * 0.1} ${rad * 0.4} ${-rad * 0.2} ${rad * 0.65} q${rad * 0.2} ${rad * 0.35} ${-rad * 0.05} ${rad * 0.75} q${-rad * 0.45} ${-rad * 0.2} ${-rad * 0.5} ${-rad * 1.25} Z" fill="${GR}"/>` +
  `<path d="M${cx + rad * 0.15} ${cy + rad * 0.05} q${rad * 0.45} ${-rad * 0.15} ${rad * 0.7} ${rad * 0.15} q${-rad * 0.05} ${rad * 0.45} ${-rad * 0.4} ${rad * 0.65} q${-rad * 0.3} ${-rad * 0.35} ${-rad * 0.3} ${-rad * 0.8} Z" fill="${GR}"/>` +
  `<circle cx="${cx - rad * 0.45}" cy="${cy - rad * 0.5}" r="${rad * 0.18}" fill="${C}" opacity="0.8"/></g>`;

const star = (cx: number, cy: number, s: number, fill = Y) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? s : s * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${K}" stroke-width="0.8" shape-rendering="auto"/>`;
};

const text = (x: number, y: number, size: number, fill: string, content: string, weight = 'bold') =>
  `<text x="${x}" y="${y}" font-family="Arial, Helvetica, sans-serif" font-weight="${weight}" font-size="${size}" fill="${fill}" text-anchor="middle" shape-rendering="auto">${content}</text>`;

const ICONS32 = {
  computer: monitor(T, r(8, 7, 3, 2, C)),
  shutdown: monitor(
    N,
    `<g shape-rendering="auto"><circle cx="16" cy="11.5" r="4" fill="${Y}"/><circle cx="17.8" cy="10.2" r="3.6" fill="${N}"/></g>` + r(10, 8, 1, 1, W) + r(22, 14, 1, 1, W),
  ),
  mail:
    `<path d="M5 9 Q16 -1 27 7" fill="none" stroke="${B}" stroke-width="2.5" shape-rendering="auto"/>` +
    `<polygon points="29,9 23,9 27,3" fill="${B}" shape-rendering="auto"/>` +
    envelope(3, 10, 26, 16) +
    `<path d="M27 28 Q16 33 5 27" fill="none" stroke="${C}" stroke-width="2.5" shape-rendering="auto"/>` +
    `<polygon points="3,25 9,25 5,31" fill="${C}" stroke="${T}" stroke-width="0.5" shape-rendering="auto"/>`,
  ie:
    globe(15, 16, 11) +
    `<ellipse cx="16" cy="16" rx="14.5" ry="5" fill="none" stroke="${Y}" stroke-width="2" transform="rotate(-25 16 16)" shape-rendering="auto"/>` +
    `<ellipse cx="16" cy="16" rx="14.5" ry="5" fill="none" stroke="${O}" stroke-width="0.6" transform="rotate(-25 16 16)" shape-rendering="auto"/>`,
  folder: folder(),
  folderOpen:
    `<path d="M2.5 27.5 V9.5 L4.5 7.5 H11.5 L13.5 9.5 H26.5 V13.5" fill="${Y}" stroke="${K}"/>` +
    `<path d="M2.5 27.5 L7.5 14.5 H30.5 L25.5 27.5 Z" fill="${PY}" stroke="${K}"/>`,
  programs: folder() + appWindow(12, 14, 17, 13, W),
  documents: folder() + page(15, 12, 13, 16) + r(17, 18, 7, 1, G) + r(17, 20, 7, 1, G) + r(17, 22, 5, 1, G),
  settings:
    folder() +
    `<g shape-rendering="auto" transform="translate(21 20)"><circle r="6" fill="${G}" stroke="${K}"/>` +
    Array.from({ length: 8 }, (_, i) => `<rect x="-1.5" y="-8" width="3" height="4" fill="${G}" stroke="${K}" stroke-width="0.6" transform="rotate(${i * 45})"/>`).join('') +
    `<circle r="2.5" fill="${S}" stroke="${K}"/></g>`,
  find:
    page(4, 2, 19, 26) +
    r(7, 10, 11, 1, G) +
    r(7, 13, 11, 1, G) +
    r(7, 16, 8, 1, G) +
    `<g shape-rendering="auto"><line x1="22" y1="22" x2="29" y2="29" stroke="${K}" stroke-width="4" stroke-linecap="round"/><line x1="22" y1="22" x2="28.5" y2="28.5" stroke="${O}" stroke-width="2" stroke-linecap="round"/>` +
    `<circle cx="18" cy="18" r="6" fill="${C}" fill-opacity="0.55" stroke="${K}" stroke-width="2"/><path d="M15 16 a3.5 3.5 0 0 1 3 -2.5" stroke="${W}" stroke-width="1.2" fill="none"/></g>`,
  help:
    r(6, 3, 21, 25, K) +
    r(7, 4, 19, 21, T) +
    r(7, 4, 3, 21, N) +
    r(8, 25, 18, 2, W) +
    r(8, 27, 18, 1, S) +
    text(18, 21, 16, Y, '?'),
  github: appWindow(2, 4, 28, 24, K) + r(6, 13, 2, 2, L) + r(8, 15, 2, 2, L) + r(6, 17, 2, 2, L) + r(12, 18, 6, 1, L),
  app: appWindow(2, 4, 28, 24, W) + r(6, 13, 12, 1, G) + r(6, 16, 18, 1, G) + r(6, 19, 15, 1, G),
  html: page(5, 2, 20, 27) + globe(19, 21, 7),
  dos: appWindow(2, 4, 28, 24, K) + text(15, 21, 8, S, 'C:\\&gt;', 'normal'),
  compass:
    `<g shape-rendering="auto" stroke="${K}" stroke-width="1">` +
    `<polygon points="16,1 20,12 16,16 12,12" fill="${R}"/>` +
    `<polygon points="31,16 20,20 16,16 20,12" fill="${GR}"/>` +
    `<polygon points="16,31 12,20 16,16 20,20" fill="${B}"/>` +
    `<polygon points="1,16 12,12 16,16 12,20" fill="${Y}"/>` +
    `<circle cx="16" cy="16" r="2" fill="${W}"/></g>`,
  info:
    `<g shape-rendering="auto"><path d="M16 2 C 7 2 2 7 2 14 C 2 20 6 24 11 25 L 9 31 L 17 25.5 C 25 25 30 20 30 14 C 30 7 25 2 16 2 Z" fill="${W}" stroke="${K}"/></g>` +
    r(14, 7, 4, 3, B) +
    r(14, 12, 4, 10, B) +
    r(12, 12, 2, 1, B) +
    r(12, 21, 8, 1, B),
  question:
    `<g shape-rendering="auto"><path d="M16 2 C 7 2 2 7 2 14 C 2 20 6 24 11 25 L 9 31 L 17 25.5 C 25 25 30 20 30 14 C 30 7 25 2 16 2 Z" fill="${W}" stroke="${K}"/></g>` +
    text(16, 21, 17, B, '?'),
  warning:
    `<polygon points="16,2 31,29 1,29" fill="${Y}" stroke="${K}" stroke-width="1.5" shape-rendering="auto"/>` +
    r(14, 11, 4, 11, K) +
    r(14, 24, 4, 3, K),
  error:
    `<circle cx="16" cy="16" r="14" fill="${R}" stroke="${M}" stroke-width="1.5" shape-rendering="auto"/>` +
    `<path d="M10 10 L22 22 M22 10 L10 22" stroke="${W}" stroke-width="3.5" shape-rendering="auto"/>`,
  mailRead: envelope(3, 8, 26, 17) + `<path d="M4 9 L16 3 L28 9" fill="${W}" stroke="${K}" shape-rendering="auto"/>`,
  inbox:
    r(3, 13, 26, 15, K) + r(4, 14, 24, 13, S) + r(4, 14, 24, 1, W) + r(9, 14, 14, 5, G) + envelope(8, 4, 16, 11),
  outbox: r(3, 13, 26, 15, K) + r(4, 14, 24, 13, S) + r(4, 14, 24, 1, W) + r(9, 14, 14, 5, G) + `<polygon points="16,2 23,10 19,10 19,16 13,16 13,10 9,10" fill="${GR}" stroke="${K}" shape-rendering="auto"/>`,
  sent: folder() + envelope(12, 15, 16, 11),
  trash:
    `<path d="M7.5 8.5 H24.5 L22.5 29.5 H9.5 Z" fill="${S}" stroke="${K}"/>` +
    r(5, 6, 22, 3, K) +
    r(6, 7, 20, 1, W) +
    r(12, 12, 1, 14, G) +
    r(16, 12, 1, 14, G) +
    r(20, 12, 1, 14, G),
  drafts: folder() + page(14, 12, 13, 16) + `<line x1="16" y1="26" x2="27" y2="15" stroke="${M}" stroke-width="2.5" shape-rendering="auto"/>`,
  oeRoot: globe(12, 17, 9) + envelope(15, 14, 15, 11),
} as const;

const ICONS20 = {
  back: `<polygon points="1.5,10 9.5,2.5 9.5,6.5 18.5,6.5 18.5,13.5 9.5,13.5 9.5,17.5" fill="${GR}" stroke="${K}" shape-rendering="auto"/>`,
  forward: `<polygon points="18.5,10 10.5,2.5 10.5,6.5 1.5,6.5 1.5,13.5 10.5,13.5 10.5,17.5" fill="${GR}" stroke="${K}" shape-rendering="auto"/>`,
  stop:
    `<polygon points="6,1.5 14,1.5 18.5,6 18.5,14 14,18.5 6,18.5 1.5,14 1.5,6" fill="${R}" stroke="${M}" shape-rendering="auto"/>` +
    `<path d="M6.5 6.5 L13.5 13.5 M13.5 6.5 L6.5 13.5" stroke="${W}" stroke-width="2.2" shape-rendering="auto"/>`,
  refresh:
    page(3, 1, 14, 18) +
    `<g shape-rendering="auto" fill="none" stroke="${GR}" stroke-width="2"><path d="M6 10 A4 4 0 0 1 13 7.5"/><path d="M14 10 A4 4 0 0 1 7 12.5"/></g>` +
    `<polygon points="14.5,5 14.5,9.5 10.5,8.5" fill="${GR}" shape-rendering="auto"/><polygon points="5.5,15 5.5,10.5 9.5,11.5" fill="${GR}" shape-rendering="auto"/>`,
  home:
    `<polygon points="10,1.5 19,10 1,10" fill="${R}" stroke="${K}" shape-rendering="auto"/>` +
    `<rect x="3.5" y="9.5" width="13" height="9" fill="${PY}" stroke="${K}"/>` +
    r(8, 13, 4, 6, M) +
    r(13, 3, 2, 4, K),
  search:
    globe(8, 8, 6.5) +
    `<g shape-rendering="auto"><line x1="15" y1="15" x2="19" y2="19" stroke="${K}" stroke-width="3" stroke-linecap="round"/><circle cx="12.5" cy="12.5" r="4" fill="${C}" fill-opacity="0.6" stroke="${K}" stroke-width="1.5"/></g>`,
  favorites:
    `<path d="M1.5 17.5 V5.5 L3 4 H8 L9.5 5.5 H18.5 V17.5 Z" fill="${Y}" stroke="${K}"/>` +
    star(12, 12, 6),
  print:
    r(4, 1, 12, 8, K) +
    r(5, 2, 10, 7, W) +
    r(1, 8, 18, 8, K) +
    r(2, 9, 16, 6, S) +
    r(2, 9, 16, 1, W) +
    r(15, 11, 2, 1, L) +
    r(4, 13, 12, 6, K) +
    r(5, 14, 10, 5, W),
  mail: envelope(1, 4, 18, 12),
  compose: envelope(1, 6, 15, 11) + star(15.5, 5, 4.5),
  reply: envelope(5, 6, 14, 10) + `<polygon points="0.5,11 5.5,6 5.5,9 10.5,9 10.5,13 5.5,13 5.5,16" fill="${B}" stroke="${K}" stroke-width="0.8" shape-rendering="auto"/>`,
  replyAll:
    envelope(6, 6, 13, 10) +
    `<polygon points="0.5,11 4.5,7 4.5,15" fill="${B}" stroke="${K}" stroke-width="0.8" shape-rendering="auto"/>` +
    `<polygon points="3.5,11 7.5,7 7.5,9.5 11.5,9.5 11.5,12.5 7.5,12.5 7.5,15" fill="${B}" stroke="${K}" stroke-width="0.8" shape-rendering="auto"/>`,
  forwardMail: envelope(1, 6, 14, 10) + `<polygon points="19.5,11 14.5,6 14.5,9 9.5,9 9.5,13 14.5,13 14.5,16" fill="${B}" stroke="${K}" stroke-width="0.8" shape-rendering="auto"/>`,
  sendRecv:
    envelope(1, 8, 13, 9) +
    `<polygon points="16,1 19.5,5 17.5,5 17.5,10 14.5,10 14.5,5 12.5,5" fill="${GR}" stroke="${K}" stroke-width="0.8" shape-rendering="auto"/>` +
    `<polygon points="16,19 19.5,15 17.5,15 17.5,11 14.5,11 14.5,15 12.5,15" fill="${B}" stroke="${K}" stroke-width="0.8" shape-rendering="auto"/>`,
  delete: `<path d="M3 3 L17 17 M17 3 L3 17" stroke="${K}" stroke-width="4" shape-rendering="auto"/><path d="M3 3 L17 17 M17 3 L3 17" stroke="${R}" stroke-width="2.4" shape-rendering="auto"/>`,
  addressBook:
    r(3, 1, 14, 18, K) +
    r(4, 2, 12, 16, T) +
    r(4, 2, 2, 16, N) +
    `<g shape-rendering="auto"><circle cx="11" cy="7.5" r="2.5" fill="${PY}" stroke="${K}" stroke-width="0.8"/><path d="M6.5 15.5 Q11 8.5 15.5 15.5 Z" fill="${R}" stroke="${K}" stroke-width="0.8"/></g>`,
  send:
    envelope(5, 5, 14, 10) +
    r(0, 7, 4, 1, K) +
    r(1, 10, 3, 1, K) +
    r(0, 13, 4, 1, K),
  cut:
    `<g shape-rendering="auto" fill="none" stroke="${K}" stroke-width="1.5"><path d="M6 1 L13 13"/><path d="M14 1 L7 13"/><circle cx="5.5" cy="15.5" r="3" stroke="${N}" stroke-width="2"/><circle cx="14.5" cy="15.5" r="3" stroke="${N}" stroke-width="2"/></g>`,
  copy: page(1, 1, 11, 13) + page(8, 6, 11, 13),
  paste:
    r(2, 3, 13, 16, K) +
    r(3, 4, 11, 14, O) +
    r(5, 2, 7, 4, K) +
    r(6, 3, 5, 2, S) +
    page(8, 8, 11, 11),
  undo:
    `<path d="M5 7 H12.5 A4.5 4.5 0 0 1 12.5 16 H7" fill="none" stroke="${N}" stroke-width="2.4" shape-rendering="auto"/>` +
    `<polygon points="1,7 6.5,2 6.5,12" fill="${N}" shape-rendering="auto"/>`,
  check: `<path d="M2 11 L7 16 L18 3" fill="none" stroke="${GR}" stroke-width="3" shape-rendering="auto"/>`,
  spelling:
    text(8.5, 9, 8, N, 'ABC') + `<path d="M5 14 L8.5 17.5 L16 9" fill="none" stroke="${R}" stroke-width="2" shape-rendering="auto"/>`,
  attach: `<path d="M13 6 V14 A3 3 0 0 1 7 14 V5 A2 2 0 0 1 11 5 V13" fill="none" stroke="${G}" stroke-width="1.6" shape-rendering="auto"/>`,
} as const;

export type IconName = keyof typeof ICONS32;
export type ToolIconName = keyof typeof ICONS20;

const cache = new Map<string, string>();

function toUrl(key: string, markup: string): string {
  let url = cache.get(key);
  if (!url) {
    url = `data:image/svg+xml,${encodeURIComponent(markup)}`;
    cache.set(key, url);
  }
  return url;
}

export function iconUrl(name: IconName): string {
  return toUrl(name, svg(32, ICONS32[name]));
}

export function toolIconUrl(name: ToolIconName): string {
  return toUrl(`tool:${name}`, svg(20, ICONS20[name]));
}

/** An <img> for an icon. `size` is the rendered size in CSS pixels. */
export function icon(name: IconName, size: 16 | 32 | 48 = 32, className = ''): HTMLImageElement {
  const img = document.createElement('img');
  img.src = iconUrl(name);
  img.width = size;
  img.height = size;
  img.alt = '';
  img.draggable = false;
  img.className = `icon icon-${size} ${className}`.trim();
  return img;
}

export function toolIcon(name: ToolIconName): HTMLImageElement {
  const img = document.createElement('img');
  img.src = toolIconUrl(name);
  img.width = 20;
  img.height = 20;
  img.alt = '';
  img.draggable = false;
  img.className = 'tool-icon';
  return img;
}

export const ICON_NAMES = Object.keys(ICONS32) as IconName[];
