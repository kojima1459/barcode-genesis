import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { getFirestoreMock, renderWithRouter, setAuthState } from "./test-utils";

describe("Reduced motion preference", () => {
  it("renders battle screen without crashing", async () => {
    (globalThis as any).__prefersReducedMotion = true;
    const uid = "user-reduce-1";
    setAuthState({ user: { uid }, loading: false });

    const firestore = getFirestoreMock();
    firestore.setCollection(`users/${uid}/robots`, []);
    firestore.setCollection(`users/${uid}/variants`, []);

    renderWithRouter("/battle");

    await waitFor(() => {
      expect(screen.getByText("battle_arena")).toBeInTheDocument();
    });

    (globalThis as any).__prefersReducedMotion = false;
  });
});
