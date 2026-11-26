export type IconName =
  | 'undo'
  | 'redo'
  | 'trash'
  | 'grid'
  | 'help'
  | 'sound'
  | 'muted'
  | 'arrow'
  | 'close'
  | 'play'
  | 'pause'
  | 'reset'
  | 'split'
  | 'copy'
  | 'check'
  | 'chevron'
  | 'flask';
const paths: Record<IconName, string> = {
  undo: 'M9 5 4 10l5 5M4 10h9a6 6 0 0 1 0 12',
  redo: 'm15 5 5 5-5 5M20 10h-9a6 6 0 0 0 0 12',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 10v7M14 10v7',
  grid: 'M4 4h16v16H4zM4 12h16M12 4v16',
  help: 'M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5M12 17h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  sound: 'M11 4 6 8H3v8h3l5 4V4M15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16',
  muted: 'M11 4 6 8H3v8h3l5 4V4M16 9l6 6M22 9l-6 6',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  close: 'm6 6 12 12M18 6 6 18',
  play: 'm8 4 12 8-12 8V4',
  pause: 'M8 5v14M16 5v14',
  reset: 'M4 10a8 8 0 1 1 0 5M4 4v6h6',
  split: 'M12 20v-8M5 4l7 8 7-8M5 9V4h5M14 4h5v5',
  copy: 'M9 9h11v12H9zM15 9V3H3v12h6',
  check: 'm5 12 4 4L19 6',
  chevron: 'm8 4 8 8-8 8',
  flask: 'M9 3h6M10 3v7l-6 9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2l-6-9V3M8 15h8',
};
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
