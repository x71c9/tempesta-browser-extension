// The finder in a popup window, for pages where scripts cannot be injected

import { api } from "./api.ts";
import { createFinder } from "./finder/finder.ts";
import css from "./finder/style.css";
import type { Request, Response } from "./protocol.ts";

const params = new URLSearchParams(location.search);
const tabId = Number(params.get("tabId"));

const style = document.createElement("style");
style.textContent = css;
document.head.append(style);
const container = document.createElement("div");
container.className = "backdrop fallback";
document.body.append(container);

createFinder(container, {
  mode: params.get("mode") === "add" ? "add" : "open",
  pageUrl: params.get("pageUrl") ?? "",
  // Bookmarks open next to the tab the window was opened from
  send: (request: Request) =>
    api.runtime.sendMessage<Request, Response>(
      request.type === "open" ? { ...request, tabId } : request,
    ),
  close: () => window.close(),
});

// Like the overlay closing on a click outside of it
window.addEventListener("blur", () => window.close());
