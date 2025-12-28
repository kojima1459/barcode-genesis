import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { httpsCallable } from "firebase/functions";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { db, functions } from "@/lib/firebase";
import { SHOP_ITEMS } from "@/lib/items";
import { toast } from "sonner";

type InventoryMap = Record<string, number>;

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return "Purchase failed";
};

export default function Shop() {
  const { user } = useAuth();
  const [credits, setCredits] = useState(0);
  const [inventory, setInventory] = useState<InventoryMap>({});
  const [loading, setLoading] = useState(true);
  const [purchaseQty, setPurchaseQty] = useState<Record<string, number>>({});
  const [purchasingItemId, setPurchasingItemId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
        } else {
          setCredits(0);
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
        toast.error("Failed to load shop");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const qtyOptions = useMemo(() => Array.from({ length: 10 }, (_, index) => index + 1), []);

  const handlePurchase = async (itemId: string) => {
    if (!user) return;
    setErrorMessage(null);
    setPurchasingItemId(itemId);
    try {
      const qty = purchaseQty[itemId] ?? 1;
      const purchase = httpsCallable(functions, "purchaseItem");
      const result = await purchase({ itemId, qty });
      const data = result.data as { credits: number; inventoryDelta: { itemId: string; qty: number; totalQty: number } };

      setCredits(data.credits);
      setInventory((prev) => ({
        ...prev,
        [data.inventoryDelta.itemId]: data.inventoryDelta.totalQty
      }));
      toast.success("Purchase complete");
    } catch (error) {
      console.error("Purchase failed:", error);
      const message = getErrorMessage(error);
      setErrorMessage(message);
    } finally {
      setPurchasingItemId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      <header className="flex items-center mb-6 max-w-4xl mx-auto w-full">
        <Link href="/">
          <Button variant="ghost" className="mr-4">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-primary">Shop</h1>
        <div className="ml-auto text-sm text-muted-foreground">Credits: {credits}</div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full space-y-4">
        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SHOP_ITEMS.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{item.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">Price: {item.price}</div>
                <div className="text-sm text-muted-foreground">
                  Owned: {inventory[item.id] ?? 0}
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
                    disabled={purchasingItemId === item.id}
                  >
                    {purchasingItemId === item.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    Buy
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
