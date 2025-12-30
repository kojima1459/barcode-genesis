import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithRouter, setAuthState } from "./test-utils";

describe("how-to page", () => {
  it("redirects unauthenticated users from /how-to to /login", async () => {
    setAuthState({ user: null, loading: false });
    renderWithRouter("/how-to");

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/login");
    });
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("renders the how-to page for authenticated users", () => {
    setAuthState({ user: { uid: "user-1" }, loading: false });
    renderWithRouter("/how-to");

    expect(screen.getByText("遊び方")).toBeInTheDocument();
    expect(screen.getByText("30秒で理解 → 1分でスキャン → 3分で初バトル")).toBeInTheDocument();
  });

  it("shows CTA buttons for core actions", () => {
    setAuthState({ user: { uid: "user-1" }, loading: false });
    renderWithRouter("/how-to");

    expect(screen.getByRole("button", { name: "スキャンへ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "バトルへ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "図鑑へ" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "工房へ" })).toBeInTheDocument();
  });
});
