import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme';

// Ícones do design: traço 1,8, 24 px, pontas arredondadas, cor do texto.
const ICONS = {
  back: <Path d="M15 18l-6-6 6-6" />,
  chevronRight: <Path d="M9 6l6 6-6 6" />,
  chevronDown: <Path d="M6 9l6 6 6-6" />,
  minus: <Path d="M5 12h14" />,
  plus: <Path d="M12 5v14M5 12h14" />,
  close: <Path d="M6 6l12 12M18 6L6 18" />,
  check: <Path d="M5 12l5 5 9-10" />,
  bolt: <Path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  pulse: <Path d="M3 12h4l3-8 4 16 3-8h4" />,
  run: (
    <>
      <Circle cx="13" cy="4" r="2" />
      <Path d="M10 21l2-6 3 3v3M8 12l3-4 3 3 3 1" />
    </>
  ),
  bike: (
    <>
      <Circle cx="6" cy="17" r="3.5" />
      <Circle cx="18" cy="17" r="3.5" />
      <Path d="M6 17l4-8h5l3 8M9 6h3" />
    </>
  ),
  swim: (
    <>
      <Path d="M2 18c2 0 2-1.5 4-1.5S8 18 10 18s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M7 13l4-5 4 3" />
      <Circle cx="17" cy="6" r="2" />
    </>
  ),
  search: (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M20 20l-3.5-3.5" />
    </>
  ),
  barcode: <Path d="M4 7V5h3M17 5h3v2M20 17v2h-3M7 19H4v-2M8 9v6M11 9v6M14 9v6M17 9v6" />,
  faceId: (
    <>
      <Path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <Path d="M9 9v1M15 9v1M12 9v4h-1M9 15.5c1.7 1.3 4.3 1.3 6 0" />
    </>
  ),
  edit: <Path d="M4 20h4L19 9l-4-4L4 16z" />,
  trash: <Path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  tasks: (
    <>
      <Rect x="3" y="3" width="18" height="18" rx="5" />
      <Path d="M8 12l3 3 5-6" />
    </>
  ),
  alert: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 8v5M12 16v.5" />
    </>
  ),
  image: (
    <>
      <Rect x="3" y="5" width="18" height="14" rx="3" />
      <Circle cx="9" cy="10" r="1.5" />
      <Path d="M21 16l-5-5-8 8" />
    </>
  ),
  dumbbell: <Path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12" />,
  sun: (
    <>
      <Circle cx="12" cy="12" r="4" />
      <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  flame: <Path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 1 1 1.5 2 1.5 3 1-2 1.5-4 1.5-7z" />,
  home: <Path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />,
  apple: (
    <>
      <Path d="M12 7c-2-2-7-1.5-7 4 0 4 3 9 5 9 1 0 1.3-.5 2-.5s1 .5 2 .5c2 0 5-5 5-9 0-5.5-5-6-7-4z" />
      <Path d="M12 7c0-2 1-3.5 3-4" />
    </>
  ),
  play: <Path d="M8 5v14l11-7z" />,
  bell: <Path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4" />,
  lock: (
    <>
      <Rect x="5" y="11" width="14" height="10" rx="2" />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  logout: <Path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />,
  podium: <Path d="M8 21V11H3v10zM15 21V5h-6v16zM21 21v-7h-6v7z" />,
  trendUp: <Path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  calendar: (
    <>
      <Rect x="3" y="5" width="18" height="16" rx="3" />
      <Path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  share: <Path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />,
  trophy: <Path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3" />,
  drop: <Path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  scale: (
    <>
      <Rect x="3" y="4" width="18" height="16" rx="4" />
      <Path d="M8 9a5 5 0 0 1 8 0l-3 3" />
    </>
  ),
  user: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
    </>
  ),
  clock: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 7v5l3 2" />
    </>
  ),
  history: <Path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7v5l3 2" />,
  target: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Circle cx="12" cy="12" r="5" />
      <Circle cx="12" cy="12" r="1" />
    </>
  ),
  sparkles: <Path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />,
  body: (
    <>
      <Circle cx="12" cy="4" r="2" />
      <Path d="M5 9l7-1 7 1M12 8v6M9 21l3-7 3 7" />
    </>
  ),
  camera: (
    <>
      <Path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <Circle cx="12" cy="13" r="3.5" />
    </>
  ),
  more: <Path d="M5 12h.01M12 12h.01M19 12h.01" />,
} as const;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fill?: string;
}

export function Icon({ name, size = 24, color = colors.text, strokeWidth = 1.8, fill = 'none' }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </Svg>
  );
}
