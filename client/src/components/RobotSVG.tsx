import { useMemo } from "react";
import { getMotif, getRarityTier, getRobotSeed, type Motif, type RarityTier, type RobotPartsSeed } from "@/lib/rarity";

type RobotParts = RobotPartsSeed;

interface RobotColors {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
}

export type RobotVariant = "idle" | "scan" | "evolve" | "battle";

interface RobotFx {
  variant: RobotVariant;
  nonce: number;
}

interface RobotSVGProps {
  parts: RobotParts;
  colors: RobotColors;
  size?: number;
  className?: string;
  animate?: boolean;
  decals?: string[];
  showGlow?: boolean;
  variant?: RobotVariant;
  fx?: RobotFx;
}

const pickFromPalette = (palette: string[], seed: number, salt = 0) => {
  const safeSeed = Number.isFinite(seed) ? seed : 0;
  return palette[(Math.abs(safeSeed) + salt) % palette.length];
};

export default function RobotSVG({
  parts,
  colors,
  size = 200,
  className,
  animate = true,
  decals = [],
  showGlow = false,
  variant = "idle",
  fx
}: RobotSVGProps) {

  // Use fx.variant/nonce if available
  const activeVariant = fx ? fx.variant : variant;
  const activeNonce = fx ? fx.nonce : 0;

  // Generate a deterministic seed from parts for style consistencies
  const seed = useMemo(() => getRobotSeed(parts), [parts]);
  const tier = useMemo<RarityTier>(() => getRarityTier(seed), [seed]);
  const motif = useMemo<Motif>(() => getMotif(seed), [seed]);

  // Stable ID for gradients/filters
  const instanceId = useMemo(() => `mech-${seed}`, [seed]);

  const colorTokens = useMemo(() => {
    const mainColor = "#E6E8EC";
    const subColor = "#2B2F36";
    const sensorPalette = ["#4DFFB3", "#46C7FF"];
    const massAccentPalette = ["#6E7C4A", "#8C7A3C", "#2F3A56", "#4B6B66"];
    const aceAccentPalette = ["#E53935", "#8E2BFF"];
    const accentColor = tier === "B_ACE"
      ? pickFromPalette(aceAccentPalette, seed, 23)
      : pickFromPalette(massAccentPalette, seed, 23);
    const sensorColor = pickFromPalette(sensorPalette, seed, 11);
    const highlightColor = "#F5D24B";
    return { mainColor, subColor, accentColor, sensorColor, highlightColor };
  }, [seed, tier]);

  const { mainColor, subColor, accentColor, sensorColor, highlightColor } = colorTokens;

  // Use sensor glow for all glow effects to unify the MS sensor feel
  const activeGlow = sensorColor;

  // --- Constants (User Requirements) ---
  const STROKE_OUTER = 2;
  const STROKE_PANEL = 1;
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
      className={`glow-sensor variant-${activeVariant}`}
    />
  );

  // B. Thruster (Backpack) - 2 nozzles
  const Thrusters = () => (
    <g className={`glow-thruster variant-${activeVariant}`}>
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
      className={`glow-slit variant-${activeVariant}`}
    />
  );

  // --- Shape Generators ---

  // Update shapes to include glow parts
  const Head = () => {
    // Proportions: Head -12% -> ~32x35
    const variants = [
      // H1: Command (Angular) + Eye
      <g key="h1">
        <MechPart d="M85 30 L115 30 L120 45 L112 62 L88 62 L80 45 Z" fillColor={mainColor}>
          <path d="M85 38 L115 38" />
        </MechPart>
        <SensorEye cx={100} cy={48} />
      </g>,
      // H2: Scout (Sensor Dome) + Eye
      <g key="h2">
        <MechPart d="M88 60 L112 60 L112 40 C112 32 100 28 88 40 Z" fillColor={mainColor}>
          <path d="M88 50 L112 50" />
        </MechPart>
        <SensorEye cx={106} cy={40} />
      </g>,
      // H3: Assault (Visor) + Eye (Visor glow)
      <g key="h3">
        <MechPart d="M85 28 L115 28 L118 58 L82 58 Z" fillColor={subColor}>
          {/* Visor Area */}
        </MechPart>
        <rect x="85" y="42" width="30" height="4" fill={activeGlow} fillOpacity="0.5" filter={`url(#${instanceId}-glow)`} className={`glow-sensor variant-${activeVariant}`} />
      </g>,
      // H4: Support + Eye
      <g key="h4">
        <MechPart d="M90 30 L110 30 L110 60 L90 60 Z" fillColor={mainColor}>
          <path d="M110 30 L125 10 L122 10 L110 35" strokeWidth={2} stroke={accentColor} opacity="1" />
          <rect x="92" y="38" width="16" height="12" fill={subColor} stroke="none" />
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
        <MechPart d="M75 65 L125 65 L120 115 L80 115 Z" fillColor={mainColor} texture>
          <path d="M75 75 L125 75" />
          <path d="M90 115 L90 95 L110 95 L110 115" />
        </MechPart>
        <EnergySlit x={85} y={80} width={30} />
      </g>,
      // B2: Heavy Plate + Slit
      <g key="b2">
        <MechPart d="M70 65 L130 65 L130 90 L120 120 L80 120 L70 90 Z" fillColor={subColor} texture>
          <path d="M70 90 L130 90" />
          <rect x="95" y="100" width="10" height="15" fill={subColor} stroke="none" />
        </MechPart>
        <EnergySlit x={75} y={75} width={15} rotate={-10} />
        <EnergySlit x={110} y={75} width={15} rotate={10} />
      </g>,
      // B3: Orb Core + Slit
      <g key="b3">
        <MechPart d="M70 90 L130 90 L120 120 L80 120 Z" fillColor={mainColor} stroke="none" />
        <circle cx="100" cy="90" r="16" fill={subColor} />
        <circle cx="100" cy="90" r="8" fill={activeGlow} className={`glow-sensor variant-${activeVariant}`} filter={`url(#${instanceId}-glow)`} />
        <MechPart d="M70 65 L130 65 L130 75 L70 75 Z" fillColor={mainColor} />
      </g>
    ];
    return variants[(parts.body - 1) % variants.length] || variants[0];
  };

  const Arms = () => {
    const shape = (() => {
      const idx = (parts.armLeft - 1) % 4;
      if (idx === 0) return ( // Blocky
        <MechPart d="M0 0 L25 0 L22 35 L25 65 L0 65 L-5 35 Z" fillColor={subColor}>
          <rect x="0" y="10" width="20" height="5" fill={accentColor} stroke="none" opacity="0.8" />
        </MechPart>
      );
      if (idx === 1) return ( // Piston
        <g>
          <MechPart d="M0 0 L20 0 L20 20 L0 20 Z" fillColor={subColor} />
          <rect x="5" y="20" width="10" height="20" fill={subColor} />
          <MechPart d="M-5 40 L25 40 L20 70 L0 70 Z" fillColor={subColor} />
        </g>
      );
      if (idx === 2) return ( // Shielded
        <MechPart d="M-5 0 L30 0 L35 25 L20 65 L0 65 L-10 25 Z" fillColor={subColor}>
          <path d="M-10 25 L35 25" />
        </MechPart>
      );
      return ( // Claw
        <MechPart d="M0 0 L20 0 L20 45 L25 65 L-5 65 L0 45 Z" fillColor={subColor}>
          <path d="M5 65 L10 80 L15 65" fill={accentColor} stroke="none" />
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
        <MechPart d="M0 0 L25 0 L20 40 L30 90 L-5 90 L0 40 Z" fillColor={mainColor}>
          <path d="M0 40 L25 40" />
          <rect x="5" y="50" width="15" height="30" fill={subColor} opacity="0.2" stroke="none" />
        </MechPart>
      );
      if (idx === 1) return ( // Reverse Joint
        <MechPart d="M0 0 L20 0 L28 40 L35 20 L40 50 L25 90 L-5 90 L0 40 Z" fillColor={mainColor}>
          <circle cx="28" cy="40" r="5" fill={subColor} stroke="none" />
        </MechPart>
      );
      if (idx === 2) return ( // Heavy
        <MechPart d="M-5 0 L30 0 L30 90 L-5 90 Z" fillColor={mainColor}>
          <path d="M-5 60 L30 60" />
        </MechPart>
      );
      return ( // Hover
        <MechPart d="M0 0 L20 0 L15 70 L5 70 Z" fillColor={mainColor}>
          {/* Hover Glow */}
          <ellipse cx="10" cy="80" rx="15" ry="4" fill={activeGlow} stroke="none" filter={`url(#${instanceId}-glow)`} className={`variant-${activeVariant}`} />
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
      <MechPart d="M20 20 L60 20 L65 70 L15 70 Z" fillColor={subColor}>
        <rect x="30" y="30" width="20" height="30" fill={subColor} stroke="none" />
      </MechPart>,
      <MechPart d="M20 30 L60 20 L70 60 L10 60 Z" fillColor={subColor}>
        <circle cx="40" cy="40" r="10" fill={subColor} stroke="none" />
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
          <MechPart d="M-5 0 L15 0 L15 60 L-5 60 Z" fillColor={subColor} />
          <rect x="0" y="-20" width="5" height="30" fill={subColor} strokeWidth="1" stroke="black" />
          <circle cx="5" cy="-20" r="3" fill={activeGlow} stroke="none" filter={`url(#${instanceId}-glow)`} />
        </g>
      );
    } else {
      // Blade
      return (
        <g transform="translate(175, 80) rotate(-15)">
          <MechPart d="M0 0 L10 0 L10 20 L0 20 Z" fillColor={subColor} />
          <path d="M2 20 L8 20 L5 80 Z" fill={activeGlow} stroke={accentColor} strokeWidth="1" filter={`url(#${instanceId}-glow)`} className={`variant-${activeVariant}`} />
        </g>
      );
    }
  };

  const markOnLeft = (Math.abs(seed) + 7) % 2 === 0;
  const antennaBaseY = 30;
  const antennaWidth = tier === "B_ACE" ? 34 : 22;
  const antennaHeight = tier === "B_ACE" ? 14 : 8;
  const antennaStroke = tier === "B_ACE" ? 2.4 : 1.6;
  const ventWidth = tier === "B_ACE" ? 26 : 20;
  const ventX = 100 - ventWidth / 2;
  const plateWidth = tier === "B_ACE" ? 20 : 16;
  const plateHeight = 12;
  const plateGap = 4;
  const plateTopY = 112;
  const plateInset = tier === "B_ACE" ? 4 : 3;
  const markX = markOnLeft ? 38 : 146;

  const leftPlatePath = `M${100 - plateGap / 2 - plateWidth} ${plateTopY} L${100 - plateGap / 2} ${plateTopY} L${100 - plateGap / 2 - plateInset} ${plateTopY + plateHeight} L${100 - plateGap / 2 - plateWidth + plateInset} ${plateTopY + plateHeight} Z`;
  const rightPlatePath = `M${100 + plateGap / 2} ${plateTopY} L${100 + plateGap / 2 + plateWidth} ${plateTopY} L${100 + plateGap / 2 + plateWidth - plateInset} ${plateTopY + plateHeight} L${100 + plateGap / 2 + plateInset} ${plateTopY + plateHeight} Z`;

  const monoEyeOffset = ((Math.abs(seed) + 13) % 3) - 1;
  const monoEyeX = 100 + monoEyeOffset * 4;
  const shieldTransform = markOnLeft ? undefined : "translate(200,0) scale(-1,1)";

  const msOverlay = (
    <g id="msOverlay">
      <g id="ms-antenna">
        <path
          d={`M100 ${antennaBaseY} L${100 - antennaWidth / 2} ${antennaBaseY - antennaHeight}`}
          stroke={accentColor}
          strokeWidth={antennaStroke}
          strokeLinecap="square"
        />
        <path
          d={`M100 ${antennaBaseY} L${100 + antennaWidth / 2} ${antennaBaseY - antennaHeight}`}
          stroke={accentColor}
          strokeWidth={antennaStroke}
          strokeLinecap="square"
        />
        <rect x="94" y={antennaBaseY - 2} width="12" height="3" fill={subColor} />
        {tier === "B_ACE" && (
          <rect x="96" y={antennaBaseY - antennaHeight - 4} width="8" height="4" fill={highlightColor} opacity="0.8" />
        )}
      </g>

      <g id="ms-ducts">
        <rect x={ventX} y="88" width={ventWidth} height="2" fill={subColor} opacity="0.9" />
        <rect x={ventX - 2} y="92" width={ventWidth + 4} height="2" fill={subColor} opacity="0.8" />
        <rect x={ventX} y="96" width={ventWidth} height="2" fill={subColor} opacity="0.7" />
      </g>

      <g id="ms-waist">
        <path d={leftPlatePath} fill={mainColor} stroke={COLOR_OUTLINE} strokeWidth={STROKE_PANEL} />
        <path d={rightPlatePath} fill={mainColor} stroke={COLOR_OUTLINE} strokeWidth={STROKE_PANEL} />
      </g>

      <g id="ms-mark">
        <rect x={markX} y="74" width="16" height="6" fill="none" stroke={accentColor} strokeWidth="1" opacity="0.8" />
        <rect x={markX + 2} y="76" width="6" height="2" fill={accentColor} opacity="0.8" />
      </g>

      {tier === "B_ACE" && (
        <g id="ms-ace-extra">
          <path d="M18 66 L52 66 L62 90 L50 112 L18 112 Z" fill={subColor} stroke={COLOR_OUTLINE} strokeWidth={STROKE_PANEL} />
          <path d="M148 66 L182 66 L192 90 L180 112 L148 112 Z" fill={subColor} stroke={COLOR_OUTLINE} strokeWidth={STROKE_PANEL} />
          <g id="ace-pack">
            <rect x="78" y="44" width="44" height="16" fill={subColor} stroke={COLOR_OUTLINE} strokeWidth={STROKE_PANEL} />
            <circle cx="78" cy="52" r="6" fill={subColor} stroke={COLOR_OUTLINE} strokeWidth={STROKE_PANEL} />
            <circle cx="122" cy="52" r="6" fill={subColor} stroke={COLOR_OUTLINE} strokeWidth={STROKE_PANEL} />
            <circle cx="78" cy="52" r="2.5" fill={activeGlow} filter={`url(#${instanceId}-glow)`} />
            <circle cx="122" cy="52" r="2.5" fill={activeGlow} filter={`url(#${instanceId}-glow)`} />
          </g>
          <circle cx="100" cy="98" r="2.5" fill={highlightColor} opacity="0.85" />
          <circle cx={markOnLeft ? 54 : 146} cy="86" r="2" fill={activeGlow} filter={`url(#${instanceId}-glow)`} />
        </g>
      )}
    </g>
  );

  const motifOverlay = (
    <g id="motifOverlay">
      {motif === "ZAKU" ? (
        <g id="motif-zaku">
          <rect x="86" y="46" width="28" height="4" rx="2" fill={subColor} opacity="0.85" />
          <circle cx={monoEyeX} cy="48" r={tier === "B_ACE" ? 4 : 3} fill={activeGlow} filter={`url(#${instanceId}-glow)`} />
          <g transform={shieldTransform}>
            <path
              d={tier === "B_ACE" ? "M16 68 L50 68 L62 96 L50 122 L16 122 Z" : "M18 72 L46 72 L56 96 L46 116 L18 116 Z"}
              fill={subColor}
              stroke={COLOR_OUTLINE}
              strokeWidth={STROKE_PANEL}
            />
            {tier === "B_ACE" && (
              <path d="M44 68 L56 62 L58 70 Z" fill={accentColor} opacity="0.8" />
            )}
          </g>
        </g>
      ) : (
        <g id="motif-eva">
          <path
            d="M78 86 C90 96 110 96 122 86"
            stroke={accentColor}
            strokeWidth={tier === "B_ACE" ? 1.6 : 1.1}
            opacity="0.7"
            fill="none"
            strokeLinecap="round"
          />
          {tier === "B_ACE" && (
            <path
              d="M76 94 C90 106 110 106 124 94"
              stroke={accentColor}
              strokeWidth="1.4"
              opacity="0.55"
              fill="none"
              strokeLinecap="round"
            />
          )}
          <circle cx="100" cy="94" r={tier === "B_ACE" ? 6 : 4} fill="none" stroke={accentColor} strokeWidth={tier === "B_ACE" ? 1.4 : 1} />
          <circle cx="100" cy="94" r={tier === "B_ACE" ? 3 : 2} fill={tier === "B_ACE" ? highlightColor : accentColor} opacity={tier === "B_ACE" ? 0.85 : 0.7} />
          {tier === "B_ACE" && (
            <>
              <path d="M96 28 L90 16" stroke={accentColor} strokeWidth="1.4" strokeLinecap="round" />
              <path d="M104 28 L110 16" stroke={accentColor} strokeWidth="1.4" strokeLinecap="round" />
              <circle cx="54" cy="106" r="2.2" fill={highlightColor} opacity="0.5" />
              <circle cx="146" cy="106" r="2.2" fill={highlightColor} opacity="0.5" />
              <circle cx="84" cy="158" r="2.2" fill={highlightColor} opacity="0.45" />
              <circle cx="116" cy="158" r="2.2" fill={highlightColor} opacity="0.45" />
            </>
          )}
        </g>
      )}
    </g>
  );


  return (
    <svg
      key={`${activeVariant}-${activeNonce}`}
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
          
          /* Active Variants (Pulse/Boost) */
          @keyframes high-alert-pulse-${instanceId} {
             0% { opacity: 0.4; }
             50% { opacity: 1; }
             100% { opacity: 0.4; }
          }
          @keyframes thruster-boost-${instanceId} {
             0% { transform: scaleY(1.0); opacity: 0.8; }
             50% { transform: scaleY(1.3); opacity: 1; }
             100% { transform: scaleY(1.0); opacity: 0.8; }
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
          .variant-scan .glow-sensor { opacity: 1; animation: high-alert-pulse-${instanceId} 0.2s infinite; }
          .variant-scan .glow-slit { opacity: 0.6; }
          
          .variant-battle .glow-sensor { opacity: 0.9; }
          .variant-battle .glow-thruster { opacity: 1; filter: brightness(1.3); }
          .variant-battle .thruster-anim { animation: ${animate ? `thruster-boost-${instanceId} 0.6s ease-out` : 'none'}; }
          
          .variant-evolve .glow-sensor { opacity: 0; animation: high-alert-pulse-${instanceId} 0.3s infinite; }
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

      <g id="msShadow" opacity="0.12">
        <path d="M110 72 L150 72 L165 130 L150 176 L110 176 Z" fill="#000" />
      </g>

      {msOverlay}
      {motifOverlay}

      {/* Decals Overlay */}
      {decals.includes('hazard') && (
        <path d="M100 80 L110 80 L105 90 Z" fill={accentColor} opacity="0.6" style={{ mixBlendMode: 'multiply' }} />
      )}

    </svg>
  );
}
