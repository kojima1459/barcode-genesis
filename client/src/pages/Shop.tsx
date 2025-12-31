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
  }
  return t('shop_purchase_error');
};

const CategoryIcon = ({ category }: { category: ShopItemCategory }) => {
  switch (category) {
    case 'boost': return <Zap className="w-4 h-4" />;
    case 'battle': return <Sword className="w-4 h-4" />;
    case 'cosmetic': return <Sparkles className="w-4 h-4" />;
  }
};

export default function Shop() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [credits, setCredits] = useState(0);
  const [scanTokens, setScanTokens] = useState(0);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [inventory, setInventory] = useState<InventoryMap>({});
  const [loading, setLoading] = useState(true);
  const [purchaseQty, setPurchaseQty] = useState<Record<string, number>>({});
  const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [buyingProduct, setBuyingProduct] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setCredits(typeof data.credits === "number" ? data.credits : 0);
          setScanTokens(typeof data.scanTokens === "number" ? data.scanTokens : 0);
          setXp(typeof data.xp === "number" ? data.xp : 0);
          setLevel(typeof data.level === "number" ? data.level : 1);
        } else {
          setCredits(0);
          setScanTokens(0);
          setXp(0);
          setLevel(1);
        }

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
        console.error("Failed to load shop data:", error);
        toast.error(t('shop_load_error'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const qtyOptions = useMemo(() => Array.from({ length: 10 }, (_, index) => index + 1), []);

  const handleBuyCoins = async (productId: string) => {
    if (!user) return;
    setBuyingProduct(productId);
    try {
      const createCheckoutSession = httpsCallable(functions, "createCheckoutSession");
      const result = await createCheckoutSession({ productId });
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

  const handlePurchase = async (itemId: string) => {
    if (!user) return;
    setErrorMessage(null);
    setPurchasingItemId(itemId);
    try {
      const qty = purchaseQty[itemId] ?? 1;
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

      setCredits(data.credits);
      if (typeof data.scanTokens === "number") {
        setScanTokens(data.scanTokens);
      }
      setInventory((prev) => ({
        ...prev,
        [data.inventoryDelta.itemId]: data.inventoryDelta.totalQty
      }));
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
          <Interactive key={item.id} className="hover:border-primary/50 transition-colors h-auto overflow-hidden rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CategoryIcon category={item.category} />
                {getItemLabel(item.id, language)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{getItemDescription(item.id, language)}</p>
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-primary">
                  {typeof item.tokenCost === "number"
                    ? `${t('shop_material')}: Token ${item.tokenCost} + ${item.price} ${t('shop_credits')}`
                    : `${item.price} ${t('shop_credits')}`}
                </span>
                <span className="text-muted-foreground">{t('shop_owned')}: {inventory[item.id] ?? 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={purchaseQty[item.id] ?? 1}
                  onChange={(event) =>
                    setPurchaseQty((prev) => ({
                      ...prev,
                      [item.id]: Number(event.target.value)
                    }))
                  }
                  className="border rounded px-2 py-1 bg-background text-sm"
                >
                  {qtyOptions.map((qty) => (
                    <option key={qty} value={qty}>
                      x{qty}
                    </option>
                  ))}
                </select>
                <Button
                  onClick={() => handlePurchase(item.id)}
                  disabled={
                    purchasingItemId === item.id ||
                    credits < item.price * (purchaseQty[item.id] ?? 1) ||
                    (typeof item.tokenCost === "number" && scanTokens < item.tokenCost * (purchaseQty[item.id] ?? 1))
                  }
                  size="sm"
                >
                  {purchasingItemId === item.id && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  {typeof item.tokenCost === "number" ? t('shop_craft') : t('shop_buy')}
                </Button>
              </div>
            </CardContent>
          </Interactive>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-8">
        <SystemSkeleton
          className="w-full max-w-2xl h-80 rounded-3xl"
          text="ACCESSING MARKETPLACE..."
          subtext="RETRIEVING INVENTORY DATA"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden bg-bg text-text">
      {/* Global Header */}
      <GlobalHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pt-4 relative z-10 space-y-8">
        {/* Coin Shop Section */}
        <section>
          <h2 className="text-xl font-bold mb-4 text-primary">{t('shop_coins_title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRODUCTS.map((product) => (
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
              広告非表示 / 上限UP (Premium)
            </span>
          </Link>
        </div>
      </main>
    </div >
  );
}
