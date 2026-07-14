import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Mock server-only for tests
vi.mock("server-only", () => ({}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
}));

// Mock ResizeObserver which is needed by some layout operations
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock fetch
global.fetch = vi.fn(async () => {
  throw new Error(
    "Unexpected fetch call. Mock fetch explicitly inside this test."
  );
}) as typeof fetch;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Polyfill randomUUID for jsdom if needed
if (!global.crypto) {
  Object.defineProperty(global, "crypto", {
    value: {
      randomUUID: (() => {
        let d = new Date().getTime();
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
          const r = (d + Math.random() * 16) % 16 | 0;
          d = Math.floor(d / 16);
          return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        });
      }) as any,
    },
  });
} else if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = (() => {
    let d = new Date().getTime();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }) as any;
}
