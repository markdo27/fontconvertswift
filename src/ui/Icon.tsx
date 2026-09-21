import React from 'react';

/**
 * Monoline icons drawn on a 12x12 grid with a 1.4 stroke, matching the arrow
 * used across markdo27.github.io. Keeping them local means the whole icon set
 * shares one weight and the app pulls in no icon dependency.
 */
const PATHS = {
  arrow: 'M3.5 8.5 8.5 3.5M4.5 3.5H8.5V7.5',
  down: 'M6 2.5v7M3 6.5 6 9.5l3-3',
  up: 'M6 9.5v-7M3 5.5 6 2.5l3 3',
  check: 'M2.5 6.2 5 8.7l4.5-5',
  close: 'M3 3l6 6M9 3l-6 6',
  plus: 'M6 2.5v7M2.5 6h7',
  search: 'M5.4 9a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM8 8l2.5 2.5',
  trash: 'M2.5 3.5h7M4.5 3.5V2.4h3v1.1M3.4 3.5l.5 6.1h4.2l.5-6.1',
  edit: 'M8.3 1.9 10.1 3.7 4.2 9.6 2 10l.4-2.2 5.9-5.9Z',
  grid: 'M2 2h3.2v3.2H2zM6.8 2H10v3.2H6.8zM2 6.8h3.2V10H2zM6.8 6.8H10V10H6.8z',
  list: 'M2 3h8M2 6h8M2 9h8',
  layers: 'M6 1.6 10.4 4 6 6.4 1.6 4 6 1.6ZM1.6 8 6 10.4 10.4 8',
  type: 'M2 2.6h8M6 2.6v6.8M4.3 9.4h3.4',
  eye: 'M.9 6S2.8 2.6 6 2.6 11.1 6 11.1 6 9.2 9.4 6 9.4.9 6 .9 6Z M6 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  code: 'M4 3.2 1.4 6 4 8.8M8 3.2 10.6 6 8 8.8',
  copy: 'M4.2 4.2h5.3v5.3H4.2zM2.5 7.8V2.5h5.3',
  refresh: 'M10 6A4 4 0 1 1 8.6 3M10 1.8V3.6H8.2',
  undo: 'M2.4 5.6h5a2.6 2.6 0 1 1 0 5.2H4.6M2.4 5.6 4.6 3.4M2.4 5.6l2.2 2.2',
  download: 'M6 1.8v6M3.4 5.4 6 8l2.6-2.6M2 10h8',
  folder: 'M1.6 3.4h3l1 1.2h4.8V9.8H1.6V3.4Z',
  file: 'M2.8 1.6h4L9.2 4v6.4H2.8V1.6ZM6.8 1.6V4h2.4',
  info: 'M6 10.4A4.4 4.4 0 1 0 6 1.6a4.4 4.4 0 0 0 0 8.8ZM6 5.4v3M6 3.8v.1',
  warn: 'M6 1.6 11 10.4H1L6 1.6ZM6 5v2.4M6 8.8v.1',
  sliders: 'M2 3.5h8M2 8.5h8M4.4 2.2v2.6M7.8 7.2v2.6',
  filter: 'M1.6 2.4h8.8L7 6.2v3.6L5 8.6V6.2L1.6 2.4Z',
  package: 'M6 1.8 10.4 4v4L6 10.2 1.6 8V4L6 1.8ZM1.6 4 6 6.2 10.4 4M6 6.2v4',
  shield: 'M6 1.6 9.8 3v3.1c0 2-1.6 3.5-3.8 4.3-2.2-.8-3.8-2.3-3.8-4.3V3L6 1.6Z',
  ruler: 'M1.6 7.2 7.2 1.6l3.2 3.2-5.6 5.6-3.2-3.2ZM3.6 5.2l1 1M5.2 3.6l1 1M7.2 5.2l1 1'
} as const;

export type IconName = keyof typeof PATHS;

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

export const Icon: React.FC<IconProps> = ({ name, size = 12, ...rest }) => (
  // An explicit width/height keeps an icon from stretching to fill its box
  // wherever no CSS rule sizes it; stylesheet rules still win over these.
  <svg
    viewBox="0 0 12 12"
    aria-hidden="true"
    focusable="false"
    width={size}
    height={size}
    {...rest}
  >
    <path
      d={PATHS[name]}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
