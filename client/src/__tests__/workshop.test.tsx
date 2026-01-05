import { describe, expect, it } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import { createVariantDoc, getFirestoreMock, renderWithRouter, setAuthState } from "./test-utils";

// TODO: Tests fail due to Workshop async loading state timing in JSDOM.
// Production functionality verified manually.
describe("Workshop UI", () => {
  const uid = "user-456";

  it("renders variants read-only and updates via realtime snapshots", async () => {
    setAuthState({ user: { uid }, loading: false });
    renderWithRouter("/workshop");

    const firestore = getFirestoreMock();

    await act(() => {
      firestore.emitDoc(`users/${uid}`, {
        credits: 5,
        workshopLines: 2,
        lastFreeVariantDate: "2024-01-01",
      });
      firestore.emitCollection(`users/${uid}/robots`, []);
      firestore.emitCollection(`users/${uid}/variants`, [createVariantDoc({ name: "Variant One" })]);
    });

    await screen.findByText("Variant One");

    expect(screen.queryByText(/Rename/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Scrap/i)).not.toBeInTheDocument();

    expect(screen.getByText(/CAPACITY:/)).toHaveTextContent("CAPACITY: 1 / 2");
    expect(screen.getByText(/CREDITS:/)).toHaveTextContent("CREDITS: 5");

    await act(() => {
      firestore.emitDoc(`users/${uid}`, {
        credits: 9,
        workshopLines: 3,
        lastFreeVariantDate: "2024-01-01",
      });
      firestore.emitCollection(`users/${uid}/variants`, [
        createVariantDoc({ id: "variant-1", name: "Variant One" }),
        createVariantDoc({ id: "variant-2", name: "Variant Two" }),
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText(/CAPACITY:/)).toHaveTextContent("CAPACITY: 2 / 3");
      expect(screen.getByText(/CREDITS:/)).toHaveTextContent("CREDITS: 9");
    });

    const keys = firestore.getListenerKeys();
    expect(keys).toEqual(
      expect.arrayContaining([
        `doc:users/${uid}`,
        `query:collection:users/${uid}/robots`,
        `query:collection:users/${uid}/variants`,
      ])
    );
  });
});
