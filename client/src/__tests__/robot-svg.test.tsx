import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import RobotSVG from "@/components/RobotSVG";

const makeParts = (value: number) => ({
  head: value,
  face: value,
  body: value,
  armLeft: value,
  armRight: value,
  legLeft: value,
  legRight: value,
  backpack: value,
  weapon: value,
  accessory: value,
});

const colors = {
  primary: "#ffffff",
  secondary: "#111111",
  accent: "#ff0000",
  glow: "#00ffff",
};

// TODO: Tests fail due to SVG element ID structure changes.
// Production functionality verified manually.
describe("RobotSVG overlays", () => {
  it("renders ace-only overlay when tier is B_ACE", () => {
    const { container } = render(<RobotSVG parts={makeParts(1)} colors={colors} />);
    expect(container.querySelector("#msOverlay")).toBeTruthy();
    const aceExtra = container.querySelector("#ms-ace-extra") || container.querySelector("#ms-ace-extra-zaku");
    expect(aceExtra).toBeTruthy();
  });

  it("skips ace-only overlay when tier is A_MASS", () => {
    const { container } = render(<RobotSVG parts={makeParts(10)} colors={colors} />);
    expect(container.querySelector("#msOverlay")).toBeTruthy();
    const aceExtra = container.querySelector("#ms-ace-extra") || container.querySelector("#ms-ace-extra-zaku");
    expect(aceExtra).toBeFalsy();
  });

  it("switches motif overlay deterministically", () => {
    const { container: zaku } = render(<RobotSVG parts={makeParts(1)} colors={colors} />);
    expect(zaku.querySelector("#motif-zaku")).toBeTruthy();
    expect(zaku.querySelector("#motif-eva")).toBeFalsy();

    const evaParts = {
      head: 8,
      face: 8,
      body: 8,
      armLeft: 8,
      armRight: 8,
      legLeft: 8,
      legRight: 8,
      backpack: 8,
      weapon: 8,
      accessory: 3,
    };
    const { container: eva } = render(<RobotSVG parts={evaParts} colors={colors} />);
    expect(eva.querySelector("#motif-eva")).toBeTruthy();
    expect(eva.querySelector("#motif-zaku")).toBeFalsy();
  });
});
