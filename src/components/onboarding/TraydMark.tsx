import Svg, { Rect, Text as SvgText } from 'react-native-svg';

export const TraydMark = ({ size = 68 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100">
    <Rect x={22} y={4} width={74} height={74} fill="#E89B2D" />
    <Rect x={4} y={22} width={74} height={74} fill="#16345A" />
    <Rect x={12} y={38} width={58} height={13} fill="#FFFFFF" />
    <Rect x={34} y={38} width={14} height={46} fill="#FFFFFF" />
    <SvgText
      x={93}
      y={10}
      fontSize={9}
      fontWeight="600"
      fill="#16345A"
      textAnchor="end"
    >
      ™
    </SvgText>
  </Svg>
);

export default TraydMark;
