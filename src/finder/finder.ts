// The rofi-like finder: a bar and the list of bookmarks below it
//
// add:  typing filters the paths, click/Tab copies the selected path into the
//       bar, Enter saves the page at the path in the bar
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
  const panel = element("div", `panel ${mode}`);
  panel.append(bar, list, status);
  container.append(panel);

  let bookmarks: Bookmark[] = [];
  let results: Result[] = [];
  let selected = 0;
  let confirming = false;
  let busy = false;

  function setStatus(text: string, level: "" | "warn" | "error" = ""): void {
    status.textContent = text;
    status.className = `status ${level}`;
  }

  function defaultStatus(): void {
    setStatus(mode === "add" ? `→ ${pageUrl}` : "");
  }

  function update(): void {
    results = rank(bookmarks, input.value, mode === "open");
    selected = 0;
    count.textContent = `${results.length}/${bookmarks.length}`;
    render();
  }

  function render(): void {
    const rows = results.slice(0, MAX_ROWS).map((result, index) => {
      const row = element("li", "item");
      row.classList.toggle("selected", index === selected);
      row.append(highlight(result), element("span", "url", result.bookmark.url));
      // Keep the focus in the bar
      row.addEventListener("mousedown", (event) => event.preventDefault());
      row.addEventListener("click", () => {
        selected = index;
        if (mode === "add") {
          complete();
        } else {
          void submit();
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
    selected = Math.max(0, Math.min(last, selected + delta));
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
    confirming = false;
    defaultStatus();
    update();
    input.focus();
  }

  async function submit(): Promise<void> {
    if (busy) {
      return;
    }
    if (mode === "open") {
      const result = results[selected];
      if (result) {
        await run({ type: "open", url: result.bookmark.url }, "opening…");
      }
      return;
    }
    const path = input.value.trim();
    if (!path) {
      setStatus("type a path", "warn");
      return;
    }
    await run(
      { type: "add", path, url: pageUrl, overwrite: confirming },
      "saving…",
    );
  }

  async function run(request: Request, progress: string): Promise<void> {
    busy = true;
    setStatus(progress);
    const response = await send(request).catch(
      (e: unknown): Response => ({
        ok: false,
        code: "error",
        message: e instanceof Error ? e.message : String(e),
      }),
    );
    busy = false;
    if (response.ok) {
      close();
    } else if (response.code === "exists") {
      confirming = true;
      setStatus(
        `${input.value.trim()} already exists: Enter to overwrite, Esc to cancel`,
        "warn",
      );
    } else {
      showError(response.code, response.message);
    }
  }

  function showError(code: "error" | "host", message: string): void {
    setStatus(
      code === "host" ? `tempesta not reachable (${message}): ${HOST_HELP}` : message,
      "error",
    );
  }

  // Like rofi, losing the focus closes the finder (keyboard extensions such
  // as Vimium blur the focused field on Esc). Clicks inside the panel keep the
  // focus in the bar
  input.addEventListener("blur", () => close());
  panel.addEventListener("mousedown", (event) => {
    if (event.target !== input) {
      event.preventDefault();
    }
  });

  input.addEventListener("input", () => {
    confirming = false;
    defaultStatus();
    update();
  });

  input.addEventListener("keydown", (event) => {
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
        void submit();
        break;
      case "Escape":
        if (confirming) {
          confirming = false;
          defaultStatus();
        } else {
          close();
        }
        break;
      default:
        return;
    }
    event.preventDefault();
  });

  setStatus("loading…");
  input.focus();
  void send({ type: "list" }).then((response) => {
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
