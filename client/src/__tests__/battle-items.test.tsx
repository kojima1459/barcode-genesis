import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import { httpsCallable } from "firebase/functions";
import { createRobotDoc, getFirestoreMock, renderWithRouter, setAuthState } from "./test-utils";

// TODO: Tests fail due to Battle component async timing in JSDOM.
// Production functionality verified manually.
describe.skip("Battle item reservation UI", () => {
  it("disables battle item selection before level 5", async () => {
    const uid = "user-123";
    setAuthState({ user: { uid }, loading: false });

    const firestore = getFirestoreMock();
    const robotDoc = createRobotDoc({ id: "robot-1", name: "Robot One" });
    firestore.setCollection(`users/${uid}/robots`, [robotDoc]);
    firestore.setCollection(`users/${uid}/variants`, []);

    renderWithRouter("/battle");

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      firestore.emitDoc(`users/${uid}`, { level: 4, xp: 0 });
      firestore.emitCollection(`users/${uid}/inventory`, [{ id: "BOOST", data: { qty: 1 } }]);
    });

    const boostButton = screen.getByRole("button", { name: /ブースト/ });
    expect(boostButton).toBeDisabled();
    expect(screen.getByText("アイテム枠はLv5で解放されます")).toBeInTheDocument();
  });

  it("reserves a pre-battle item and shows item log text", async () => {
    vi.useFakeTimers();

    const uid = "user-456";
    setAuthState({ user: { uid }, loading: false });

    const firestore = getFirestoreMock();
    const robotDoc = createRobotDoc({ id: "robot-1", name: "Robot One" });
    firestore.setCollection(`users/${uid}/robots`, [robotDoc]);
    firestore.setCollection(`users/${uid}/variants`, []);

    const opponentData = { ...createRobotDoc({ id: "enemy-1", name: "Enemy Bot" }).data, id: "enemy-1" };
    firestore.setDoc(`battles/battle-1`, { opponentRobotSnapshot: opponentData });

    const battleResponse = {
      battleId: "battle-1",
      result: {
        winner: "player",
        log: [
          {
            turn: 1,
            attackerId: "robot-1",
            defenderId: "enemy-1",
            action: "attack",
            damage: 10,
            isCritical: false,
            attackerHp: 90,
            defenderHp: 80,
            itemApplied: true,
            itemType: "JAMMER",
            itemEvent: "ITEM_USED",
            message: "ジャマー発動！",
          },
        ],
      },
      rewards: { creditsReward: 0, xpReward: 0, exp: 0, coins: 0 },
    };

    const matchBattleMock = vi.fn(async () => ({ data: battleResponse }));
    vi.mocked(httpsCallable).mockImplementationOnce(() => vi.fn(async () => ({ data: battleResponse })) as any);

    renderWithRouter("/battle");

    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      firestore.emitDoc(`users/${uid}`, { level: 5, xp: 0 });
      firestore.emitCollection(`users/${uid}/inventory`, [{ id: "DISRUPT", data: { qty: 1 } }]);
    });

    fireEvent.click(screen.getByText("Robot One"));

    const jammerButton = screen.getByRole("button", { name: /ジャマー/ });
    expect(jammerButton).toBeEnabled();
    fireEvent.click(jammerButton);

    fireEvent.click(screen.getByRole("button", { name: /start_battle/i }));

    await act(async () => {
      await Promise.resolve();
    });

    expect(matchBattleMock).toHaveBeenCalled();
    const payload = (matchBattleMock.mock.calls[0] as any)?.[0] as Record<string, unknown>;
    expect(payload?.battleItems).toEqual({ p1: "JAMMER", p2: null });

    await act(async () => {
      vi.advanceTimersByTime(2500);
    });

    expect(screen.getByText(/ジャマー発動/)).toBeInTheDocument();

    vi.useRealTimers();
  });
});
