import { BingoCell } from '../../../shared/bingoConditions';
import { useLanguage } from '@/contexts/LanguageContext';
import { Lock, Check } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

interface BingoCardProps {
    cells: BingoCell[];
    completedCount: number;
}

export function BingoCard({ cells, completedCount }: BingoCardProps) {
    const { t } = useLanguage();

    return (
        <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/30">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                    <span>{t('bingo_title')}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                        {completedCount}/9
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-2">
                    {cells.map((cell, idx) => (
                        <div
                            key={idx}
                            className={`
                relative aspect-square rounded-lg p-2 flex flex-col items-center justify-center
                transition-all duration-300
                ${cell.completed
                                    ? 'bg-green-500/20 border-2 border-green-500/50'
                                    : 'bg-gray-500/10 border-2 border-gray-500/20'
                                }
              `}
                        >
                            {cell.completed ? (
                                <>
                                    <Check className="w-6 h-6 text-green-400 mb-1" />
                                    <span className="text-xs text-center font-medium">
                                        {t(cell.labelKey)}
                                    </span>
                                    {cell.barcode && (
                                        <span className="text-[10px] text-muted-foreground mt-1 truncate w-full text-center">
                                            {cell.barcode.slice(-4)}
                                        </span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Lock className="w-5 h-5 text-gray-400 mb-1" />
                                    <span className="text-xs text-center blur-[2px] select-none">
                                        {t(cell.labelKey)}
                                    </span>
                                </>
                            )}
                        </div>
                    ))}
                </div>

                {/* Progress indicator */}
                <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{t('bingo_progress')}</span>
                        <span className="font-medium">
                            {completedCount >= 9 ? t('bingo_complete') :
                                completedCount >= 5 ? t('bingo_reward_5_available') :
                                    completedCount >= 3 ? t('bingo_reward_3_available') :
                                        t('bingo_scan_more')}
                        </span>
                    </div>

                    {/* Reward milestones */}
                    <div className="flex gap-1">
                        {[3, 5, 9].map(milestone => (
                            <div
                                key={milestone}
                                className={`
                  h-2 flex-1 rounded-full transition-colors
                  ${completedCount >= milestone ? 'bg-green-500' : 'bg-gray-500/20'}
                `}
                            />
                        ))}
                    </div>

                    <div className="text-xs text-center text-muted-foreground">
                        {t('bingo_reward_hint')}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
