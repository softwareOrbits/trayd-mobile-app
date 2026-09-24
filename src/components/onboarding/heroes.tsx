import Svg, {
  Circle,
  G,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

const NAVY = '#16345A';
const AMBER = '#E89B2D';

export const HeroNotifications = () => (
  <Svg width={200} height={180} viewBox="0 0 200 180">
    <Rect x={20} y={20} width={160} height={140} rx={20} fill={NAVY} />
    <G transform="translate(100 90)">
      <Path
        d="M-32 -8 C -32 -32, -14 -42, 0 -42 C 14 -42, 32 -32, 32 -8 L 36 14 L -36 14 Z"
        fill={AMBER}
      />
      <Rect x={-10} y={14} width={20} height={6} fill={AMBER} />
      <Circle cx={0} cy={28} r={6} fill={AMBER} />
    </G>
    <Circle cx={142} cy={58} r={14} fill={AMBER} stroke="#fff" strokeWidth={3} />
    <SvgText
      x={142}
      y={63}
      fontSize={14}
      fontWeight="700"
      fill={NAVY}
      textAnchor="middle"
    >
      3
    </SvgText>
    <G stroke="#fff" strokeWidth={2} strokeLinecap="round" opacity={0.4}>
      <Path d="M52 70 L46 64" />
      <Path d="M48 90 L40 90" />
      <Path d="M52 110 L46 116" />
    </G>
  </Svg>
);

export const HeroLocation = () => (
  <Svg width={200} height={180} viewBox="0 0 200 180">
    <Rect x={20} y={20} width={160} height={140} rx={20} fill={AMBER} />
    <G stroke={NAVY} strokeWidth={1.2} opacity={0.18}>
      <Path d="M20 60 L180 60" />
      <Path d="M20 100 L180 100" />
      <Path d="M20 140 L180 140" />
      <Path d="M60 20 L60 160" />
      <Path d="M100 20 L100 160" />
      <Path d="M140 20 L140 160" />
    </G>
    <Circle cx={100} cy={92} r={46} fill="#FFFFFF" opacity={0.22} />
    <Circle
      cx={100}
      cy={92}
      r={46}
      fill="none"
      stroke={NAVY}
      strokeWidth={1.5}
      strokeDasharray="4 4"
    />
    <G transform="translate(100 76)">
      <Path
        d="M0 -24 C -14 -24, -22 -14, -22 -4 C -22 10, 0 32, 0 32 C 0 32, 22 10, 22 -4 C 22 -14, 14 -24, 0 -24 Z"
        fill={NAVY}
      />
      <Circle cx={0} cy={-6} r={7} fill="#fff" />
    </G>
  </Svg>
);

export const HeroAvatar = () => (
  <Svg width={200} height={180} viewBox="0 0 200 180">
    <Rect x={20} y={20} width={160} height={140} rx={20} fill="#F4EFE4" />
    <Circle
      cx={100}
      cy={86}
      r={44}
      fill="#fff"
      stroke={NAVY}
      strokeWidth={1.5}
      strokeDasharray="3 4"
    />
    <G fill={NAVY} opacity={0.35}>
      <Circle cx={100} cy={76} r={14} />
      <Path d="M72 110 C 76 96, 88 90, 100 90 C 112 90, 124 96, 128 110 Z" />
    </G>
    <G transform="translate(132 116)">
      <Circle r={20} fill={AMBER} stroke="#fff" strokeWidth={3} />
      <Rect x={-9} y={-6} width={18} height={13} rx={2} fill={NAVY} />
      <Circle cx={0} cy={0.5} r={4} fill={AMBER} />
      <Rect x={-4} y={-9} width={8} height={3} rx={1} fill={NAVY} />
    </G>
  </Svg>
);

export const HeroSuccess = () => (
  <Svg width={120} height={120} viewBox="0 0 120 120">
    <Circle cx={60} cy={60} r={56} fill="#FBE9C7" />
    <Circle cx={60} cy={60} r={42} fill={AMBER} />
    <Path
      d="M42 62 L55 75 L80 48"
      stroke={NAVY}
      strokeWidth={6}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);
