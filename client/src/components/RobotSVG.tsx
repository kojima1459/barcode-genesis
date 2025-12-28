import { useMemo } from "react";

interface RobotParts {
  head: number;
  face: number;
  body: number;
  armLeft: number;
  armRight: number;
  legLeft: number;
  legRight: number;
  backpack: number;
  weapon: number;
  accessory: number;
}

interface RobotColors {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
}

interface RobotSVGProps {
  parts: RobotParts;
  colors: RobotColors;
  size?: number;
  className?: string;
}

export default function RobotSVG({ parts, colors, size = 200, className }: RobotSVGProps) {
  // パーツ形状の定義（簡易版: 実際にはもっと複雑なパスを使用）
  const shapes = useMemo(() => {
    return {
      head: [
        // Type 1: Square
        <rect x="80" y="20" width="40" height="40" rx="4" />,
        // Type 2: Round
        <circle cx="100" cy="40" r="22" />,
        // Type 3: Triangle
        <path d="M80 60 L100 20 L120 60 Z" />,
      ],
      body: [
        // Type 1: Box
        <rect x="70" y="60" width="60" height="70" rx="8" />,
        // Type 2: Hexagon
        <path d="M70 70 L100 60 L130 70 L130 120 L100 130 L70 120 Z" />,
      ],
      arm: [
        // Type 1: Basic
        <rect x="0" y="0" width="20" height="60" rx="4" />,
        // Type 2: Jointed
        <path d="M10 0 L20 30 L0 60" strokeWidth="10" fill="none" />,
      ],
      leg: [
        // Type 1: Basic
        <rect x="0" y="0" width="20" height="70" rx="4" />,
        // Type 2: Thick
        <path d="M0 0 L25 70 L-5 70 Z" />,
      ]
    };
  }, []);

  // パーツIDから形状を選択（モジュロ演算で範囲内に収める）
  const getShape = (type: 'head' | 'body' | 'arm' | 'leg', id: number) => {
    const list = shapes[type];
    return list[(id - 1) % list.length];
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Backpack (Behind) */}
      <g transform="translate(50, 50)" fill={colors.secondary}>
        <rect x="20" y="20" width="60" height="60" rx="4" opacity="0.8" />
      </g>

      {/* Left Arm */}
      <g transform="translate(40, 70)" fill={colors.secondary} stroke={colors.secondary}>
        {getShape('arm', parts.armLeft)}
      </g>

      {/* Right Arm */}
      <g transform="translate(140, 70)" fill={colors.secondary} stroke={colors.secondary}>
        {getShape('arm', parts.armRight)}
      </g>

      {/* Left Leg */}
      <g transform="translate(75, 130)" fill={colors.primary}>
        {getShape('leg', parts.legLeft)}
      </g>

      {/* Right Leg */}
      <g transform="translate(105, 130)" fill={colors.primary}>
        {getShape('leg', parts.legRight)}
      </g>

      {/* Body */}
      <g fill={colors.primary} stroke={colors.accent} strokeWidth="2">
        {getShape('body', parts.body)}
      </g>

      {/* Head */}
      <g fill={colors.secondary} stroke={colors.accent} strokeWidth="2">
        {getShape('head', parts.head)}
      </g>

      {/* Face (Eyes) */}
      <g fill={colors.glow} filter="url(#glow)">
        <circle cx="90" cy="40" r="4" />
        <circle cx="110" cy="40" r="4" />
      </g>

      {/* Weapon */}
      <g transform="translate(150, 80) rotate(-15)" fill={colors.accent}>
        <rect x="0" y="0" width="10" height="80" />
        <rect x="-10" y="60" width="30" height="10" />
      </g>

    </svg>
  );
}
