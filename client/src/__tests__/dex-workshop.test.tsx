import { describe, expect, it } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRobotDoc, createVariantDoc, getFirestoreMock, renderWithRouter, setAuthState } from "./test-utils";

describe("Dex -> Workshop wiring", () => {
  const uid = "user-123";

  it("uses robot id when selecting from Robots tab", async () => {
    setAuthState({ user: { uid }, loading: false });
    renderWithRouter("/dex");

    const firestore = getFirestoreMock();
    const robot = createRobotDoc({ name: "Alpha" });
    robot.id = "robot-alpha";
    await act(() => {
      firestore.emitCollection(`users/${uid}/robots`, [robot]);
      firestore.emitCollection(`users/${uid}/variants`, []);
    });

    // Switch to Robots tab (Collection is now default)
    const robotsTab = screen.getByRole("tab", { name: /Robots/i });
    await userEvent.click(robotsTab);

    await screen.findByText("Alpha");
    const button = await screen.findByRole("button", { name: /工房で使用|Use in workshop/i });
    await userEvent.click(button);

    expect(screen.getByTestId("location")).toHaveTextContent("/workshop?a=robot-alpha");
  });

  it("uses parentRobotIds when selecting from Variants tab", async () => {
    setAuthState({ user: { uid }, loading: false });
    renderWithRouter("/dex");

    const firestore = getFirestoreMock();
    await act(() => {
      firestore.emitCollection(`users/${uid}/robots`, []);
    });
    const variant = createVariantDoc({ name: "Fusion X", parentRobotIds: ["robot-a", "robot-b"] });
    variant.id = "variant-x";
    await act(() => {
      firestore.emitCollection(`users/${uid}/variants`, [variant]);
    });

    const tab = screen.getByRole("tab", { name: /Variants/i });
    await userEvent.click(tab);

    await screen.findByText("Fusion X");
    const button = await screen.findByRole("button", { name: /工房で使用|Use in workshop/i });
    await userEvent.click(button);

    expect(screen.getByTestId("location")).toHaveTextContent("/workshop?a=robot-a&b=robot-b");
  });

  it("disables variant workshop button when parents are missing", async () => {
    setAuthState({ user: { uid }, loading: false });
    renderWithRouter("/dex");

    const firestore = getFirestoreMock();
    await act(() => {
      firestore.emitCollection(`users/${uid}/robots`, []);
    });
    const variant = createVariantDoc({ name: "Broken Variant", parentRobotIds: [] });
    variant.id = "variant-broken";
    await act(() => {
      firestore.emitCollection(`users/${uid}/variants`, [variant]);
    });

    const tab = screen.getByRole("tab", { name: /Variants/i });
    await userEvent.click(tab);

    await screen.findByText("Broken Variant");
    const button = await screen.findByRole("button", { name: /工房で使用/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("title", "親ロボットが未登録です");
  });
});
