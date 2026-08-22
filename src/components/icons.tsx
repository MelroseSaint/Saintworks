import type { SVGProps } from 'react'

const PATHS: Record<string, string> = {
  plus: 'M12 5v14M5 12h14',
  folder:
    'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',
  folderOpen:
    'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H4a1 1 0 0 0-1 1v8a2 2 0 0 1-2-2V7z',
  chevronRight: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp: 'M6 15l6-6 6 6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff:
    'M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a16 16 0 0 1-2.4 3M6.6 6.6A16 16 0 0 0 2 12s3.5 6 10 6c1.4 0 2.7-.3 3.8-.8M9.9 9.9a3 3 0 0 0 4.2 4.2',
  lock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 8 0v3',
  unlock: 'M6 11h12v9H6zM8 11V8a4 4 0 0 1 7.5-2',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  undo: 'M3 7v6h6M3 13a9 9 0 1 0 3-7.7L3 8',
  redo: 'M21 7v6h-6M21 13a9 9 0 1 1-3-7.7L21 8',
  play: 'M8 5v14l11-7z',
  code: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  monitor: 'M2 4h20v12H2zM8 20h8M12 16v4',
  tablet: 'M4 3h16v18H4zM12 18h.01',
  phone: 'M6 2h12v20H6zM11 19h2',
  x: 'M18 6L6 18M6 6l12 12',
  duplicate: 'M8 8V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3M5 8h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6',
  image:
    'M3 5h18v14H3zM3 15l4-4 4 4 3-3 6 6M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  component:
    'M12 3l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 16l9 5 9-5',
  layers: 'M12 2l10 6-10 6L2 8l10-6zM2 14l10 6 10-6',
  palette:
    'M12 2a10 10 0 0 0 0 20 2 2 0 0 0 2-2c0-.6-.2-1-.5-1.4-.3-.4-.5-.9-.5-1.6a2 2 0 0 1 2-2h2.3A5.7 5.7 0 0 0 22 9.3 8.3 8.3 0 0 0 12 2zM7 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3 1a7.6 7.6 0 0 0-1.7-1L15 3.7h-4L10.6 6a7.6 7.6 0 0 0-1.7 1l-2.3-1-2 3.4L6.6 12a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7.6 7.6 0 0 0 1.7 1l.4 2.4h4l.4-2.4a7.6 7.6 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5z',
  refresh: 'M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2M18 4v5h-5M6 20v-5h5',
  rocket:
    'M4.5 16.5L3 21l4.5-1.5M8 16c-1.5-2.5-2-8-2-13 5 0 10.5.5 13 2M16 16c2.5-1.5 8-2 13-2 0 5-.5 10.5-2 13M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  sparkles:
    'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z',
  check: 'M5 13l4 4L19 7',
  warning:
    'M12 3L2 21h20L12 3zM12 9v5M12 17.5v.5',
  error: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 7v6M12 16.5v.5',
  info: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 11v5M12 7.5v.5',
  upload: 'M12 3v12M7 8l5-5 5 5M4 21h16',
  download: 'M12 3v12M7 15l5 5 5-5M4 21h16',
  globe:
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5',
  arrowsMove:
    'M12 2v20M2 12h20M12 2l3 3M12 2L9 5M12 22l3-3M12 22l-3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3',
  keyboard: 'M4 5h16v14H4zM8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01M8 17h8',
  box: 'M21 8l-9-5-9 5v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8',
  database:
    'M12 3c5 0 8 1.5 8 4s-3 4-8 4-8-1.5-8-4 3-4 8-4zM4 7v10c0 2.5 3 4 8 4s8-1.5 8-4V7M4 12c0 2.5 3 4 8 4s8-1.5 8-4',
  type: 'M4 6V4h16v2M12 4v16M9 20h6',
  doc: 'M6 2h9l5 5v15H6zM14 2v6h6M9 13h6M9 17h6',
  clock: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v6l4 2',
  git: 'M12 3a3 3 0 0 0-1 5.8V9a2 2 0 0 1-2 2H7a3 3 0 1 0 .2 2H9a4 4 0 0 0 4-4v-.2a3 3 0 1 0-1-5.8z',
  cursor:
    'M4 3l8 18 2.5-7.5L22 11 4 3z',
  motion: 'M4 12h16M14 6l6 6-6 6',
}

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: keyof typeof PATHS | string
  size?: number
}

export function Icon({ name, size = 15, ...rest }: IconProps) {
  const d = PATHS[name] ?? PATHS.box
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d={d} />
    </svg>
  )
}
