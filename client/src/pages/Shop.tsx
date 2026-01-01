import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { httpsCallable } from "firebase/functions";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { ArrowLeft, Loader2, Zap, Sword, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SystemSkeleton } from "@/components/ui/SystemSkeleton";
import { CountUp } from "@/components/ui/CountUp";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { db, functions } from "@/lib/firebase";
import { SHOP_ITEMS, ShopItemCategory, getCategoryLabel, getItemLabel, getItemDescription } from "@/lib/items";
import { PRODUCTS } from "../../../shared/products";
import { toast } from "sonner";
import { Interactive } from "@/components/ui/interactive";
import { GlobalHeader } from "@/components/GlobalHeader";
import { useUserData } from "@/hooks/useUserData";
import { ShopItemCard, CategoryIcon } from "@/components/ShopItemCard";

type InventoryMap = Record<string, number>;

const getErrorMessage = (error: unknown, isCraftItem: boolean, t: (key: string) => string) => {
  if (error && typeof error === "object") {
    const code = typeof (error as { code?: unknown }).code === "string"
      ? String((error as { code?: unknown }).code)
      : "";
    const message = typeof (error as { message?: unknown }).message === "string"
      ? String((error as { message?: unknown }).message)
      : "";
    const normalizedCode = code.replace("functions/", "");

    if (isCraftItem) {
      if (normalizedCode.includes("invalid-argument")) return t('shop_invalid_recipe');
      if (normalizedCode.includes("failed-precondition")) return t('shop_insufficient_materials');
    } else if (normalizedCode.includes("failed-precondition")) {
      return t('shop_insufficient_credits');
    }

    if (message.includes("insufficient-tokens")) return t('shop_insufficient_tokens');
    if (message.includes("insufficient-credits")) return t('shop_insufficient_credits');
    if (message) return message;
    return t('shop_purchase_error');
  }
  return t('shop_purchase_error');
};

export default function Shop() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const { userData, loading: userDataLoading } = useUserData();


  const [inventory, setInventory] = useState<InventoryMap>({});
  const [loadingInventory, setLoadingInventory] = useState(true);

  const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [buyingProduct, setBuyingProduct] = useState<string | null>(null);

  useEffect(() => {
    const loadInventory = async () => {
      if (!user) {
        setLoadingInventory(false);
        return;
      }

      try {
        const inventorySnap = await getDocs(collection(db, "users", user.uid, "inventory"));
        const nextInventory: InventoryMap = {};
        inventorySnap.forEach((itemDoc) => {
          const data = itemDoc.data();
          if (typeof data.qty === "number") {
            nextInventory[itemDoc.id] = data.qty;
          }
        });
        setInventory(nextInventory);
      } catch (error) {
        console.error("Failed to load inventory:", error);
        toast.error(t('shop_load_error'));
      } finally {
        setLoadingInventory(false);
      }
    };

    loadInventory();
  }, [user]);

  const credits = userData?.credits || 0;
  const scanTokens = userData?.scanTokens || 0;
  const loading = userDataLoading || loadingInventory;


  const handleBuyCoins = async (productId: string) => {
    if (!user) return;
    setBuyingProduct(productId);
    try {
      const createCheckoutSession = httpsCallable(functions, "createCheckoutSession");
      // Map product IDs to pack IDs expected by the Cloud Function
      const packIdMap: Record<string, string> = {
        'coin_pack_small': 'credits_100',
        'coin_pack_medium': 'credits_500',
        'coin_pack_large': 'credits_1200',
      };
      const packId = packIdMap[productId] || productId;
      const result = await createCheckoutSession({
        packId,
        successUrl: `${window.location.origin}/?purchase=success`,
        cancelUrl: `${window.location.origin}/shop?canceled=true`,
      });
      const { url } = result.data as { url: string };
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      toast.error(t('shop_checkout_error'));
    } finally {
      setBuyingProduct(null);
    }
  };


  const handlePurchase = async (itemId: string, qty: number = 1) => {
    if (!user) return;
    setErrorMessage(null);
    setPurchasingItemId(itemId);
    try {
      // qty is now passed from ShopItemCard
      const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
      const isCraftItem = typeof item?.tokenCost === "number";
      const action = httpsCallable(functions, isCraftItem ? "craftItem" : "purchaseItem");
      const payload = isCraftItem ? { recipeId: itemId, qty } : { itemId, qty };
      const result = await action(payload);
      const data = result.data as {
        credits: number;
        scanTokens?: number;
        inventoryDelta: { itemId: string; qty: number; totalQty: number };
      };

      setInventory((prev) => ({
        ...prev,
        [data.inventoryDelta.itemId]: data.inventoryDelta.totalQty
      }));
      // Credits/Tokens updated automatically via useUserData
      toast.success(isCraftItem ? t('shop_craft_success') : t('shop_purchase_success'));
    } catch (error) {
      console.error("Purchase failed:", error);
      const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
      const isCraftItem = typeof item?.tokenCost === "number";
      const message = getErrorMessage(error as any, isCraftItem, t as any);
      setErrorMessage(message);
    } finally {
      setPurchasingItemId(null);
    }
  };

  const categories: ShopItemCategory[] = ['boost', 'battle', 'cosmetic'];

  const renderItems = (category: ShopItemCategory) => {
    const items = SHOP_ITEMS.filter(item => item.category === category);
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item) => (
          <ShopItemCard
            key={item.id}
            item={item}
            ownedCount={inventory[item.id] ?? 0}
            credits={credits}
            scanTokens={scanTokens}
            onPurchase={handlePurchase}
            isPurchasing={purchasingItemId === item.id}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <SystemSkeleton
          className="w-full max-w-2xl h-80 rounded-3xl"
          text={t('shop_loading_text')}
          subtext={t('shop_loading_subtext')}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col relative pb-32 md:pb-8 bg-background text-foreground overflow-hidden">
      {/* Global Header */}
      <GlobalHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pt-4 relative z-10 space-y-8">
        {/* Coin Shop Section */}
        <section>
          <h2 className="text-xl font-bold mb-4 text-primary">{t('shop_coins_title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRODUCTS.filter(p => p.type === 'coin').map((product) => (
              <Interactive key={product.id} className="border-primary/20 h-auto overflow-hidden rounded-xl">
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="aspect-square bg-secondary/20 rounded-lg flex items-center justify-center text-4xl">
                    💰
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-500">{product.amount} {t('shop_coins_unit')}</div>
                    <div className="text-sm text-muted-foreground">{product.description}</div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => handleBuyCoins(product.id)}
                    disabled={buyingProduct === product.id}
                  >
                    {buyingProduct === product.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    ¥{product.price}
                  </Button>
                </CardContent>
              </Interactive>
            ))}
          </div>
        </section>

        {errorMessage && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{errorMessage}</p>}

        <section className="space-y-8">
          <h2 className="text-xl font-bold text-primary">{t('shop_items_title')}</h2>
          {categories.map(cat => (
            <div key={cat} className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-foreground border-b border-border pb-2">
                <CategoryIcon category={cat} />
                {getCategoryLabel(cat, language)}
              </h3>
              {renderItems(cat)}
            </div>
          ))}
        </section>
        {/* Premium Link */}
        <div className="flex justify-center mt-8 mb-4">
          <Link href="/premium">
            <span className="text-xs text-muted-foreground/50 underline cursor-pointer hover:text-accent transition-colors">
              {t('shop_premium_link')}
            </span>
          </Link>
        </div>
      </main>
    </div >
  );
}
