import { useMemo, memo } from "react";
import { getMotif, getRarityTier, getRobotSeed, type Motif, type RarityTier, type RobotPartsSeed } from "@/lib/rarity";
import type { RobotVisuals } from "@/types/shared";

type RobotParts = RobotPartsSeed;

interface RobotColors {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
}

export type RobotVariant = "idle" | "scan" | "evolve" | "battle" | "maintenance";

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
  /** Render as black silhouette with noise effect (for locked dex entries) */
  variantKey?: number; // Visual seed (0-99)
  isRareVariant?: boolean; // Rarity >= 3 trigger for Type B visuals
  silhouette?: boolean;
  visuals?: RobotVisuals;
  rarityEffect?: 'none' | 'rare' | 'legendary';
  simplified?: boolean;
  role?: string; // Phase B: Role for visual diversity
}

const pickFromPalette = (palette: string[], seed: number, salt = 0) => {
  const safeSeed = Number.isFinite(seed) ? seed : 0;
  return palette[(Math.abs(safeSeed) + salt) % palette.length];
};

function RobotSVGComponent({
  parts,
  colors,
  size = 160,
  className,
  animate = true,
  decals = [],
  showGlow = false,
  variant = "idle",
  fx,
  silhouette = false,
  variantKey = 0,
  isRareVariant = false,
  simplified = false,
  visuals,
  rarityEffect,
  role
}: RobotSVGProps) {
  // ===== HOOKS MUST BE CALLED FIRST (before any early returns) =====
  // Use fallback empty object if parts is invalid - actual check happens after hooks
  const safeParts = (parts && typeof parts === 'object') ? parts : {
    head: 1, face: 1, body: 1, armLeft: 1, armRight: 1, legLeft: 1, legRight: 1, backpack: 1, weapon: 1, accessory: 1
  };

  const isLite = simplified || size < 100;

  // Use fx.variant/nonce if available
  const activeVariant = fx ? fx.variant : variant;
  const activeNonce = fx ? fx.nonce : 0;

  const shouldAnimate = !isLite && animate;

  // Generate a deterministic seed from parts for style consistencies
  const seed = useMemo(() => getRobotSeed(safeParts), [safeParts]);
  const tier = useMemo<RarityTier>(() => getRarityTier(seed), [seed]);
  const motif = useMemo<Motif>(() => getMotif(seed), [seed]);

  // Stable ID for gradients/filters
  const instanceId = useMemo(() => `mech-${seed}-${variantKey}`, [seed, variantKey]);

  // Color Mapping: Use props.colors if valid, else fall back
  const colorTokens = useMemo(() => {
    if (colors && colors.primary) {
      return {
        mainColor: colors.primary,
        subColor: colors.secondary,
        accentColor: colors.accent,
        sensorColor: colors.glow,
        highlightColor: isRareVariant ? colors.glow : colors.accent,
      };
    }
    // Fallback legacy logic
    const mainColor = "#E6E8EC";
    const subColor = "#2B2F36";
    const sensorPalette = ["#4DFFB3", "#46C7FF"];
    const massAccentPalette = ["#6E7C4A", "#8C7A3C", "#2F3A56", "#4B6B66"];
    const aceAccentPalette = ["#E53935", "#8E2BFF"];
    const accentColor = tier === "B_ACE"
      ? pickFromPalette(aceAccentPalette, seed, 23)
      : pickFromPalette(massAccentPalette, seed, 23);
    const sensorColor = pickFromPalette(sensorPalette, seed, 11);
    return {
      mainColor,
      subColor,
      accentColor,
      sensorColor: accentColor,
      highlightColor: accentColor,
    };
  }, [colors, seed, tier, isRareVariant]);

  const activeGlow = colorTokens.sensorColor;
  const accentColor = colorTokens.accentColor;
  const { mainColor, subColor, highlightColor } = colorTokens;

  // Phase B: Role-based Visual Diversity
  const roleTransform = useMemo(() => {
    if (!role) return '';
    const r = role.toLowerCase();

    if (r === 'tank') {
      return 'translate(100, 100) scale(1.15, 0.95) translate(-100, -100)';
    }
    if (r === 'speed') {
      return 'translate(100, 100) scale(0.9, 1.05) translate(-100, -100)';
    }
    if (r === 'striker') {
      return 'translate(100, 100) scale(1.05) translate(-100, -100)';
    }
    if (r === 'support') {
      return 'translate(100, 100) scale(0.95) translate(-100, -100)';
    }
    return '';
  }, [role]);

  // Phase B: Legendary Aura logic
  const effectiveAura = useMemo(() => {
    if (rarityEffect === 'legendary') return 'legendary';
    if (rarityEffect === 'rare') return 'rare';
    return 'none';
  }, [rarityEffect]);

  // ===== NOW SAFE TO DO EARLY RETURN (after all hooks) =====
  // Defensive check: If parts is invalid, render nothing
  if (!parts || typeof parts !== 'object') {
    return null;
  }

  // Use the safe parts for rendering (same reference if valid)
  const renderParts = safeParts;

  const { aura = 'none', decal = 'none', eyeGlow = 'normal' } = visuals || {};


  // --- Constants (User Requirements) ---
  const STROKE_OUTER = 1.8;
  const STROKE_PANEL = 0.6;
  const OP_PANEL = 0.35;
  const OP_SHADOW = 0.35;
  const OP_RIM = 0.6; // Sharper rim for metallic feel
  const COLOR_OUTLINE = "#0F1115"; // Very dark gunmetal

  // --- Graphic Helpers ---

  // Gradient Definitions
  const Defs = () => (
    <defs>
      {/* Main Metal Gradient: High Contrast for "Chogokin" feel */}
      <linearGradient id={`${instanceId}-metal-pri`} x1="30%" y1="0%" x2="70%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity="0.65" /> {/* Highlight */}
        <stop offset="25%" stopColor="white" stopOpacity="0.1" />
        <stop offset="50%" stopColor="black" stopOpacity="0.1" />
        <stop offset="100%" stopColor="black" stopOpacity="0.7" /> {/* Shadow */}
      </linearGradient>

      <linearGradient id={`${instanceId}-metal-sec`} x1="20%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity="0.5" />
        <stop offset="50%" stopColor="white" stopOpacity="0" />
        <stop offset="100%" stopColor="black" stopOpacity="0.6" />
      </linearGradient>

      {/* Rim Light Gradient - Sharp Edge */}
      <linearGradient id={`${instanceId}-rim`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="white" stopOpacity={OP_RIM} />
        <stop offset="15%" stopColor="white" stopOpacity="0" />
        <stop offset="85%" stopColor="black" stopOpacity="0" />
        <stop offset="100%" stopColor="black" stopOpacity={OP_SHADOW} />
      </linearGradient>

      {/* Thruster Gradient */}
      <linearGradient id={`${instanceId}-thruster`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity="0.9" />
        <stop offset="20%" stopColor={activeGlow} stopOpacity="0.8" />
        <stop offset="100%" stopColor={activeGlow} stopOpacity="0" />
      </linearGradient>

      {/* Scanline / Texture Overlay - Tech */}
      <pattern id={`${instanceId}-grid`} width="6" height="3" patternUnits="userSpaceOnUse">
        <rect width="6" height="1" fill="black" opacity="0.08" />
      </pattern>



      {/* Heavy filters - skipped in lite mode */}
      {!isLite && (
        <>
          <filter id={`${instanceId}-glow`} width="200%" height="200%" x="-50%" y="-50%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id={`${instanceId}-silhouette`} x="0" y="0" width="100%" height="100%">
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.1 0 0 0 0 0.1 0 0 0 0 0.15 0 0 0 1 0"
            />
          </filter>

          {/* Aura Gradients */}
          {(!isLite) && (
            <>
              <radialGradient id={`${instanceId}-aura-legendary`} cx="50%" cy="50%" r="60%">
                <stop offset="40%" stopColor="#FFD700" stopOpacity="0.05" />
                <stop offset="70%" stopColor="#FFA500" stopOpacity="0.2" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
              <radialGradient id={`${instanceId}-aura-rare`} cx="50%" cy="50%" r="60%">
                <stop offset="50%" stopColor="#00FFFF" stopOpacity="0.05" />
                <stop offset="80%" stopColor="#00CCFF" stopOpacity="0.2" />
                <stop offset="100%" stopColor="transparent" stopOpacity="0" />
              </radialGradient>
            </>
          )}

          {aura !== 'none' && (
            <radialGradient id={`${instanceId}-aura-${aura}`} cx="50%" cy="50%" r="50%">
              {aura === 'burning' && (
                <>
                  <stop offset="60%" stopColor="#FF5500" stopOpacity="0.1" />
                  <stop offset="90%" stopColor="#FF0000" stopOpacity="0.4" />
                </>
              )}
              {aura === 'electric' && (
                <>
                  <stop offset="60%" stopColor="#00FFFF" stopOpacity="0.1" />
                  <stop offset="90%" stopColor="#00FFFF" stopOpacity="0.4" />
                </>
              )}
              {/* Other aura types could be added back if needed, but keeping it minimal for performance */}
            </radialGradient>
          )}
        </>
      )}
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
      style={eyeGlow === 'brilliant' ? { filter: `url(#${instanceId}-glow) brightness(1.5)` }
        : eyeGlow === 'matrix' ? { opacity: 0.8, filter: `url(#${instanceId}-glow) hue-rotate(90deg)` } : {}}
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
      // H1: Command (Gundam-like: Angular Helmet, Chin, Vents)
      <g key="h1">
        <MechPart d="M82 28 L118 28 L122 45 L114 65 L86 65 L78 45 Z" fillColor={mainColor}>
          {/* Internal Structure */}
          <path d="M82 36 L118 36" />
          <path d="M78 45 L86 65" />
          <path d="M122 45 L114 65" />
          {/* Chin Guard */}
          <path d="M94 65 L94 58 L106 58 L106 65" fill={subColor} stroke="none" />
          <rect x="94" y="58" width="12" height="7" fill="none" stroke={COLOR_OUTLINE} strokeWidth={STROKE_PANEL} />
          {/* Side Vents */}
          <rect x="80" y="48" width="4" height="8" fill={subColor} stroke="none" />
          <rect x="116" y="48" width="4" height="8" fill={subColor} stroke="none" />
        </MechPart>
        <SensorEye cx={100} cy={44} />
      </g>,
      // H2: Scout (Zaku-like: Dome, Tubing, Monocle Area)
      <g key="h2">
        <MechPart d="M86 62 L114 62 L116 42 C116 32 100 26 84 42 Z" fillColor={tier === 'B_ACE' ? accentColor : mainColor}>
          <path d="M86 52 L114 52" />
          <path d="M100 26 L100 42" strokeOpacity={0.5} />
        </MechPart>
        {/* Snout */}
        <path d="M94 52 L94 64 L106 64 L106 52" fill={subColor} stroke={COLOR_OUTLINE} strokeWidth={1} />
        <rect x="96" y="54" width="8" height="2" fill="black" opacity="0.5" />
        <rect x="96" y="58" width="8" height="2" fill="black" opacity="0.5" />
        <SensorEye cx={100} cy={42} />
      </g>,
      // H3: Assault (GM/Jegan: Visor, Ear Pods)
      <g key="h3">
        <MechPart d="M84 26 L116 26 L118 50 L112 66 L88 66 L82 50 Z" fillColor={subColor}>
          {/* Antenna Mounting */}
          <rect x="80" y="38" width="6" height="12" fill={mainColor} stroke={COLOR_OUTLINE} />
          <rect x="114" y="38" width="6" height="12" fill={mainColor} stroke={COLOR_OUTLINE} />
          {/* Visor Cutout */}
        </MechPart>
        <path d="M86 42 L114 42 L112 52 L88 52 Z" fill={activeGlow} filter={`url(#${instanceId}-glow)`} opacity="0.8" />
        <path d="M96 66 L96 58 L104 58 L104 66" fill={mainColor} stroke={COLOR_OUTLINE} strokeWidth={1} />
      </g>,
      // H4: Support (Guncannon: Round, Hardened)
      <g key="h4">
        <MechPart d="M88 28 L112 28 L116 64 L84 64 Z" fillColor={mainColor}>
          <path d="M88 28 L112 28" />
          <rect x="86" y="36" width="28" height="14" rx="4" fill={activeGlow} opacity="0.4" stroke={COLOR_OUTLINE} />
          <rect x="92" y="54" width="16" height="10" fill={subColor} stroke="none" />
        </MechPart>
        <SensorEye cx={100} cy={43} />
        <rect x="76" y="34" width="6" height="20" rx="1" fill={subColor} stroke={COLOR_OUTLINE} strokeWidth={1} />
        <rect x="118" y="34" width="6" height="20" rx="1" fill={subColor} stroke={COLOR_OUTLINE} strokeWidth={1} />
      </g>
    ];
    return variants[(parts.head - 1) % variants.length] || variants[0];
  };

  const Body = () => {
    // Proportions: Body ~50x50 (65-115y)
    const variants = [
      // B1: Standard (RX-78: Vents, Cockpit Block)
      <g key="b1">
        <MechPart d="M70 65 L130 65 L125 90 L115 115 L85 115 L75 90 Z" fillColor={mainColor} texture>
          {/* Chest Vents Area */}
          <path d="M75 72 L95 72 L95 85 L78 85 Z" fill={subColor} stroke="none" opacity="0.9" />
          <path d="M105 72 L125 72 L122 85 L105 85 Z" fill={subColor} stroke="none" opacity="0.9" />
          {/* Cockpit Hatch */}
          <path d="M95 70 L105 70 L105 90 L95 90 Z" fill={accentColor} stroke={COLOR_OUTLINE} strokeWidth={1} />
          {/* Waist Armor */}
          <path d="M85 115 L85 100 L115 100 L115 115" />
        </MechPart>
        <EnergySlit x={76} y={76} width={18} rotate={-5} />
        <EnergySlit x={106} y={76} width={18} rotate={5} />
      </g>,
      // B2: Heavy (Zaku: T-Chest, Pipes?)
      <g key="b2">
        <MechPart d="M65 65 L135 65 L135 85 L120 120 L80 120 L65 85 Z" fillColor={subColor} texture>
          <path d="M65 85 L135 85" />
          <rect x="90" y="65" width="20" height="55" fill={mainColor} opacity="0.2" stroke="none" />
        </MechPart>
        {/* Power Pipes */}
        <path d="M65 85 C60 100 85 115 95 115" fill="none" stroke={highlightColor} strokeWidth="3" strokeDasharray="4 2" />
        <path d="M135 85 C140 100 115 115 105 115" fill="none" stroke={highlightColor} strokeWidth="3" strokeDasharray="4 2" />
        <EnergySlit x={90} y={75} width={20} />
      </g>,
      // B3: High Mobility (Eva/Seed: Orb, Angular Plates)
      <g key="b3">
        <MechPart d="M70 60 L130 60 L120 95 L110 115 L90 115 L80 95 Z" fillColor={mainColor}>
          <path d="M70 60 L80 95" />
          <path d="M130 60 L120 95" />
        </MechPart>
        <circle cx="100" cy="85" r="10" fill={subColor} stroke={COLOR_OUTLINE} />
        <circle cx="100" cy="85" r="6" fill={activeGlow} className={`glow-sensor variant-${activeVariant}`} filter={`url(#${instanceId}-glow)`} />
        <path d="M75 60 L125 60 L115 75 L85 75 Z" fill={subColor} opacity="0.5" stroke="none" />
      </g>
    ];
    return variants[(parts.body - 1) % variants.length] || variants[0];
  };

  // --- Visual Variant Components ---

  const Aura = () => {
    // Phase B: Use effectiveAura (legendary/rare) logic or fallback to legacy aura from visuals
    const active = effectiveAura !== 'none' ? effectiveAura : aura;
    if (isLite || active === 'none') return null;

    if (active === 'legendary') {
      return (
        <circle cx="100" cy="100" r="140" fill={`url(#${instanceId}-aura-legendary)`} style={{ mixBlendMode: 'screen', filter: 'drop-shadow(0 0 8px rgba(255, 215, 0, 0.5))' }} />
      );
    }
    if (active === 'rare') {
      return (
        <circle cx="100" cy="100" r="130" fill={`url(#${instanceId}-aura-rare)`} style={{ mixBlendMode: 'screen', filter: 'drop-shadow(0 0 5px rgba(0, 255, 255, 0.3))' }} />
      );
    }

    return (
      <circle cx="100" cy="100" r="140" fill={`url(#${instanceId}-aura-${active})`} opacity="0.6" style={{ mixBlendMode: 'screen' }} />
    );
  };

  const DecalOverlay = () => {
    if (decal === 'none') return null;

    // Decal on Chest
    const center = { x: 100, y: 75 };

    if (decal === 'number') {
      // Determine number from seed?
      const num = (seed % 99) + 1;
      return (
        <text x="115" y="85" fontSize="10" fontFamily="Arial" fontWeight="bold" fill="white" opacity="0.7" style={{ mixBlendMode: 'overlay' }}>{num.toString().padStart(2, '0')}</text>
      );
    }
    if (decal === 'warning') {
      return (
        <g transform="translate(75, 75) rotate(-5)">
          <rect width="20" height="4" fill="yellow" opacity="0.6" />
          <path d="M0 0 L20 0 L20 4 L0 4 Z" fill="url(#stripe-pattern)" /> {/* No stripe pattern defined, simple rect for now */}
          <rect width="4" height="4" x="0" fill="black" opacity="0.5" />
          <rect width="4" height="4" x="10" fill="black" opacity="0.5" />
        </g>
      );
    }
    if (decal === 'star') {
      return (
        <path transform="translate(115, 80) scale(0.4)" d="M10 0 L13 7 L20 7 L15 12 L17 19 L10 15 L3 19 L5 12 L0 7 L7 7 Z" fill="white" opacity="0.8" />
      );
    }
    if (decal === 'stripe') {
      return (
        <rect x="90" y="65" width="20" height="60" fill="white" opacity="0.15" transform="skewX(-10)" />
      );
    }
    if (decal === 'camo') {
      // Simple splotches
      return (
        <g opacity="0.3" fill="black">
          <circle cx="80" cy="80" r="5" />
          <circle cx="95" cy="70" r="4" />
          <circle cx="110" cy="85" r="6" />
        </g>
      );
    }
    return null;
  };

  const RareEffect = () => {
    if (!rarityEffect || rarityEffect === 'none') return null;
    // Legendary/Rare sparkle
    return (
      <circle cx="100" cy="100" r="90" fill="none" stroke={rarityEffect === 'legendary' ? 'gold' : 'cyan'} strokeWidth="1" strokeDasharray="4 4" opacity="0.5" className="animate-spin-slow" />
    );
  };


  const ShoulderArmor = () => {
    // variantKey determines style: 0-2=None (Light), 3-8=Armor
    const style = variantKey % 9;

    // Small fix: Ensure "Heavy" types always get shoulders? 
    // For now stick to variantKey RNG but upgrade the shapes.

    if (style < 2) return null; // Reduced "No Armor" chance

    const shape = (() => {
      // Round (Zaku Spiked / Soft)
      if (style <= 4) {
        return (
          <MechPart d="M-10 0 L40 0 L45 35 L30 55 L0 55 L-15 30 Z" fillColor={mainColor}>
            <path d="M-10 15 L40 15" strokeOpacity={0.5} />
            <circle cx="15" cy="25" r="4" fill={subColor} stroke={COLOR_OUTLINE} />
            {/* Spikes if applicable - let's add them subtly */}
            <path d="M15 0 L15 -10 L25 0" fill={subColor} />
          </MechPart>
        );
      }
      // Spike / Heavy Slat
      if (style <= 6) {
        return (
          <MechPart d="M-5 -5 L35 -5 L45 25 L35 60 L10 65 L-15 25 Z" fillColor={subColor}>
            <path d="M-5 10 L35 10" />
            <path d="M-15 25 L45 25" />
            {/* Thruster vent */}
            <rect x="5" y="45" width="20" height="10" fill={activeGlow} opacity="0.5" />
            <rect x="5" y="45" width="20" height="2" fill="black" />
            <rect x="5" y="50" width="20" height="2" fill="black" />
          </MechPart>
        );
      }
      // Box (Gundam/GM)
      return (
        <MechPart d="M-20 -10 L50 -10 L50 25 L30 45 L0 45 L-20 25 Z" fillColor={mainColor}>
          <path d="M-20 5 L50 5" />
          <rect x="5" y="15" width="20" height="10" fill={subColor} stroke={COLOR_OUTLINE} />
          <rect x="8" y="18" width="14" height="4" fill={activeGlow} opacity="0.8" />
        </MechPart>
      );
    })();

    return (
      <>
        <g transform="translate(15, 60)">{shape}</g>
        <g transform="translate(185, 60) scale(-1, 1)">{shape}</g>
      </>
    );
  };

  const ExtraBackpack = () => {
    // variantKey determines style: 0-2=None, 3-4=Wings, 5-6=Cannons, 7=Radome
    const style = Math.floor(variantKey / 10) % 8;

    if (style < 3) return null;

    if (style <= 4) { // Wings (Binder)
      return (
        <>
          <g transform="translate(0, 20)">
            <MechPart d="M20 20 L0 0 L-25 45 L15 70 Z" fillColor={subColor}>
              <path d="M-10 25 L10 45" stroke={activeGlow} filter={`url(#${instanceId}-glow)`} />
              <rect x="-15" y="40" width="10" height="20" fill={mainColor} stroke="none" />
            </MechPart>
          </g>
          <g transform="translate(200, 20) scale(-1, 1)">
            <MechPart d="M20 20 L0 0 L-25 45 L15 70 Z" fillColor={subColor}>
              <path d="M-10 25 L10 45" stroke={activeGlow} filter={`url(#${instanceId}-glow)`} />
              <rect x="-15" y="40" width="10" height="20" fill={mainColor} stroke="none" />
            </MechPart>
          </g>
        </>
      );
    }

    if (style <= 6) { // Cannons
      return (
        <>
          <g transform="translate(45, 10) rotate(-10)">
            <MechPart d="M-5 -10 L20 -10 L20 60 L-5 60 Z" fillColor={subColor}>
              <rect x="0" y="-10" width="15" height="50" fill={mainColor} stroke="none" opacity="0.3" />
              <circle cx="7.5" cy="-10" r="5" fill="black" />
            </MechPart>
          </g>
          <g transform="translate(155, 10) rotate(10) scale(-1, 1)">
            <MechPart d="M-5 -10 L20 -10 L20 60 L-5 60 Z" fillColor={subColor}>
              <rect x="0" y="-10" width="15" height="50" fill={mainColor} stroke="none" opacity="0.3" />
              <circle cx="7.5" cy="-10" r="5" fill="black" />
            </MechPart>
          </g>
        </>
      );
    }

    // Radome
    return (
      <g transform="translate(140, 20)">
        <MechPart d="M0 0 L30 0 L40 30 L-10 30 Z" fillColor={subColor} />
        <circle cx="15" cy="15" r="8" fill={activeGlow} filter={`url(#${instanceId}-glow)`} />
        <path d="M15 7 L15 23" stroke="black" opacity="0.5" />
        <path d="M7 15 L23 15" stroke="black" opacity="0.5" />
      </g>
    );
  };

  const Arms = () => {
    const shape = (() => {
      const idx = (parts.armLeft - 1) % 4;
      if (idx === 0) return ( // Blocky (Gundam)
        <MechPart d="M0 0 L25 0 L24 40 L28 70 L-3 70 L-4 40 Z" fillColor={subColor}>
          {/* Shoulder Joint Cover */}
          <path d="M-2 0 L27 0 L27 15 L-2 15 Z" fill={mainColor} stroke={COLOR_OUTLINE} />
          {/* Elbow Joint */}
          <circle cx="12" cy="40" r="6" fill={mainColor} stroke={COLOR_OUTLINE} />
          <path d="M-3 70 L28 70" strokeWidth={2} />
        </MechPart>
      );
      if (idx === 1) return ( // Piston/Rounded (Zaku)
        <g>
          <MechPart d="M2 0 L23 0 L20 25 L5 25 Z" fillColor={subColor} /> {/* Upper */}
          <rect x="8" y="25" width="9" height="15" fill="#333" /> {/* Joint */}
          <MechPart d="M0 40 L25 40 L22 75 L3 75 Z" fillColor={subColor}>  {/* Lower */}
            <path d="M0 55 L25 55" strokeOpacity={0.5} />
          </MechPart>
        </g>
      );
      if (idx === 2) return ( // Shielded/Asymmetric
        <MechPart d="M-5 0 L30 0 L35 30 L25 70 L0 70 L-10 30 Z" fillColor={subColor}>
          <path d="M-10 30 L35 30" />
          <rect x="5" y="40" width="15" height="20" fill={accentColor} stroke="none" opacity="0.8" />
        </MechPart>
      );
      return ( // Claw (Z'Gok)
        <MechPart d="M2 0 L23 0 L25 45 L30 70 L-5 70 L0 45 Z" fillColor={subColor}>
          <path d="M2 45 L23 45" />
          <path d="M5 70 L0 85 L5 70" fill="gray" stroke={COLOR_OUTLINE} />
          <path d="M20 70 L25 85 L20 70" fill="gray" stroke={COLOR_OUTLINE} />
          <path d="M12 70 L12 90" stroke={activeGlow} strokeWidth={2} />
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
      if (idx === 0) return ( // Standard (Gundam: Knee, Ankle Guard)
        <MechPart d="M0 0 L25 0 L22 40 L35 95 L-10 95 L3 40 Z" fillColor={mainColor}>
          {/* Knee Armor */}
          <path d="M-2 35 L27 35 L25 55 L0 55 Z" fill={mainColor} stroke={COLOR_OUTLINE} strokeWidth={STROKE_OUTER} />
          <rect x="5" y="40" width="15" height="5" fill={subColor} stroke="none" />
          {/* Ankle Guard */}
          <path d="M-5 85 L30 85 L35 95 L-10 95 Z" fill={subColor} stroke="none" />
          <path d="M0 0 L25 0" strokeWidth={2} />
        </MechPart>
      );
      if (idx === 1) return ( // High Mobility (Dom/Gelgoog: Flared)
        <MechPart d="M5 0 L20 0 L25 30 L45 95 L-20 95 L0 30 Z" fillColor={mainColor}>
          <path d="M0 30 L25 30" />
          <path d="M-20 95 L45 95" strokeWidth={3} />
          <rect x="5" y="70" width="15" height="25" fill={subColor} opacity="0.5" stroke="none" />
        </MechPart>
      );
      if (idx === 2) return ( // Heavy (Guntank-ish treads or just thick blocks)
        <MechPart d="M-5 0 L30 0 L35 40 L40 95 L-15 95 L-10 40 Z" fillColor={mainColor}>
          <rect x="-15" y="80" width="55" height="15" fill={subColor} stroke={COLOR_OUTLINE} /> {/* Tread/Foot */}
          <path d="M-5 40 L30 40" strokeWidth={2} />
        </MechPart>
      );
      return ( // Hover/Bio (Eva legs: Thin then foot)
        <MechPart d="M5 0 L20 0 L18 60 L25 90 L0 90 L7 60 Z" fillColor={mainColor}>
          {/* Knee ball */}
          <circle cx="12.5" cy="40" r="6" fill={subColor} stroke={COLOR_OUTLINE} />
          <path d="M7 60 L18 60" />
          {/* Hover Glow */}
          <path d="M-5 95 L30 95" stroke={activeGlow} strokeWidth={3} filter={`url(#${instanceId}-glow)`} opacity="0.6" />
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

  // Overlay Variables
  const markOnLeft = (Math.abs(seed) + 7) % 2 === 0;
  const antennaBaseY = 32;
  const markX = markOnLeft ? 38 : 146;
  const shieldTransform = markOnLeft ? undefined : "translate(200,0) scale(-1,1)";
  const monoEyeOffset = ((Math.abs(seed) + 13) % 3) - 1;
  const monoEyeX = 100 + monoEyeOffset * 4;

  const msOverlay = (
    <g id="msOverlay">
      {/* V-Fin (Antenna) - Polygon Style */}
      {motif !== "ZAKU" && (
        <g id="ms-antenna" transform={`translate(100, ${antennaBaseY})`}>
          {/* Main V-Fin */}
          <path d="M0 0 L-28 -22 L-32 -18 L-8 5 Z" fill={highlightColor} stroke={COLOR_OUTLINE} strokeWidth={0.5} />
          <path d="M0 0 L28 -22 L32 -18 L8 5 Z" fill={highlightColor} stroke={COLOR_OUTLINE} strokeWidth={0.5} />

          {/* Jewel Block */}
          <path d="M-6 -2 L6 -2 L5 8 L-5 8 Z" fill={accentColor} stroke={COLOR_OUTLINE} strokeWidth={1} />
          <rect x="-2" y="1" width="4" height="4" rx="1" fill={activeGlow} filter={`url(#${instanceId}-glow)`} />

          {/* Ace Commander Antenna (Vertical) */}
          {tier === "B_ACE" && (
            <path id="ms-ace-extra" d="M0 -2 L0 -28 L-3 -22 L-3 -2 Z" fill={subColor} stroke={COLOR_OUTLINE} strokeWidth={0.5} />
          )}
        </g>
      )}

      {/* Chest Vents (if not covered by body) - mostly handled by Body variants now, but we add extra detail if standard */}
      {true && ( // Always add subtle intake detail
        <g id="ms-ducts">
          <rect x="75" y="74" width="20" height="1" fill="black" opacity="0.3" />
          <rect x="75" y="78" width="20" height="1" fill="black" opacity="0.3" />
          <rect x="105" y="74" width="20" height="1" fill="black" opacity="0.3" />
          <rect x="105" y="78" width="20" height="1" fill="black" opacity="0.3" />
        </g>
      )}

      {/* Waist Armor / Skirts */}
      <g id="ms-waist">
        {/* Front Skirts */}
        <MechPart d="M82 110 L98 110 L98 135 L85 130 L82 110 Z" fillColor={mainColor}>
          <path d="M82 115 L98 115" strokeWidth={0.5} />
        </MechPart>
        <MechPart d="M118 110 L102 110 L102 135 L115 130 L118 110 Z" fillColor={mainColor}>
          <path d="M118 115 L102 115" strokeWidth={0.5} />
        </MechPart>
        {/* Center Crotch Piece */}
        <path d="M98 110 L102 110 L102 125 L100 130 L98 125 Z" fill={accentColor} stroke={COLOR_OUTLINE} />
        <path d="M100 115 L100 120" stroke={subColor} />
      </g>

      {/* Shoulder Markings */}
      <g id="ms-mark">
        <rect x={markX} y="68" width="20" height="40" rx="2" fill="none" stroke={highlightColor} strokeWidth="1" opacity="0.4" strokeDasharray="2 2" />
        <rect x={markX} y="72" width="20" height="8" fill={highlightColor} opacity="0.6" />
        <text x={markX + 10} y="78" textAnchor="middle" fontSize="6" fill="black" fontWeight="bold" fontFamily="Arial">
          {tier === "B_ACE" ? "ACE" : "MS"}
        </text>
      </g>
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
              <path id="ms-ace-extra-zaku" d="M44 68 L56 62 L58 70 Z" fill={accentColor} opacity="0.8" />
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
          @keyframes maintenance-scan-${instanceId} {
             0% { top: 0%; opacity: 0; }
             20% { opacity: 1; }
             80% { opacity: 1; }
             100% { top: 100%; opacity: 0; }
          }
          @keyframes maintenance-jitter-${instanceId} {
             0% { transform: translate(0, 0); }
             25% { transform: translate(0.5px, 0.5px); }
             50% { transform: translate(-0.5px, -0.5px); }
             75% { transform: translate(0.5px, -0.5px); }
             100% { transform: translate(0, 0); }
          }
          @keyframes maintenance-blink-${instanceId} {
             0%, 100% { opacity: 0.2; }
             50% { opacity: 0.8; }
          }

          /* Classes */
          .mech-anim-${instanceId} {
            animation: ${activeVariant === 'maintenance'
          ? `maintenance-jitter-${instanceId} 0.2s steps(2) infinite`
          : shouldAnimate
            ? `hover-${instanceId} 4s ease-in-out infinite`
            : 'none'};
          }
          .thruster-anim {
             animation: ${shouldAnimate ? `thruster-breath-${instanceId} 2.2s ease-in-out infinite` : 'none'};
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
          .variant-battle .thruster-anim { animation: ${shouldAnimate ? `thruster-boost-${instanceId} 0.6s ease-out` : 'none'}; }
          
          .variant-evolve .glow-sensor { opacity: 0; animation: high-alert-pulse-${instanceId} 0.3s infinite; }
          .variant-evolve .glow-thruster { opacity: 0.2; }

          .variant-maintenance .glow-sensor { animation: maintenance-blink-${instanceId} 2s ease-in-out infinite; }
          .variant-maintenance .glow-thruster { opacity: 0.1; }
          .variant-maintenance .glow-slit { opacity: 0.1; }
      `}</style>

      {/* Background Glow (Optional) - hidden in silhouette mode */}
      {showGlow && !silhouette && (
        <radialGradient id={`${instanceId}-bg-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={activeGlow} stopOpacity="0.15" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </radialGradient>
      )}
      {showGlow && !silhouette && <circle cx="100" cy="100" r="90" fill={`url(#${instanceId}-bg-glow)`} />}

      {/* Main robot rendering - wrapped in silhouette filter when locked */}
      <g filter={silhouette ? `url(#${instanceId}-silhouette)` : undefined} transform={!silhouette ? roleTransform : undefined}>
        {/* Render Order: Back -> Thrusters -> Legs -> Arms -> Body -> Head -> Weapon */}
        <g className={silhouette ? undefined : `mech-anim-${instanceId}`}>
          {/* Aura and Heavy effects skipped in isLite */}
          {!isLite && (
            <>
              <Aura />
              <ExtraBackpack />
              <Backpack />
              <Thrusters />
            </>
          )}
          <Legs />
          <Arms />
          <ShoulderArmor />
          <Body />
          <DecalOverlay />
          <Head />
          <Weapon />
          {!isLite && <RareEffect />}
        </g>

        <g id="msShadow" opacity="0.12">
          <path d="M110 72 L150 72 L165 130 L150 176 L110 176 Z" fill="#000" />
        </g>

        {!silhouette && msOverlay}
        {!silhouette && motifOverlay}

        {/* Decals Overlay - hidden in silhouette mode */}
        {!silhouette && decals.includes('hazard') && (
          <path d="M100 80 L110 80 L105 90 Z" fill={accentColor} opacity="0.6" style={{ mixBlendMode: 'multiply' }} />
        )}

        {/* Maintenance Scanline Overlay */}
        {activeVariant === 'maintenance' && !silhouette && (
          <g>
            <rect x="0" y="-10" width="200" height="2" fill={activeGlow} opacity="0.5" style={{ animation: `maintenance-scan-${instanceId} 2s linear infinite` }} />
            <rect x="50" y="80" width="2" height="2" fill="white" opacity="0.8" style={{ animation: `maintenance-blink-${instanceId} 0.5s steps(2) infinite 0.2s` }} />
            <rect x="150" y="120" width="2" height="2" fill="white" opacity="0.8" style={{ animation: `maintenance-blink-${instanceId} 0.7s steps(2) infinite 0.5s` }} />
          </g>
        )}
      </g>

    </svg>
  );
}

// Memoize to prevent expensive re-renders of complex SVG
// Custom comparison to handle object props efficiently
export default memo(RobotSVGComponent, (prevProps, nextProps) => {
  // Re-render if essential props change
  // Check parts object (shallow comparison of values)
  if (prevProps.parts !== nextProps.parts) {
    const p1 = prevProps.parts;
    const p2 = nextProps.parts;
    if (
      p1.head !== p2.head ||
      p1.body !== p2.body ||
      p1.armLeft !== p2.armLeft ||
      p1.armRight !== p2.armRight ||
      p1.legLeft !== p2.legLeft ||
      p1.legRight !== p2.legRight ||
      p1.backpack !== p2.backpack ||
      p1.weapon !== p2.weapon
    ) {
      return false; // Parts changed
    }
    // Check remaining parts if any (face, accessory usually not visual in SVG yet or strictly mapped)
  }

  if (
    prevProps.size !== nextProps.size ||
    prevProps.variant !== nextProps.variant ||
    prevProps.silhouette !== nextProps.silhouette ||
    prevProps.showGlow !== nextProps.showGlow ||
    prevProps.animate !== nextProps.animate ||
    prevProps.variantKey !== nextProps.variantKey ||
    prevProps.isRareVariant !== nextProps.isRareVariant ||
    prevProps.simplified !== nextProps.simplified ||
    prevProps.role !== nextProps.role ||
    prevProps.rarityEffect !== nextProps.rarityEffect
  ) {
    return false; // Props changed, re-render
  }

  // Check colors object (shallow comparison)
  if (prevProps.colors !== nextProps.colors) {
    const prevColors = prevProps.colors;
    const nextColors = nextProps.colors;
    if (
      prevColors.primary !== nextColors.primary ||
      prevColors.secondary !== nextColors.secondary ||
      prevColors.accent !== nextColors.accent ||
      prevColors.glow !== nextColors.glow
    ) {
      return false; // Colors changed, re-render
    }
  }

  // Check fx object
  if (prevProps.fx !== nextProps.fx) {
    if (!prevProps.fx || !nextProps.fx) return false;
    if (
      prevProps.fx.variant !== nextProps.fx.variant ||
      prevProps.fx.nonce !== nextProps.fx.nonce
    ) {
      return false; // FX changed, re-render
    }
  }

  // Check decals array
  if (prevProps.decals !== nextProps.decals) {
    if (!prevProps.decals && !nextProps.decals) return true;
    if (!prevProps.decals || !nextProps.decals) return false;
    if (prevProps.decals.length !== nextProps.decals.length) return false;
    if (prevProps.decals.some((d, i) => d !== nextProps.decals![i])) return false;
  }

  return true; // No changes, skip re-render
});
