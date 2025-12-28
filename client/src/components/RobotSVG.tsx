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
  // パーツ形状の定義（拡張版: 5種類以上のバリエーション）
  const shapes = useMemo(() => {
    return {
      head: [
        // Type 1: Square (Standard)
        <rect x="80" y="20" width="40" height="40" rx="4" />,
        // Type 2: Round (Scout)
        <circle cx="100" cy="40" r="22" />,
        // Type 3: Triangle (Speed)
        <path d="M80 60 L100 20 L120 60 Z" />,
        // Type 4: Knight (Defense)
        <path d="M80 20 L120 20 L120 50 L100 65 L80 50 Z" />,
        // Type 5: Horned (Attack)
        <path d="M70 15 L85 30 L115 30 L130 15 L120 60 L80 60 Z" />,
        // Type 6: Wide (Sensor)
        <rect x="70" y="30" width="60" height="25" rx="8" />,
      ],
      body: [
        // Type 1: Box (Standard)
        <rect x="70" y="60" width="60" height="70" rx="8" />,
        // Type 2: Hexagon (Armored)
        <path d="M70 70 L100 60 L130 70 L130 120 L100 130 L70 120 Z" />,
        // Type 3: Slim (Agile)
        <path d="M85 60 L115 60 L110 130 L90 130 Z" />,
        // Type 4: Orb (Core)
        <circle cx="100" cy="95" r="35" />,
        // Type 5: Wide (Tank)
        <path d="M60 60 L140 60 L130 130 L70 130 Z" />,
        // Type 6: Spiked (Offense)
        <path d="M70 60 L100 130 L130 60 L100 80 Z" />,
      ],
      arm: [
        // Type 1: Basic
        <rect x="0" y="0" width="20" height="60" rx="4" />,
        // Type 2: Jointed
        <path d="M10 0 L25 30 L5 60" strokeWidth="12" fill="none" strokeLinecap="round" />,
        // Type 3: Claw
        <g>
          <rect x="5" y="0" width="10" height="40" />
          <path d="M0 40 L0 60 M20 40 L20 60" strokeWidth="4" fill="none" />
        </g>,
        // Type 4: Blaster
        <g>
          <rect x="0" y="0" width="20" height="40" />
          <circle cx="10" cy="50" r="12" />
          <rect x="8" y="50" width="4" height="20" />
        </g>,
        // Type 5: Shield
        <path d="M0 0 L20 0 L25 40 L10 60 L-5 40 Z" />,
        // Type 6: Tentacle
        <path d="M10 0 Q30 20 10 40 Q-10 60 10 80" strokeWidth="8" fill="none" strokeLinecap="round" />,
      ],
      leg: [
        // Type 1: Basic
        <rect x="0" y="0" width="20" height="70" rx="4" />,
        // Type 2: Thick
        <path d="M0 0 L25 70 L-5 70 Z" />,
        // Type 3: Reverse Joint
        <path d="M10 0 L30 30 L10 70" strokeWidth="12" fill="none" strokeLinecap="round" />,
        // Type 4: Hover
        <g>
          <path d="M5 0 L15 40" strokeWidth="8" />
          <ellipse cx="10" cy="50" rx="20" ry="5" />
        </g>,
        // Type 5: Tracks
        <rect x="-5" y="0" width="30" height="60" rx="10" />,
        // Type 6: Spider
        <path d="M10 0 Q40 20 50 60" strokeWidth="6" fill="none" strokeLinecap="round" />,
      ],
      backpack: [
        // Type 1: None (Small box)
        <rect x="20" y="20" width="60" height="60" rx="4" opacity="0.5" />,
        // Type 2: Wings
        <path d="M20 40 L-20 10 L-20 80 L20 60" opacity="0.8" />,
        // Type 3: Jetpack
        <g opacity="0.8">
          <rect x="30" y="20" width="15" height="50" rx="5" />
          <rect x="55" y="20" width="15" height="50" rx="5" />
        </g>,
        // Type 4: Radar
        <circle cx="50" cy="50" r="40" opacity="0.3" />,
        // Type 5: Heavy Armor
        <rect x="10" y="10" width="80" height="80" rx="10" opacity="0.6" />,
      ]
    };
  }, []);

  // パーツIDから形状を選択（モジュロ演算で範囲内に収める）
  const getShape = (type: 'head' | 'body' | 'arm' | 'leg' | 'backpack', id: number) => {
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
        <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.4" />
          <stop offset="50%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Backpack (Behind) */}
      <g transform="translate(50, 50)" fill={colors.secondary}>
        {getShape('backpack', parts.backpack)}
      </g>

      {/* Left Arm */}
      <g transform="translate(40, 70)" fill={colors.secondary} stroke={colors.secondary}>
        {getShape('arm', parts.armLeft)}
      </g>

      {/* Right Arm */}
      <g transform="translate(140, 70) scale(-1, 1)" fill={colors.secondary} stroke={colors.secondary}>
        {getShape('arm', parts.armRight)}
      </g>

      {/* Left Leg */}
      <g transform="translate(75, 130)" fill={colors.primary} stroke={colors.primary}>
        {getShape('leg', parts.legLeft)}
      </g>

      {/* Right Leg */}
      <g transform="translate(105, 130) scale(-1, 1)" fill={colors.primary} stroke={colors.primary}>
        {getShape('leg', parts.legRight)}
      </g>

      {/* Body */}
      <g fill={colors.primary} stroke={colors.accent} strokeWidth="2">
        {getShape('body', parts.body)}
        {/* Texture Overlay */}
        <g fill="url(#metal)" stroke="none">
          {getShape('body', parts.body)}
        </g>
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
      <g transform="translate(160, 80) rotate(-15)" fill={colors.accent}>
        <rect x="0" y="0" width="8" height="80" rx="2" />
        <rect x="-10" y="60" width="28" height="12" rx="2" />
        <circle cx="4" cy="0" r="6" fill={colors.glow} />
      </g>

    </svg>
  );
}
