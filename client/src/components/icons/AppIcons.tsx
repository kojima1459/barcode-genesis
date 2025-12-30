import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & {
  size?: number;
  strokeWidth?: number;
};

const IconBase = ({ size = 24, strokeWidth = 1.75, className, children, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {children}
  </svg>
);

export const ScanIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="4" y="4" width="16" height="16" rx="2.5" />
    <path d="M4 12h16" />
    <path d="M8 8h8" />
  </IconBase>
);

export const BattleIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M6 18l6-6" />
    <path d="M8 6l10 10" />
    <path d="M6 6l4 4" />
    <path d="M14 14l4 4" />
  </IconBase>
);

export const DexIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <rect x="14" y="14" width="6" height="6" rx="1" />
  </IconBase>
);

export const WorkshopIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M12 3l4 2.5 4 6.5-4 6.5-4 2.5-4-2.5-4-6.5 4-6.5z" />
    <path d="M12 9v6" />
    <path d="M9 12h6" />
  </IconBase>
);

export const HowToIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8.5h.01" />
    <path d="M11 11.5h1v4" />
  </IconBase>
);

export const HomeIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M4 11.5l8-6 8 6" />
    <path d="M6.5 10v8.5h11V10" />
  </IconBase>
);

export const ShopIcon = (props: IconProps) => (
  <IconBase {...props}>
    <path d="M5 9h14l-1.5 10H6.5L5 9z" />
    <path d="M9 9V7a3 3 0 0 1 6 0v2" />
  </IconBase>
);

export const ProfileIcon = (props: IconProps) => (
  <IconBase {...props}>
    <circle cx="12" cy="9" r="3" />
    <path d="M5 19c1.5-3 4.2-4.5 7-4.5s5.5 1.5 7 4.5" />
  </IconBase>
);

export const UnitsIcon = (props: IconProps) => (
  <IconBase {...props}>
    <rect x="3.5" y="6" width="7" height="12" rx="1.5" />
    <rect x="13.5" y="6" width="7" height="12" rx="1.5" />
    <path d="M7 9h0.01" />
    <path d="M17 9h0.01" />
  </IconBase>
);
