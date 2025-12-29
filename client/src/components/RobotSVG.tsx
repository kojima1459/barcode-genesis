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

export type RobotVariant = "idle" | "scan" | "evolve" | "battle";

interface RobotSVGProps {
  parts: RobotParts;
  colors: RobotColors;
  size?: number;
  className?: string;
  animate?: boolean;
  decals?: string[];
  showGlow?: boolean;
  variant?: RobotVariant;
}

// Deterministic random generator based on parts
const getPseudoRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

export default function RobotSVG({
  parts,
  colors,
  size = 200,
  className,
  animate = true,
  decals = [],
  showGlow = false,
  variant = "idle"
}: RobotSVGProps) {

  // Generate a deterministic seed from parts for style consistencies
  const seed = useMemo(() => {
    return Object.values(parts).reduce((acc, val) => acc + val, 0);
  }, [parts]);

  // Stable ID for gradients/filters
  const instanceId = useMemo(() => `mech-${seed}`, [seed]);

  // Derived Glow Color (Cyan / Red / Yellow)
  const derivedGlow = useMemo(() => {
    const GLOW_PALETTE = ["#00f3ff", "#ff2a2a", "#ffcc00"];
    const idx = Math.floor(getPseudoRandom(seed) * GLOW_PALETTE.length);
    return GLOW_PALETTE[idx];
  }, [seed]);

  // Use the derived glow for all glow effects
  const activeGlow = derivedGlow;

  // --- Constants (User Requirements) ---
  const STROKE_OUTER = 3.2;
  const STROKE_PANEL = 1.2;
  const OP_PANEL = 0.22;
  const OP_SHADOW = 0.20;
  const OP_RIM = 0.35;
  const COLOR_OUTLINE = "#1a1a1a";

  // --- Graphic Helpers ---

  // Gradient Definitions
  const Defs = () => (
    <defs>
      {/* Main Metal Gradient: 3D feel with -35deg light source approx */}
      <linearGradient id={`${instanceId}-metal-pri`} x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity="0.3" />
        <stop offset="40%" stopColor="white" stopOpacity="0" />
        <stop offset="100%" stopColor="black" stopOpacity="0.4" />
      </linearGradient>

      <linearGradient id={`${instanceId}-metal-sec`} x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity="0.4" />
        <stop offset="50%" stopColor="white" stopOpacity="0" />
        <stop offset="100%" stopColor="black" stopOpacity="0.5" />
      </linearGradient>

      {/* Rim Light Gradient */}
      <linearGradient id={`${instanceId}-rim`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity={OP_RIM} />
        <stop offset="20%" stopColor="white" stopOpacity="0" />
        <stop offset="100%" stopColor="black" stopOpacity={OP_SHADOW} />
      </linearGradient>

      {/* Thruster Gradient */}
      <linearGradient id={`${instanceId}-thruster`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity="0.8" />
        <stop offset="30%" stopColor={activeGlow} stopOpacity="0.6" />
        <stop offset="100%" stopColor={activeGlow} stopOpacity="0" />
      </linearGradient>

      {/* Scanline / Texture Overlay */}
      <pattern id={`${instanceId}-grid`} width="4" height="4" patternUnits="userSpaceOnUse">
        <path d="M 4 0 L 0 0 0 4" fill="none" stroke="black" strokeWidth="0.5" opacity="0.1" />
      </pattern>

      <filter id={`${instanceId}-glow`} width="200%" height="200%" x="-50%" y="-50%">
        <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
        <feMerge>
          <feMergeNode in="coloredBlur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );

  // Layering Component: Fill -> Shade -> Rim -> Outline -> Texture -> Details
  const MechPart = ({
    d,
    fillColor,
    texture = false,
    children
  }: {
    d: string,
    fillColor: string,
    texture?: boolean,
    children?: React.ReactNode
  }) => (
    <g>
      {/* Base Fill */}
      <path d={d} fill={fillColor} stroke="none" />

      {/* Metal Gradient Overlay */}
      <path d={d} fill={`url(#${instanceId}-metal-pri)`} stroke="none" style={{ mixBlendMode: "overlay" }} />

      {/* Rim/Shadow Overlay */}
      <path d={d} fill={`url(#${instanceId}-rim)`} stroke="none" />

      {/* Texture Overlay (optional) */}
      {texture && <path d={d} fill={`url(#${instanceId}-grid)`} stroke="none" />}

      {/* Outline */}
      <path
        d={d}
        fill="none"
        stroke={COLOR_OUTLINE}
        strokeWidth={STROKE_OUTER}
        strokeLinejoin="miter"
        strokeLinecap="square"
      />

      {/* Panel Lines & Details (Passed as children) */}
      <g stroke="black" strokeWidth={STROKE_PANEL} strokeOpacity={OP_PANEL} fill="none">
        {children}
      </g>
    </g>
  );

  // --- Glow Parts ---

  // A. Sensor Eye (Head)
  const SensorEye = ({ cx, cy }: { cx: number, cy: number }) => (
    <circle
      cx={cx} cy={cy} r="3.5"
      fill={activeGlow}
      stroke="none"
      filter={`url(#${instanceId}-glow)`}
      className={`glow-sensor variant-${variant}`}
    />
  );

  // B. Thruster (Backpack) - 2 nozzles
  const Thrusters = () => (
    <g className={`glow-thruster variant-${variant}`}>
      {/* Left Nozzle */}
      <g transform="translate(45, 80)">
        <path d="M0 0 L15 0 L10 25 L5 25 Z" fill={`url(#${instanceId}-thruster)`} stroke="none" style={{ transformOrigin: "top center" }} className="thruster-anim" />
      </g>
      {/* Right Nozzle */}
      <g transform="translate(140, 80)">
        <path d="M0 0 L15 0 L10 25 L5 25 Z" fill={`url(#${instanceId}-thruster)`} stroke="none" style={{ transformOrigin: "top center" }} className="thruster-anim" />
      </g>
    </g>
  );

  // C. Energy Slit (Body)
  const EnergySlit = ({ x, y, width, rotate = 0 }: { x: number, y: number, width: number, rotate?: number }) => (
    <rect
      x={x} y={y} width={width} height="1.5"
      fill={activeGlow}
      stroke="none"
      transform={`rotate(${rotate} ${x + width / 2} ${y})`}
      className={`glow-slit variant-${variant}`}
    />
  );

  // --- Shape Generators ---

  // Update shapes to include glow parts
  const Head = () => {
    // Proportions: Head -12% -> ~32x35
    const variants = [
      // H1: Command (Angular) + Eye
      <g key="h1">
        <MechPart d="M85 30 L115 30 L120 45 L112 62 L88 62 L80 45 Z" fillColor={colors.primary}>
          <path d="M85 38 L115 38" />
        </MechPart>
        <SensorEye cx={100} cy={48} />
      </g>,
      // H2: Scout (Sensor Dome) + Eye
      <g key="h2">
        <MechPart d="M88 60 L112 60 L112 40 C112 32 100 28 88 40 Z" fillColor={colors.primary}>
          <path d="M88 50 L112 50" />
        </MechPart>
        <SensorEye cx={106} cy={40} />
      </g>,
      // H3: Assault (Visor) + Eye (Visor glow)
      <g key="h3">
        <MechPart d="M85 28 L115 28 L118 58 L82 58 Z" fillColor={colors.secondary}>
          {/* Visor Area */}
        </MechPart>
        <rect x="85" y="42" width="30" height="4" fill={activeGlow} fillOpacity="0.5" filter={`url(#${instanceId}-glow)`} className={`glow-sensor variant-${variant}`} />
      </g>,
      // H4: Support + Eye
      <g key="h4">
        <MechPart d="M90 30 L110 30 L110 60 L90 60 Z" fillColor={colors.primary}>
          <path d="M110 30 L125 10 L122 10 L110 35" strokeWidth={2} stroke={colors.accent} opacity="1" />
          <rect x="92" y="38" width="16" height="12" fill="#222" stroke="none" />
        </MechPart>
        <SensorEye cx={100} cy={44} />
      </g>
    ];
    return variants[(parts.head - 1) % variants.length] || variants[0];
  };

  const Body = () => {
    const variants = [
      // B1: Standard Core + Slit
      <g key="b1">
        <MechPart d="M75 65 L125 65 L120 115 L80 115 Z" fillColor={colors.primary} texture>
          <path d="M75 75 L125 75" />
          <path d="M90 115 L90 95 L110 95 L110 115" />
        </MechPart>
        <EnergySlit x={85} y={80} width={30} />
      </g>,
      // B2: Heavy Plate + Slit
      <g key="b2">
        <MechPart d="M70 65 L130 65 L130 90 L120 120 L80 120 L70 90 Z" fillColor={colors.secondary} texture>
          <path d="M70 90 L130 90" />
          <rect x="95" y="100" width="10" height="15" fill="#333" stroke="none" />
        </MechPart>
        <EnergySlit x={75} y={75} width={15} rotate={-10} />
        <EnergySlit x={110} y={75} width={15} rotate={10} />
      </g>,
      // B3: Orb Core + Slit
      <g key="b3">
        <MechPart d="M70 90 L130 90 L120 120 L80 120 Z" fillColor={colors.primary} stroke="none" />
        <circle cx="100" cy="90" r="16" fill="#111" />
        <circle cx="100" cy="90" r="8" fill={activeGlow} className={`glow-sensor variant-${variant}`} filter={`url(#${instanceId}-glow)`} />
        <MechPart d="M70 65 L130 65 L130 75 L70 75 Z" fillColor={colors.primary} />
      </g>
    ];
    return variants[(parts.body - 1) % variants.length] || variants[0];
  };

  const Arms = () => {
    const shape = (() => {
      const idx = (parts.armLeft - 1) % 4;
      if (idx === 0) return ( // Blocky
        <MechPart d="M0 0 L25 0 L22 35 L25 65 L0 65 L-5 35 Z" fillColor={colors.secondary}>
          <rect x="0" y="10" width="20" height="5" fill={colors.accent} stroke="none" opacity="0.8" />
        </MechPart>
      );
      if (idx === 1) return ( // Piston
        <g>
          <MechPart d="M0 0 L20 0 L20 20 L0 20 Z" fillColor={colors.secondary} />
          <rect x="5" y="20" width="10" height="20" fill="#444" />
          <MechPart d="M-5 40 L25 40 L20 70 L0 70 Z" fillColor={colors.secondary} />
        </g>
      );
      if (idx === 2) return ( // Shielded
        <MechPart d="M-5 0 L30 0 L35 25 L20 65 L0 65 L-10 25 Z" fillColor={colors.secondary}>
          <path d="M-10 25 L35 25" />
        </MechPart>
      );
      return ( // Claw
        <MechPart d="M0 0 L20 0 L20 45 L25 65 L-5 65 L0 45 Z" fillColor={colors.secondary}>
          <path d="M5 65 L10 80 L15 65" fill={colors.accent} stroke="none" />
        </MechPart>
      );
    })();

    return (
      <>
        <g transform="translate(30, 65)">{shape}</g>
        <g transform="translate(170, 65) scale(-1, 1)">{shape}</g>
      </>
    );
  };

  const Legs = () => {
    const shape = (() => {
      const idx = (parts.legLeft - 1) % 4;
      if (idx === 0) return ( // Standard
        <MechPart d="M0 0 L25 0 L20 40 L30 90 L-5 90 L0 40 Z" fillColor={colors.primary}>
          <path d="M0 40 L25 40" />
          <rect x="5" y="50" width="15" height="30" fill="#222" opacity="0.2" stroke="none" />
        </MechPart>
      );
      if (idx === 1) return ( // Reverse Joint
        <MechPart d="M0 0 L20 0 L28 40 L35 20 L40 50 L25 90 L-5 90 L0 40 Z" fillColor={colors.primary}>
          <circle cx="28" cy="40" r="5" fill="#333" stroke="none" />
        </MechPart>
      );
      if (idx === 2) return ( // Heavy
        <MechPart d="M-5 0 L30 0 L30 90 L-5 90 Z" fillColor={colors.primary}>
          <path d="M-5 60 L30 60" />
        </MechPart>
      );
      return ( // Hover
        <MechPart d="M0 0 L20 0 L15 70 L5 70 Z" fillColor={colors.primary}>
          {/* Hover Glow */}
          <ellipse cx="10" cy="80" rx="15" ry="4" fill={activeGlow} stroke="none" filter={`url(#${instanceId}-glow)`} className={`variant-${variant}`} />
        </MechPart>
      );
    })();

    return (
      <>
        <g transform="translate(68, 115)">{shape}</g>
        <g transform="translate(132, 115) scale(-1, 1)">{shape}</g>
      </>
    );
  };

  const Backpack = () => {
    // Always drawn
    const variants = [
      <MechPart d="M20 20 L60 20 L65 70 L15 70 Z" fillColor="#444">
        <rect x="30" y="30" width="20" height="30" fill="#222" stroke="none" />
      </MechPart>,
      <MechPart d="M20 30 L60 20 L70 60 L10 60 Z" fillColor={colors.secondary}>
        <circle cx="40" cy="40" r="10" fill="#222" stroke="none" />
      </MechPart>
    ];
    const shape = variants[(parts.backpack - 1) % variants.length] || variants[0];

    return (
      <>
        <g transform="translate(0, 0)">{shape}</g>
        <g transform="translate(200, 0) scale(-1, 1)">{shape}</g>
      </>
    );
  };

  const Weapon = () => {
    const isRifle = parts.weapon % 2 === 0;

    if (isRifle) {
      return (
        <g transform="translate(175, 80) rotate(-10)">
          <MechPart d="M-5 0 L15 0 L15 60 L-5 60 Z" fillColor="#333" />
          <rect x="0" y="-20" width="5" height="30" fill="#555" strokeWidth="1" stroke="black" />
          <circle cx="5" cy="-20" r="3" fill={activeGlow} stroke="none" filter={`url(#${instanceId}-glow)`} />
        </g>
      );
    } else {
      // Blade
      return (
        <g transform="translate(175, 80) rotate(-15)">
          <MechPart d="M0 0 L10 0 L10 20 L0 20 Z" fillColor="#333" />
          <path d="M2 20 L8 20 L5 80 Z" fill={activeGlow} stroke={colors.accent} strokeWidth="1" filter={`url(#${instanceId}-glow)`} className={`variant-${variant}`} />
        </g>
      );
    }
  };


  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Mech Unit"
    >
      <Defs />

      {/* Animation Styles */}
      <style>{`
          /* Idle Animations */
          @keyframes hover-${instanceId} {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
          @keyframes thruster-breath-${instanceId} {
            0%, 100% { transform: scaleY(0.92); opacity: 0.6; }
            50% { transform: scaleY(1.05); opacity: 0.9; }
          }
          
          /* Active Variants (Pulse) */
          @keyframes high-alert-pulse-${instanceId} {
             0% { opacity: 0.4; }
             50% { opacity: 1; }
             100% { opacity: 0.4; }
          }

          /* Classes */
          .mech-anim-${instanceId} {
            animation: ${animate ? `hover-${instanceId} 4s ease-in-out infinite` : 'none'};
          }
          .thruster-anim {
             animation: ${animate ? `thruster-breath-${instanceId} 2.2s ease-in-out infinite` : 'none'};
          }
          
          /* Glow Elements Base States */
          .glow-sensor { opacity: 0.35; transition: opacity 0.3s; }
          .glow-thruster { opacity: 0.8; transition: opacity 0.3s; }
          .glow-slit { opacity: 0.22; transition: opacity 0.3s; }
          
          /* Variant Overrides */
          .variant-scan .glow-sensor { opacity: 1; animation: high-alert-pulse-${instanceId} 0.5s infinite; }
          .variant-scan .glow-slit { opacity: 0.6; }
          
          .variant-battle .glow-sensor { opacity: 0.9; }
          .variant-battle .glow-thruster { opacity: 1; filter: brightness(1.3); }
          .variant-battle .thruster-anim { animation-duration: 0.8s; }
          
          .variant-evolve .glow-sensor { opacity: 0; animation: high-alert-pulse-${instanceId} 2s infinite; }
          .variant-evolve .glow-thruster { opacity: 0.2; }
      `}</style>

      {/* Background Glow (Optional) */}
      {showGlow && (
        <radialGradient id={`${instanceId}-bg-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={activeGlow} stopOpacity="0.15" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      )}
      {showGlow && <circle cx="100" cy="100" r="90" fill={`url(#${instanceId}-bg-glow)`} />}

      {/* Render Order: Back -> Thrusters -> Legs -> Arms -> Body -> Head -> Weapon */}
      <g className={`mech-anim-${instanceId}`}>
        <Backpack />
        <Thrusters />
        <Legs />
        <Arms />
        <Body />
        <Head />
        <Weapon />
      </g>

      {/* Decals Overlay */}
      {decals.includes('hazard') && (
        <path d="M100 80 L110 80 L105 90 Z" fill={colors.accent} opacity="0.6" style={{ mixBlendMode: 'multiply' }} />
      )}

    </svg>
  );
}
