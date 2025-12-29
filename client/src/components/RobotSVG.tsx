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
  animate?: boolean;
  decals?: string[];
}

// Decal definitions
const DECAL_CATALOG: Record<string, { path: string; position: { x: number; y: number } }> = {
  star: { path: "M100,70 L103,78 L112,78 L105,83 L108,92 L100,87 L92,92 L95,83 L88,78 L97,78 Z", position: { x: 0, y: 0 } },
  skull: { path: "M100,70 m-8,0 a8,8 0 1,0 16,0 a8,8 0 1,0 -16,0 M95,68 L95,72 M105,68 L105,72 M96,76 L100,78 L104,76", position: { x: 0, y: 0 } },
  flame: { path: "M100,90 Q95,80 98,70 Q100,75 102,70 Q105,80 100,90", position: { x: 0, y: 0 } },
  lightning: { path: "M98,68 L102,76 L98,76 L102,85", position: { x: 0, y: 0 } },
  heart: { path: "M100,73 C100,70 97,68 94,70 C91,72 91,76 94,80 L100,85 L106,80 C109,76 109,72 106,70 C103,68 100,70 100,73 Z", position: { x: 0, y: 0 } },
};

export default function RobotSVG({ parts, colors, size = 200, className, animate = true, decals = [] }: RobotSVGProps) {
  // パーツ形状の定義（拡張版: 5種類以上のバリエーション）
  const shapes = useMemo(() => {
    return {
      head: [
        // Type 1: Square (Standard)
        <rect key="h1" x="80" y="20" width="40" height="40" rx="4" />,
        // Type 2: Round (Scout)
        <circle key="h2" cx="100" cy="40" r="22" />,
        // Type 3: Triangle (Speed)
        <path key="h3" d="M80 60 L100 20 L120 60 Z" />,
        // Type 4: Knight (Defense)
        <path key="h4" d="M80 20 L120 20 L120 50 L100 65 L80 50 Z" />,
        // Type 5: Horned (Attack)
        <path key="h5" d="M70 15 L85 30 L115 30 L130 15 L120 60 L80 60 Z" />,
        // Type 6: Wide (Sensor)
        <rect key="h6" x="70" y="30" width="60" height="25" rx="8" />,
      ],
      body: [
        <rect key="b1" x="70" y="60" width="60" height="70" rx="8" />,
        <path key="b2" d="M70 70 L100 60 L130 70 L130 120 L100 130 L70 120 Z" />,
        <path key="b3" d="M85 60 L115 60 L110 130 L90 130 Z" />,
        <circle key="b4" cx="100" cy="95" r="35" />,
        <path key="b5" d="M60 60 L140 60 L130 130 L70 130 Z" />,
        <path key="b6" d="M70 60 L100 130 L130 60 L100 80 Z" />,
      ],
      arm: [
        <rect key="a1" x="0" y="0" width="20" height="60" rx="4" />,
        <path key="a2" d="M10 0 L25 30 L5 60" strokeWidth="12" fill="none" strokeLinecap="round" />,
        <g key="a3"><rect x="5" y="0" width="10" height="40" /><path d="M0 40 L0 60 M20 40 L20 60" strokeWidth="4" fill="none" /></g>,
        <g key="a4"><rect x="0" y="0" width="20" height="40" /><circle cx="10" cy="50" r="12" /><rect x="8" y="50" width="4" height="20" /></g>,
        <path key="a5" d="M0 0 L20 0 L25 40 L10 60 L-5 40 Z" />,
        <path key="a6" d="M10 0 Q30 20 10 40 Q-10 60 10 80" strokeWidth="8" fill="none" strokeLinecap="round" />,
      ],
      leg: [
        <rect key="l1" x="0" y="0" width="20" height="70" rx="4" />,
        <path key="l2" d="M0 0 L25 70 L-5 70 Z" />,
        <path key="l3" d="M10 0 L30 30 L10 70" strokeWidth="12" fill="none" strokeLinecap="round" />,
        <g key="l4"><path d="M5 0 L15 40" strokeWidth="8" /><ellipse cx="10" cy="50" rx="20" ry="5" /></g>,
        <rect key="l5" x="-5" y="0" width="30" height="60" rx="10" />,
        <path key="l6" d="M10 0 Q40 20 50 60" strokeWidth="6" fill="none" strokeLinecap="round" />,
      ],
      backpack: [
        <rect key="bp1" x="20" y="20" width="60" height="60" rx="4" opacity="0.5" />,
        <path key="bp2" d="M20 40 L-20 10 L-20 80 L20 60" opacity="0.8" />,
        <g key="bp3" opacity="0.8"><rect x="30" y="20" width="15" height="50" rx="5" /><rect x="55" y="20" width="15" height="50" rx="5" /></g>,
        <circle key="bp4" cx="50" cy="50" r="40" opacity="0.3" />,
        <rect key="bp5" x="10" y="10" width="80" height="80" rx="10" opacity="0.6" />,
      ]
    };
  }, []);

  const getShape = (type: 'head' | 'body' | 'arm' | 'leg' | 'backpack', id: number) => {
    const list = shapes[type];
    return list[(id - 1) % list.length];
  };

  // Generate unique IDs for this instance to avoid conflicts
  const instanceId = useMemo(() => Math.random().toString(36).substr(2, 9), []);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id={`glow-${instanceId}`}>
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id={`metal-${instanceId}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.4" />
          <stop offset="50%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.2" />
        </linearGradient>

        {/* Animation keyframes in style tag */}
        <style>{`
          @keyframes eyeBlink {
            0%, 90%, 100% { transform: scaleY(1); }
            95% { transform: scaleY(0.1); }
          }
          @keyframes energyPulse {
            0%, 100% { opacity: 0.6; filter: brightness(1); }
            50% { opacity: 1; filter: brightness(1.5); }
          }
          @keyframes idleBob {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-2px); }
          }
          .robot-eyes-${instanceId} {
            animation: ${animate ? 'eyeBlink 4s infinite' : 'none'};
            transform-origin: center;
          }
          .robot-glow-${instanceId} {
            animation: ${animate ? 'energyPulse 2s ease-in-out infinite' : 'none'};
          }
          .robot-body-${instanceId} {
            animation: ${animate ? 'idleBob 3s ease-in-out infinite' : 'none'};
          }
        `}</style>
      </defs>

      <g className={animate ? `robot-body-${instanceId}` : ''}>
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
          <g fill={`url(#metal-${instanceId})`} stroke="none">
            {getShape('body', parts.body)}
          </g>
        </g>

        {/* Energy Core Glow Effect on Body */}
        <circle
          cx="100"
          cy="95"
          r="8"
          fill={colors.glow}
          className={`robot-glow-${instanceId}`}
          filter={`url(#glow-${instanceId})`}
        />

        {/* Decals on Body */}
        {decals.map((decalId, index) => {
          const decal = DECAL_CATALOG[decalId];
          if (!decal) return null;
          return (
            <path
              key={`decal-${index}-${decalId}`}
              d={decal.path}
              fill={colors.accent}
              opacity="0.8"
            />
          );
        })}

        {/* Head */}
        <g fill={colors.secondary} stroke={colors.accent} strokeWidth="2">
          {getShape('head', parts.head)}
        </g>

        {/* Face (Eyes) with blink animation */}
        <g fill={colors.glow} filter={`url(#glow-${instanceId})`} className={`robot-eyes-${instanceId}`}>
          <circle cx="90" cy="40" r="4" />
          <circle cx="110" cy="40" r="4" />
        </g>

        {/* Weapon */}
        <g transform="translate(160, 80) rotate(-15)" fill={colors.accent}>
          <rect x="0" y="0" width="8" height="80" rx="2" />
          <rect x="-10" y="60" width="28" height="12" rx="2" />
          <circle cx="4" cy="0" r="6" fill={colors.glow} className={`robot-glow-${instanceId}`} />
        </g>
      </g>
    </svg>
  );
}

