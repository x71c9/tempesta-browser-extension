// Messages between the finder, the background script and the tempesta
// native messaging host

export const HOST_NAME = "com.x71c9.tempesta";

export type Mode = "add" | "open";

export interface Bookmark {
  path: string;
  url: string;
  tags: string[];
}

// Finder -> background
export type Request =
  | { type: "list" }
  | { type: "add"; path: string; url: string; overwrite: boolean }
  | { type: "open"; url: string; tabId?: number };

// Background -> content script
export interface ShowMessage {
  type: "show";
  mode: Mode;
  pageUrl: string;
}

// Native host responses, plus `host` when the host cannot be reached
export type Response =
  | { ok: true; bookmarks?: Bookmark[]; version?: string }
  | { ok: false; code: "exists" }
  | { ok: false; code: "error" | "host"; message: string };

// Manifest commands and the finder mode they open
export const COMMANDS: Record<string, Mode> = {
  "tempesta-add": "add",
  "tempesta-open": "open",
};
