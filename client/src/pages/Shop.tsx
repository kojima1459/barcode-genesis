import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { httpsCallable } from "firebase/functions";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { ArrowLeft, Loader2, Zap, Sword, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { db, functions } from "@/lib/firebase";
import { SHOP_ITEMS, ShopItemCategory, getCategoryLabel } from "@/lib/items";
import { PRODUCTS } from "../../../shared/products";
import { toast } from "sonner";

type InventoryMap = Record<string, number>;

const getErrorMessage = (error: unknown, isCraftItem: boolean) => {
  if (error && typeof error === "object") {
    const code = typeof (error as { code?: unknown }).code === "string"
      ? String((error as { code?: unknown }).code)
      : "";
    const message = typeof (error as { message?: unknown }).message === "string"
      ? String((error as { message?: unknown }).message)
      : "";
    const normalizedCode = code.replace("functions/", "");

    if (isCraftItem) {
      if (normalizedCode.includes("invalid-argument")) return "レシピ指定が不正です";
      if (normalizedCode.includes("failed-precondition")) return "素材 or クレジットが足りません";
    } else if (normalizedCode.includes("failed-precondition")) {
      return "クレジットが不足しています";
    }

    if (message.includes("insufficient-tokens")) return "ScanTokenが不足しています";
    if (message.includes("insufficient-credits")) return "クレジットが不足しています";
    if (message) return message;
  }
  return "購入に失敗しました";
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
        toast.error("ショップの読み込みに失敗しました");
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
      toast.error("Failed to start checkout");
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
      toast.success(isCraftItem ? "クラフト完了！" : "購入完了！");
    } catch (error) {
      console.error("Purchase failed:", error);
      const item = SHOP_ITEMS.find((entry) => entry.id === itemId);
      const isCraftItem = typeof item?.tokenCost === "number";
      const message = getErrorMessage(error, isCraftItem);
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
          <Card key={item.id} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CategoryIcon category={item.category} />
                {item.nameJa}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{item.descriptionJa}</p>
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-primary">
                  {typeof item.tokenCost === "number"
                    ? `素材: Token ${item.tokenCost} + ${item.price} クレジット`
                    : `${item.price} クレジット`}
                </span>
                <span className="text-muted-foreground">所持: {inventory[item.id] ?? 0}</span>
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
                  {typeof item.tokenCost === "number" ? "クラフト" : "購入"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col pb-24">
      <header className="flex items-center mb-6 max-w-4xl mx-auto w-full">
        <Link href="/">
          <Button variant="ghost" className="mr-4">
            <ArrowLeft className="h-5 w-5 mr-2" />
            戻る
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-primary">ショップ</h1>
        <div className="ml-auto text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full flex flex-wrap items-center gap-3">
          <span>Lv {level}</span>
          <span>XP {xp}</span>
          <span>💰 {credits} クレジット</span>
          <span>🧩 {scanTokens} ScanToken</span>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full space-y-8">
        {/* Coin Shop Section */}
        <section>
          <h2 className="text-xl font-bold mb-4 text-primary">コイン購入</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PRODUCTS.map((product) => (
              <Card key={product.id} className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="aspect-square bg-secondary/20 rounded-lg flex items-center justify-center text-4xl">
                    💰
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-500">{product.amount} Coins</div>
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
              </Card>
            ))}
          </div>
        </section>

        {errorMessage && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{errorMessage}</p>}

        <section>
          <h2 className="text-xl font-bold mb-4 text-primary">アイテムショップ</h2>
          <Tabs defaultValue="boost" className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              {categories.map(cat => (
                <TabsTrigger key={cat} value={cat} className="flex items-center gap-2">
                  <CategoryIcon category={cat} />
                  {getCategoryLabel(cat)}
                </TabsTrigger>
              ))}
            </TabsList>
            {categories.map(cat => (
              <TabsContent key={cat} value={cat} className="mt-4">
                {renderItems(cat)}
              </TabsContent>
            ))}
          </Tabs>
        </section>
      </main>
    </div>
  );
}
