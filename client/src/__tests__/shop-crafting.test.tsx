import { describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { httpsCallable } from "firebase/functions";
import { getFirestoreMock, renderWithRouter, setAuthState } from "./test-utils";
import { SHOP_ITEMS } from "@/lib/items";

describe("Shop crafting", () => {
  it("renders crafting recipes and calls craftItem", async () => {
    const uid = "user-shop-1";
    setAuthState({ user: { uid }, loading: false });

    const firestore = getFirestoreMock();
    firestore.setDoc(`users/${uid}`, { credits: 100, scanTokens: 2, xp: 12, level: 3 });
    firestore.setCollection(`users/${uid}/inventory`, [{ id: "BOOST", data: { qty: 0 } }]);

    const craftMock = vi.fn(async () => ({
      data: {
        credits: 90,
        scanTokens: 1,
        inventoryDelta: { itemId: "BOOST", qty: 1, totalQty: 1 },
      },
    }));

    vi.mocked(httpsCallable).mockImplementationOnce(() => craftMock);

    const userEventInstance = userEvent.setup();
    renderWithRouter("/shop");

    const battleTab = await screen.findByRole("tab", { name: "バトルアイテム" });
    await userEventInstance.click(battleTab);

    const craftable = SHOP_ITEMS.filter(
      (item) => item.category === "battle" && typeof item.tokenCost === "number"
    );
    const expectedItem = craftable[0];

    const craftButtons = await screen.findAllByRole("button", { name: "クラフト" });
    await userEventInstance.click(craftButtons[0]);

    await act(async () => {
      await Promise.resolve();
    });

    expect(craftMock).toHaveBeenCalled();
    const payload = craftMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(payload).toEqual({ recipeId: expectedItem.id, qty: 1 });
  });
});
