// Firefox exposes the `browser` namespace, Chromium only `chrome`: both
// return promises in Manifest V3
export const api: typeof chrome =
  (globalThis as { browser?: typeof chrome }).browser ?? chrome;
