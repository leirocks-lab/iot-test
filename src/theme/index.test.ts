import { describe, expect, it } from "vitest";

import { rowanTheme } from "./index";

describe("ROWAN design tokens", () => {
  it("ROWAN theme exposes required semantic colors", () => {
    const requiredColors = [
      "background",
      "surface",
      "text",
      "mutedText",
      "primary",
      "success",
      "warning",
      "danger",
    ] as const;

    for (const color of requiredColors) {
      expect(rowanTheme.colors[color], `${color} should be populated`).toBeTypeOf("string");
      expect(rowanTheme.colors[color], `${color} should be populated`).not.toHaveLength(0);
    }
  });
});
