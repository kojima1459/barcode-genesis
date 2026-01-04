import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Interactive } from "@/components/ui/interactive";
import { Loader2, Zap, Sword, Sparkles } from "lucide-react";
import { ShopItem, ShopItemCategory, getItemLabel, getItemDescription } from "@/lib/items";
import { useLanguage } from "@/contexts/LanguageContext";

interface ShopItemCardProps {
    item: ShopItem;
    ownedCount: number;
    credits: number;
    scanTokens: number;
    onPurchase: (itemId: string, qty: number) => void;
    isPurchasing: boolean;
}

export const CategoryIcon = ({ category }: { category: ShopItemCategory }) => {
    switch (category) {
        case 'boost': return <Zap className="w-4 h-4" />;
        case 'battle': return <Sword className="w-4 h-4" />;
        case 'cosmetic': return <Sparkles className="w-4 h-4" />;
    }
};

export function ShopItemCard({ item, ownedCount, credits, scanTokens, onPurchase, isPurchasing }: ShopItemCardProps) {
    const { language, t } = useLanguage();
    const [qty, setQty] = useState(1);
    const qtyOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const isCraftItem = typeof item.tokenCost === "number";
    const totalCost = item.price * qty;
    const totalTokenCost = (typeof item.tokenCost === 'number' ? item.tokenCost : 0) * qty;

    const canAffordCredits = credits >= totalCost;
    const canAffordTokens = !isCraftItem || scanTokens >= totalTokenCost;
    const canAfford = canAffordCredits && canAffordTokens;

    return (
        <Interactive className="hover:border-primary/50 transition-colors h-auto overflow-hidden rounded-xl">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <CategoryIcon category={item.category} />
                    {getItemLabel(item.id, language)}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{getItemDescription(item.id, language)}</p>
                <div className="flex justify-between items-center text-sm">
                    <span className={`font-bold ${canAfford ? 'text-primary' : 'text-red-500'}`}>
                        {isCraftItem
                            ? `${t('shop_material')}: ${t('shop_scan_token')} ${item.tokenCost} + ${item.price} ${t('shop_credits')}`
                            : `${item.price} ${t('shop_credits')}`}
                    </span>
                    <span className="text-muted-foreground">{t('shop_owned')}: {ownedCount}</span>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={qty}
                        onChange={(e) => setQty(Number(e.target.value))}
                        className="border rounded px-2 py-1 bg-background text-sm"
                        disabled={isPurchasing}
                    >
                        {qtyOptions.map((q) => (
                            <option key={q} value={q}>
                                x{q}
                            </option>
                        ))}
                    </select>
                    <Button
                        onClick={() => onPurchase(item.id, qty)}
                        disabled={isPurchasing || !canAfford}
                        size="sm"
                        className={!canAfford ? "opacity-50" : ""}
                    >
                        {isPurchasing && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                        {isCraftItem ? t('shop_craft') : t('shop_buy')}
                    </Button>
                </div>
            </CardContent>
        </Interactive>
    );
}
