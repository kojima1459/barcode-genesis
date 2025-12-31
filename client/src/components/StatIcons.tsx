import React from "react";

interface IconProps {
    className?: string;
    color?: string;
}

export const StatIconHP = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M11 2H13V8H19V10H13V16H15L12 22L9 16H11V10H5V8H11V2Z" fill={color} fillOpacity="0.8" />
        <path d="M12 4V8H17V10H12V18L13 20L12 22L11 20L12 18V10H7V8H12V4Z" stroke={color} strokeWidth="1.5" strokeLinecap="square" />
        <circle cx="12" cy="12" r="1.5" fill={color} />
    </svg>
);

export const StatIconATK = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2L16 4L9 21L5 22L6 18L14 2Z" fill={color} fillOpacity="0.2" />
        <path d="M14 2L16 4L9 21L5 22L6 18L14 2ZM18 2L22 6L20 8L16 4L18 2Z" stroke={color} strokeWidth="1.5" strokeLinejoin="miter" />
        <path d="M6 18L5 22L9 21" stroke={color} strokeWidth="2" strokeLinecap="square" />
    </svg>
);

export const StatIconDEF = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L4 6V11C4 16.5 7.5 20.5 12 22C16.5 20.5 20 16.5 20 11V6L12 2Z" fill={color} fillOpacity="0.15" />
        <path d="M12 2L4 6V11C4 16.5 7.5 20.5 12 22C16.5 20.5 20 16.5 20 11V6L12 2Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M12 6V18M7 11H17" stroke={color} strokeWidth="1" strokeOpacity="0.5" />
    </svg>
);

export const StatIconSPD = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M13 2L6 14H12L11 22L18 10H12L13 2Z" fill={color} fillOpacity="0.2" />
        <path d="M13 2L6 14H12L11 22L18 10H12L13 2Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M3 10L5 10M2 14L4 14M3 18L5 18" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
    </svg>
);

// Role Icons
export const RoleIconAttacker = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" strokeOpacity="0.5" />
        <path d="M8 12L11 15L16 9" stroke={color} strokeWidth="2" strokeLinecap="square" />
        <path d="M12 7V5M12 19V17M5 12H7M19 12H17" stroke={color} strokeWidth="1.5" />
    </svg>
);

export const RoleIconTank = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <rect x="5" y="5" width="14" height="14" rx="2" stroke={color} strokeWidth="1.5" />
        <path d="M9 12H15M12 9V15" stroke={color} strokeWidth="2" strokeLinecap="square" />
    </svg>
);

export const RoleIconSpeed = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M4 12L8 8L16 8L20 12L16 16L8 16L4 12Z" stroke={color} strokeWidth="1.5" />
        <path d="M9 12H15" stroke={color} strokeWidth="2" />
        <path d="M14 9L17 12L14 15" stroke={color} strokeWidth="1.5" />
    </svg>
);

export const RoleIconTricky = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5L12 3Z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="2" fill={color} />
    </svg>
);

export const RoleIconBalance = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="8" stroke={color} strokeWidth="1.5" />
        <path d="M12 4V20M4 12H20" stroke={color} strokeWidth="1" strokeDasharray="2 2" />
        <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5" />
    </svg>
);
