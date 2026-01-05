import { describe, expect, it, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { httpsCallable } from "firebase/functions";
import { getFirestoreMock, renderWithRouter, setAuthState } from "./test-utils";
import { SHOP_ITEMS } from "@/lib/items";

// TODO: Tests fail due to Shop async loading state timing in JSDOM.
// Production functionality verified manually.
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

    vi.mocked(httpsCallable).mockImplementationOnce(() => craftMock as any);

    const userEventInstance = userEvent.setup();
    renderWithRouter("/shop");

    // All categories are now visible without needing to click tabs
    // Wait for shop to load and find craft buttons
    const craftButtons = await screen.findAllByRole("button", { name: /クラフト|Craft/i });
    await userEventInstance.click(craftButtons[0]);

    await act(async () => {
      await Promise.resolve();
    });

    expect(craftMock).toHaveBeenCalled();
    const payload = (craftMock.mock.calls[0] as any)?.[0] as Record<string, unknown>;
    // First craft button corresponds to first craftable item in the list
    const craftableItems = SHOP_ITEMS.filter(item => typeof item.tokenCost === "number");
    expect(payload).toEqual({ recipeId: craftableItems[0].id, qty: 1 });
  });
});
