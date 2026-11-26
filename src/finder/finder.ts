// The rofi-like finder: a bar and the list of bookmarks below it
//
// add:  typing filters the paths, arrows move the selection, Enter after the
//       arrows (or Tab, or a click) copies the selected path into the bar;
//       Enter on the bar asks to confirm the save, Ctrl+Enter saves at once
// open: typing filters paths and URLs, arrows move the selection,
//       Enter/click opens the bookmark in a new tab

import type { Bookmark, Mode, Request, Response } from "../protocol.ts";
import { rank, type Result } from "./fuzzy.ts";

export interface FinderOptions {
  mode: Mode;
  pageUrl: string;
  send(request: Request): Promise<Response>;
  close(): void;
}

// edit:      typing in the bar
// confirm:   the dialog asks to confirm the save
// overwrite: the dialog asks to confirm overwriting an existing path
// busy:      a request is running
type Stage = "edit" | "confirm" | "overwrite" | "busy";

// Rendering thousands of rows makes typing sluggish
const MAX_ROWS = 300;
const PAGE = 10;
const HOST_HELP = "run `tempesta native-host install`";

export function createFinder(
  container: HTMLElement,
  options: FinderOptions,
): void {
  const { mode, pageUrl, send, close } = options;

  const input = element("input", "input");
  input.type = "text";
  input.spellcheck = false;
  input.autocomplete = "off";
  input.placeholder = mode === "add" ? "path/of/the/bookmark" : "search";
  const count = element("span", "count");
  const bar = element("div", "bar");
  bar.append(element("span", "prompt", mode), input, count);
  const list = element("ul", "list");
  const status = element("div", "status");
  const dialog = element("div", "dialog");
  const panel = element("div", `panel ${mode}`);
  panel.append(bar, list, status);
  // The dialog covers the panel: a click around its box goes back to the bar
  dialog.addEventListener("mousedown", (event) => {
    event.preventDefault();
    if (event.target === dialog && stage !== "busy") {
      hideDialog();
    }
  });
  container.append(panel, dialog);

  let bookmarks: Bookmark[] = [];
  let results: Result[] = [];
  let selected = 0;
  // add: the selection is shown, and taken by Enter, only once the arrows
  // moved it; typing hides it again
  let navigated = false;
  let stage: Stage = "edit";
  let stopProgress = (): void => undefined;

  function setStage(next: Stage): void {
    stage = next;
    // The bar keeps the focus but cannot change while the dialog is open
    input.readOnly = next !== "edit";
  }

  function setStatus(text: string, level: "" | "warn" | "error" = ""): void {
    stopProgress();
    status.textContent = text;
    status.className = `status ${level}`;
  }

  // add: the page to save and the shortcut that skips the confirmation
  function defaultStatus(): void {
    if (mode === "open") {
      setStatus("");
      return;
    }
    setStatus("");
    status.className = "status idle";
    status.append(
      element("span", "page", `→ ${pageUrl}`),
      element("span", "keys", "ctrl+enter save without confirmation"),
    );
  }

  // A spinner and the elapsed seconds, shown after the first second
  function showProgress(target: HTMLElement, label: string): void {
    stopProgress();
    const text = element("span", "", label);
    target.replaceChildren(element("span", "spinner"), text);
    const start = Date.now();
    if (target === status) {
      status.className = "status";
    }
    const timer = setInterval(() => {
      const seconds = Math.floor((Date.now() - start) / 1000);
      text.textContent = seconds > 0 ? `${label} ${seconds}s` : label;
    }, 250);
    stopProgress = () => {
      clearInterval(timer);
      stopProgress = () => undefined;
    };
  }

  function update(): void {
    results = rank(bookmarks, input.value, mode === "open");
    selected = 0;
    navigated = false;
    count.textContent = `${results.length}/${bookmarks.length}`;
    render();
  }

  function showsSelection(): boolean {
    return mode === "open" || navigated;
  }

  function render(): void {
    const rows = results.slice(0, MAX_ROWS).map((result, index) => {
      const row = element("li", "item");
      row.classList.toggle("selected", showsSelection() && index === selected);
      row.append(highlight(result), element("span", "url", result.bookmark.url));
      // Keep the focus in the bar
      row.addEventListener("mousedown", (event) => event.preventDefault());
      row.addEventListener("click", () => {
        if (stage !== "edit") {
          return;
        }
        selected = index;
        if (mode === "add") {
          complete();
        } else {
          void openSelected();
        }
      });
      return row;
    });
    list.replaceChildren(...rows);
  }

  function move(delta: number): void {
    const last = Math.min(results.length, MAX_ROWS) - 1;
    if (last < 0) {
      return;
    }
    list.children[selected]?.classList.remove("selected");
    if (showsSelection()) {
      selected = Math.max(0, Math.min(last, selected + delta));
    } else {
      // add: the first arrow shows the selection on the first row
      navigated = true;
      selected = 0;
    }
    const row = list.children[selected];
    row?.classList.add("selected");
    row?.scrollIntoView({ block: "nearest" });
  }

  // add: copy the selected path into the bar
  function complete(): void {
    const result = results[selected];
    if (!result) {
      return;
    }
    input.value = result.bookmark.path;
    defaultStatus();
    update();
    input.focus();
  }

  function showDialog(title: string, hint: string): void {
    const path = input.value.trim();
    const box = element("div", "box");
    const footer = element("div", "hint", hint);
    box.append(
      element("div", "title", title),
      element("div", "target", path),
      element("div", "url", pageUrl),
      footer,
    );
    dialog.replaceChildren(box);
    dialog.classList.add("open");
  }

  function hideDialog(): void {
    stopProgress();
    dialog.classList.remove("open");
    dialog.replaceChildren();
    setStage("edit");
  }

  // add: Enter on the bar
  function confirmSave(): void {
    if (!input.value.trim()) {
      setStatus("type a path", "warn");
      return;
    }
    setStage("confirm");
    showDialog("save", "Enter save · Esc back");
  }

  async function save(overwrite: boolean): Promise<void> {
    const path = input.value.trim();
    if (!path) {
      setStatus("type a path", "warn");
      return;
    }
    setStage("busy");
    showDialog(overwrite ? "overwrite" : "save", "");
    const hint = dialog.querySelector<HTMLElement>(".hint");
    if (hint) {
      showProgress(hint, "saving…");
    }
    const response = await request({
      type: "add",
      path,
      url: pageUrl,
      overwrite,
    });
    if (response.ok) {
      close();
    } else if (response.code === "exists") {
      stopProgress();
      setStage("overwrite");
      showDialog(
        "already exists",
        "Enter overwrite (keeps the tags) · Esc back",
      );
    } else {
      hideDialog();
      showError(response.code, response.message);
    }
  }

  // open: Enter or click
  async function openSelected(): Promise<void> {
    const result = results[selected];
    if (!result) {
      return;
    }
    setStage("busy");
    showProgress(status, "opening…");
    const response = await request({ type: "open", url: result.bookmark.url });
    setStage("edit");
    if (response.ok) {
      close();
    } else if (response.code === "exists") {
      setStatus("unexpected response", "error");
    } else {
      showError(response.code, response.message);
    }
  }

  function request(message: Request): Promise<Response> {
    return send(message).catch(
      (e: unknown): Response => ({
        ok: false,
        code: "error",
        message: e instanceof Error ? e.message : String(e),
      }),
    );
  }

  function showError(code: "error" | "host", message: string): void {
    setStatus(
      code === "host" ? `tempesta not reachable (${message}): ${HOST_HELP}` : message,
      "error",
    );
  }

  // Like rofi, the finder closes when the focus leaves it within the page
  // (keyboard extensions such as Vimium blur the focused field on Esc). When
  // the whole window loses the focus (another window or workspace, the focus
  // following the mouse) the finder stays open and takes the focus back with
  // the window. The check waits for the focus to settle
  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (input.isConnected && document.hasFocus() && !hasFocus()) {
        close();
      }
    });
  });
  const refocus = (): void => {
    if (!input.isConnected) {
      window.removeEventListener("focus", refocus);
      return;
    }
    input.focus();
  };
  window.addEventListener("focus", refocus);
  panel.addEventListener("mousedown", (event) => {
    if (event.target !== input) {
      event.preventDefault();
    }
    // The page had no focus when the finder opened (e.g. the focus was in the
    // address bar): a click on the panel brings it to the bar
    input.focus();
  });

  function hasFocus(): boolean {
    const root = input.getRootNode() as Document | ShadowRoot;
    return root.activeElement === input;
  }

  input.addEventListener("input", () => {
    defaultStatus();
    update();
  });

  input.addEventListener("keydown", (event) => {
    if (stage !== "edit") {
      // The dialog takes every key
      event.preventDefault();
      if (event.key === "Escape") {
        if (stage === "busy") {
          close();
        } else {
          hideDialog();
        }
      } else if (event.key === "Enter" && stage !== "busy") {
        void save(stage === "overwrite");
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        move(1);
        break;
      case "ArrowUp":
        move(-1);
        break;
      case "PageDown":
        move(PAGE);
        break;
      case "PageUp":
        move(-PAGE);
        break;
      case "Tab":
        if (mode === "add") {
          complete();
        } else {
          move(event.shiftKey ? -1 : 1);
        }
        break;
      case "Enter":
        if (mode === "open") {
          void openSelected();
        } else if (event.ctrlKey || event.metaKey) {
          void save(false);
        } else if (navigated) {
          complete();
        } else {
          confirmSave();
        }
        break;
      case "Escape":
        close();
        break;
      default:
        return;
    }
    event.preventDefault();
  });

  showProgress(status, "loading…");
  input.focus();
  // The page or the browser can still move the focus while the finder opens
  requestAnimationFrame(() => {
    if (input.isConnected && !hasFocus()) {
      input.focus();
    }
  });
  void request({ type: "list" }).then((response) => {
    if (response.ok) {
      bookmarks = response.bookmarks ?? [];
      defaultStatus();
      update();
    } else if (response.code !== "exists") {
      showError(response.code, response.message);
    }
  });
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

// The path with the matched characters in bold
function highlight(result: Result): HTMLElement {
  const path = element("span", "path");
  const positions = new Set(result.positions);
  let plain = "";
  const flush = () => {
    if (plain) {
      path.append(plain);
      plain = "";
    }
  };
  [...result.bookmark.path].forEach((char, index) => {
    if (positions.has(index)) {
      flush();
      path.append(element("b", "match", char));
    } else {
      plain += char;
    }
  });
  flush();
  return path;
}
