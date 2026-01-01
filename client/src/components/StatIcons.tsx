import React from "react";
import {
    Heart,
    Sword,
    Shield,
    Zap,
    Crosshair,
    ShieldCheck,
    Wind,
    Sparkles,
    Scale
} from "lucide-react";

interface IconProps {
    className?: string;
    color?: string;
}

export const StatIconHP = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <Heart className={className} color={color} fill={color} fillOpacity={0.2} />
);

export const StatIconATK = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <Sword className={className} color={color} fill={color} fillOpacity={0.2} />
);

export const StatIconDEF = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <Shield className={className} color={color} fill={color} fillOpacity={0.2} />
);

export const StatIconSPD = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <Zap className={className} color={color} fill={color} fillOpacity={0.2} />
);

// Role Icons
export const RoleIconAttacker = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <Crosshair className={className} color={color} />
);

export const RoleIconTank = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <ShieldCheck className={className} color={color} />
);

export const RoleIconSpeed = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <Wind className={className} color={color} />
);

export const RoleIconTricky = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <Sparkles className={className} color={color} />
);

export const RoleIconBalance = ({ className = "w-6 h-6", color = "currentColor" }: IconProps) => (
    <Scale className={className} color={color} />
);
