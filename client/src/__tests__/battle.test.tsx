import { describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { renderWithRouter, getFirestoreMock, setAuthState } from "./test-utils";

describe("Battle page data access", () => {
  it("does not perform cross-user collectionGroup reads on render", async () => {
    setAuthState({ user: { uid: "user-789" }, loading: false });
    renderWithRouter("/battle");

    const firestore = getFirestoreMock();
    await waitFor(() => {
      expect(firestore.collectionGroup).not.toHaveBeenCalled();
    });
  });
});
