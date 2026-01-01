import { Terrain } from '@/lib/battleTerrain';
import { useLanguage } from '@/contexts/LanguageContext';

interface TerrainBadgeProps {
    terrain: Terrain;
    className?: string;
}

export function TerrainBadge({ terrain, className = '' }: TerrainBadgeProps) {
    const { t } = useLanguage();

    const terrainConfig = {
        ICE: {
            icon: '❄️',
            label: t('terrain_ice'),
            bgColor: 'bg-blue-500/20',
            textColor: 'text-blue-300',
            borderColor: 'border-blue-500/30'
        },
        VOLCANO: {
            icon: '🌋',
            label: t('terrain_volcano'),
            bgColor: 'bg-red-500/20',
            textColor: 'text-red-300',
            borderColor: 'border-red-500/30'
        },
        LIBRARY: {
            icon: '📚',
            label: t('terrain_library'),
            bgColor: 'bg-purple-500/20',
            textColor: 'text-purple-300',
            borderColor: 'border-purple-500/30'
        }
    };

    const config = terrainConfig[terrain];

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border ${config.bgColor} ${config.borderColor} ${className}`}>
            <span className="text-sm">{config.icon}</span>
            <span className={`text-xs font-medium ${config.textColor}`}>
                {config.label}
            </span>
        </div>
    );
}
