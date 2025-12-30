import { describe, expect, it } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithRouter, setAuthState } from "./test-utils";

describe("auth guard", () => {
  it("redirects unauthenticated users from /dex to /login", async () => {
    setAuthState({ user: null, loading: false });
    renderWithRouter("/dex");

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/login");
    });
    expect(screen.getByText("Login")).toBeInTheDocument();
  });

  it("redirects unauthenticated users from /workshop to /login", async () => {
    setAuthState({ user: null, loading: false });
    renderWithRouter("/workshop");

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/login");
    });
    expect(screen.getByText("Login")).toBeInTheDocument();
  });
});
