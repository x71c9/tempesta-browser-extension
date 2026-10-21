// Injected on demand by the background script: shows the finder over the
// page inside a closed shadow root, hosted by a modal dialog

import { api } from "./api.ts";
import { createFinder } from "./finder/finder.ts";
import css from "./finder/style.css";
import type { Mode, Request, Response, ShowMessage } from "./protocol.ts";

declare global {
  var tempestaLoaded: boolean | undefined;
}

const HOST_STYLE = [
  "all: initial",
  "display: block",
  "position: fixed",
  "inset: 0",
  "width: 100%",
  "height: 100%",
  "z-index: 2147483647",
]
  .map((rule) => `${rule} !important;`)
  .join(" ");

interface Overlay {
  mode: Mode;
  host: HTMLDialogElement;
  previousFocus: Element | null;
}

let overlay: Overlay | undefined;

// Injection runs on every shortcut: register the listener only once
if (!globalThis.tempestaLoaded) {
  globalThis.tempestaLoaded = true;
  api.runtime.onMessage.addListener((message: ShowMessage) => {
    if (message.type !== "show") {
      return;
    }
    // The same shortcut closes the finder, the other one switches mode
    const previousMode = overlay?.mode;
    close();
    if (previousMode !== message.mode) {
      show(message.mode, message.pageUrl || location.href);
    }
  });
}

function show(mode: Mode, pageUrl: string): void {
  // The most recent modal dialog is the only interactive part of the page:
  // modal dialogs and focus traps of the page (e.g. cookie banners) cannot
  // take the focus away from the finder
  const host = document.createElement("dialog");
  host.setAttribute("style", HOST_STYLE);
  // Dialogs cannot host a shadow root
  const root = document.createElement("div");
  // The closed shadow root hides the focused bar from keyboard extensions
  // (Vimium, Surfingkeys, ...): an editable host lets them pass keys through
  root.contentEditable = "true";
  const shadow = root.attachShadow({ mode: "closed" });
  const style = document.createElement("style");
  style.textContent = css;
  const backdrop = document.createElement("div");
  backdrop.className = "backdrop";
  backdrop.addEventListener("mousedown", (event) => {
    if (event.target === backdrop) {
      close();
    }
  });
  shadow.append(style, backdrop);
  host.append(root);
  // Keep page shortcuts and focus handlers from reacting
  for (const type of ["keydown", "keyup", "keypress", "focusin", "focusout"]) {
    host.addEventListener(type, (event) => event.stopPropagation());
  }
  // Esc reaching the dialog when the page swallowed the key event
  host.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  overlay = { mode, host, previousFocus: document.activeElement };
  document.documentElement.append(host);
  host.showModal();
  createFinder(backdrop, {
    mode,
    pageUrl,
    send: (request: Request) =>
      api.runtime.sendMessage<Request, Response>(request),
    close,
  });
}

function close(): void {
  if (!overlay) {
    return;
  }
  overlay.host.close();
  overlay.host.remove();
  if (overlay.previousFocus instanceof HTMLElement) {
    overlay.previousFocus.focus();
  }
  overlay = undefined;
}
