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
  showGlow?: boolean;
}

// Mech-style gradients and filters definitions
const Defs = ({ instanceId, colors }: { instanceId: string, colors: RobotColors }) => (
  <defs>
    {/* Body Gradient: Simple top-down lighting for 3D effect */}
    <linearGradient id={`grad-primary-${instanceId}`} x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
      <stop offset="100%" stopColor="black" stopOpacity="0.5" />
    </linearGradient>
    <linearGradient id={`grad-secondary-${instanceId}`} x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor={colors.secondary} stopOpacity="1" />
      <stop offset="100%" stopColor="black" stopOpacity="0.5" />
    </linearGradient>
    <linearGradient id={`grad-accent-${instanceId}`} x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor={colors.accent} stopOpacity="1" />
      <stop offset="100%" stopColor="black" stopOpacity="0.3" />
    </linearGradient>

    {/* Metal/Glass sheen */}
    <linearGradient id={`sheen-${instanceId}`} x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="white" stopOpacity="0.4" />
      <stop offset="40%" stopColor="white" stopOpacity="0" />
      <stop offset="100%" stopColor="white" stopOpacity="0.1" />
    </linearGradient>

    <filter id={`glow-${instanceId}`}>
      <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
      <feMerge>
        <feMergeNode in="coloredBlur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  </defs>
);

export default function RobotSVG({ parts, colors, size = 200, className, animate = true, decals = [], showGlow = false }: RobotSVGProps) {
  // Generate unique IDs
  const instanceId = useMemo(() => Math.random().toString(36).substr(2, 9), []);

  // --- Mech Design Constants ---
  const STROKE_OUTER = 2.5; // Bold outer line
  const STROKE_INNER = 1.0; // Delicate panel line
  const COLOR_LINE = "#202020"; // Dark grey/black for lines

  // Helper to wrap shape with mech styling
  const MechShape = ({ children, type }: { children: React.ReactNode, type: 'primary' | 'secondary' }) => {
    return <g stroke={COLOR_LINE} strokeLinejoin="miter">{children}</g>;
  };

  const shapes = useMemo(() => {
    // Fill ids
    const fillPri = `url(#grad-primary-${instanceId})`;
    const fillSec = `url(#grad-secondary-${instanceId})`;

    return {
      head: [
        // H1: Standard Trooper - Reduced size, angled chin
        <g key="h1">
          <path d="M85 25 L115 25 L118 45 L110 60 L90 60 L82 45 Z" fill={fillSec} strokeWidth={STROKE_OUTER} />
          <path d="M85 35 L115 35" strokeWidth={STROKE_INNER} stroke={COLOR_LINE} fill="none" opacity="0.5" />
        </g>,
        // H2: Scout Dome
        <g key="h2">
          <path d="M85 60 L115 60 L115 40 A15 15 0 0 0 85 40 Z" fill={fillSec} strokeWidth={STROKE_OUTER} />
          <circle cx="100" cy="40" r="5" fill={colors.glow} filter={`url(#glow-${instanceId})`} stroke="none" />
          <rect x="82" y="55" width="36" height="5" fill="#333" stroke="none" />
        </g>,
        // H3: Speed Visor
        <g key="h3">
          <path d="M85 20 L115 20 L120 55 L80 55 Z" fill={fillSec} strokeWidth={STROKE_OUTER} />
          <path d="M85 40 L115 40 L112 50 L88 50 Z" fill={colors.glow} stroke="none" filter={`url(#glow-${instanceId})`} />
        </g>,
        // H4: Knight Helm
        <g key="h4">
          <path d="M80 15 L100 10 L120 15 L120 50 L100 65 L80 50 Z" fill={fillSec} strokeWidth={STROKE_OUTER} />
          <path d="M100 10 L100 65" strokeWidth={STROKE_INNER} stroke={COLOR_LINE} fill="none" opacity="0.3" />
        </g>,
        // H5: Dual Antenna
        <g key="h5">
          <path d="M80 10 L85 25 L115 25 L120 10 L115 60 L85 60 Z" fill={fillSec} strokeWidth={STROKE_OUTER} />
          <rect x="88" y="35" width="24" height="10" fill="#111" stroke="none" />
        </g>,
        // H6: Wide Sensor
        <g key="h6">
          <rect x="75" y="30" width="50" height="25" rx="2" fill={fillSec} strokeWidth={STROKE_OUTER} />
          <rect x="80" y="35" width="40" height="10" fill={colors.glow} stroke="none" filter={`url(#glow-${instanceId})`} />
        </g>,
      ],
      body: [
        // B1: Boxy Standard with vents
        <g key="b1">
          <path d="M70 65 L130 65 L125 120 L75 120 Z" fill={fillPri} strokeWidth={STROKE_OUTER} />
          <path d="M80 75 L120 75 M80 85 L120 85" strokeWidth={STROKE_INNER} stroke={COLOR_LINE} opacity="0.3" />
          <rect x="90" y="95" width="20" height="15" fill="#222" stroke="none" rx="1" />
        </g>,
        // B2: Angular Heavy
        <g key="b2">
          <path d="M65 65 L135 65 L135 80 L120 120 L80 120 L65 80 Z" fill={fillPri} strokeWidth={STROKE_OUTER} />
          <path d="M65 80 L135 80" strokeWidth={STROKE_INNER} stroke={COLOR_LINE} />
          <circle cx="100" cy="95" r="10" fill={colors.glow} stroke="none" filter={`url(#glow-${instanceId})`} opacity="0.8" />
        </g>,
        // B3: Slim Agile
        <g key="b3">
          <path d="M80 65 L120 65 L115 120 L85 120 Z" fill={fillPri} strokeWidth={STROKE_OUTER} />
          <path d="M80 65 L85 120 M120 65 L115 120" strokeWidth={STROKE_INNER} stroke="white" opacity="0.2" />
        </g>,
        // B4: Orb Core
        <g key="b4">
          <circle cx="100" cy="90" r="30" fill={fillPri} strokeWidth={STROKE_OUTER} />
          <circle cx="100" cy="90" r="15" fill={colors.glow} stroke="none" filter={`url(#glow-${instanceId})`} />
          <path d="M70 90 L130 90" strokeWidth={STROKE_INNER} stroke={COLOR_LINE} opacity="0.5" />
        </g>,
        // B5: Wide Tank
        <g key="b5">
          <path d="M60 70 L140 70 L135 110 L65 110 Z" fill={fillPri} strokeWidth={STROKE_OUTER} />
          <rect x="70" y="80" width="10" height="20" fill="#333" stroke="none" rx="2" />
          <rect x="120" y="80" width="10" height="20" fill="#333" stroke="none" rx="2" />
        </g>,
      ],
      arm: [
        // A1: Blocky Arm
        <g key="a1">
          <path d="M-10 0 L30 0 L25 50 L-5 50 Z" fill={fillSec} strokeWidth={STROKE_OUTER} />
          <rect x="-5" y="10" width="25" height="5" fill="#111" opacity="0.3" stroke="none" />
        </g>,
        // A2: Piston Arm
        <g key="a2">
          <rect x="0" y="0" width="20" height="25" fill={fillSec} strokeWidth={STROKE_OUTER} rx="2" />
          <rect x="5" y="25" width="10" height="20" fill="#555" stroke="none" />
          <rect x="-5" y="45" width="30" height="30" fill={fillSec} strokeWidth={STROKE_OUTER} rx="2" />
        </g>,
        // A3: Shielded Arm
        <g key="a3">
          <path d="M-5 0 L25 0 L30 30 L20 60 L0 60 L-10 30 Z" fill={fillSec} strokeWidth={STROKE_OUTER} />
          <path d="M-10 30 L30 30" strokeWidth={STROKE_INNER} stroke={COLOR_LINE} />
        </g>,
        // A4: Claw Arm
        <g key="a4">
          <rect x="0" y="0" width="20" height="50" fill={fillSec} strokeWidth={STROKE_OUTER} />
          <path d="M0 50 L20 50 L25 70 L-5 70 Z" fill="#333" stroke="none" />
          <path d="M5 70 L10 85 L15 70" fill={colors.accent} stroke="none" />
        </g>,
      ],
      leg: [
        // L1: Standard Mech Leg
        <g key="l1">
          <path d="M-5 0 L25 0 L20 40 L30 80 L-10 80 L0 40 Z" fill={fillPri} strokeWidth={STROKE_OUTER} />
          <path d="M0 40 L20 40" strokeWidth={STROKE_INNER} stroke={COLOR_LINE} />
          <rect x="5" y="50" width="10" height="20" fill="#222" opacity="0.3" stroke="none" />
        </g>,
        // L2: Reverse Joint
        <g key="l2">
          <path d="M0 0 L20 0 L25 30 L5 30 Z" fill={fillPri} strokeWidth={STROKE_OUTER} />
          <path d="M5 30 L-5 50 L5 80 L25 80 L15 50 L25 30" fill={fillPri} strokeWidth={STROKE_OUTER} />
          <circle cx="10" cy="30" r="4" fill="#333" stroke="none" />
        </g>,
        // L3: Heavy Block
        <g key="l3">
          <rect x="-5" y="0" width="30" height="80" fill={fillPri} strokeWidth={STROKE_OUTER} rx="2" />
          <rect x="-5" y="60" width="30" height="20" fill="#222" stroke="none" opacity="0.2" />
        </g>,
        // L4: Hover (no foot)
        <g key="l4">
          <path d="M0 0 L20 0 L15 60 L5 60 Z" fill={fillPri} strokeWidth={STROKE_OUTER} />
          <ellipse cx="10" cy="70" rx="15" ry="5" fill={colors.glow} filter={`url(#glow-${instanceId})`} stroke="none" />
        </g>,
      ],
      backpack: [
        // BP1: Standard Vents
        <g key="bp1">
          <rect x="20" y="30" width="15" height="40" fill="#444" stroke="none" />
          <rect x="165" y="30" width="15" height="40" fill="#444" stroke="none" />
        </g>,
        // BP2: Wings
        <g key="bp2">
          <path d="M50 50 L-10 20 L0 80 L50 60 Z" fill={fillSec} strokeWidth="1" stroke="black" opacity="0.8" />
          <path d="M150 50 L210 20 L200 80 L150 60 Z" fill={fillSec} strokeWidth="1" stroke="black" opacity="0.8" />
        </g>,
        // BP3: Heavy Pack
        <g key="bp3">
          <rect x="40" y="20" width="120" height="60" fill="#333" strokeWidth="2" stroke="black" rx="5" />
          <circle cx="100" cy="50" r="15" fill={colors.glow} opacity="0.5" stroke="none" />
        </g>
      ]
    };
  }, [colors, instanceId]);

  const getShape = (type: keyof typeof shapes, id: number) => {
    const list = shapes[type];
    // Default to first shape if list happens to be empty (though it won't be)
    return list[(id - 1) % list.length] || list[0];
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Robot Visual"
    >
      <Defs instanceId={instanceId} colors={colors} />

      {/* Styles for animations */}
      <style>{`
          @keyframes hover-${instanceId} {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
          @keyframes pulse-${instanceId} {
             0%, 100% { opacity: 0.8; }
             50% { opacity: 1; filter: brightness(1.2); }
          }
          .mech-anim-${instanceId} {
            animation: ${animate ? `hover-${instanceId} 4s ease-in-out infinite` : 'none'};
          }
      `}</style>

      {/* Main Group with Hover Animation */}
      <g className={`mech-anim-${instanceId}`}>

        {/* Backpack Layer (Back) - Always visible, wider stance */}
        <g>
          {getShape('backpack', parts.backpack)}
        </g>

        {/* Legs Layer - Longer, attached lower */}
        <g transform="translate(65, 120)">
          {getShape('leg', parts.legLeft)}
        </g>
        <g transform="translate(135, 120) scale(-1, 1)">
          {getShape('leg', parts.legRight)}
        </g>

        {/* Arms Layer - Wider shoulders */}
        <g transform="translate(35, 65)">
          {getShape('arm', parts.armLeft)}
        </g>
        <g transform="translate(165, 65) scale(-1, 1)">
          {getShape('arm', parts.armRight)}
        </g>

        {/* Body Layer - Central */}
        <g>
          {getShape('body', parts.body)}
        </g>

        {/* Head Layer - Smaller, positioned higher */}
        <g transform="translate(0, 0)">
          {getShape('head', parts.head)}
        </g>

        {/* Weapon - If present or default */}
        <g transform="translate(170, 70) rotate(-10)">
          <rect x="0" y="-10" width="10" height="60" rx="1" fill="#222" stroke="none" />
          <rect x="-5" y="40" width="20" height="10" rx="1" fill="#444" stroke="none" />
          <rect x="2" y="-15" width="6" height="40" fill="#666" stroke="none" />
          <circle cx="5" cy="-15" r="3" fill={colors.glow} filter={`url(#glow-${instanceId})`} stroke="none" />
        </g>
      </g>

      {/* Overlay: Scanlines or sheen for 'Real' feel */}
      <rect x="0" y="0" width="200" height="200" fill={`url(#sheen-${instanceId})`} pointerEvents="none" style={{ mixBlendMode: 'overlay' }} />

    </svg>
  );
}
