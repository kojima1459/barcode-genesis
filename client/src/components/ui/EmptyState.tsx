import React, { ReactNode } from 'react';
import { LucideIcon, PackageOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon: Icon = PackageOpen,
    title,
    description,
    action,
    className
}) => {
    return (
        <div className={cn("flex flex-col items-center justify-center p-8 bg-black/20 rounded-xl border border-dashed border-white/5 text-center space-y-3", className)}>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-2">
                <Icon className="w-6 h-6 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-sm font-bold text-white font-display tracking-wide uppercase">
                {title}
            </h3>
            {description && (
                <p className="text-xs text-muted-foreground max-w-xs font-mono">
                    {description}
                </p>
            )}
            {action && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={action.onClick}
                    className="mt-4 border-white/10 hover:bg-white/5 text-xs font-mono"
                >
                    {action.label}
                </Button>
            )}
        </div>
    );
};
