// Handles the keyboard commands and bridges the finder to the native host

import { api } from "./api.ts";
import {
  COMMANDS,
  HOST_NAME,
  type Mode,
  type Request,
  type Response,
  type ShowMessage,
} from "./protocol.ts";

const FALLBACK_WIDTH = 1000;
const FALLBACK_HEIGHT = 440;

const SHORTCUTS_MENU_ITEM = "tempesta-shortcuts";

let fallbackWindowId: number | undefined;

api.commands.onCommand.addListener((command, tab) => {
  const mode = COMMANDS[command];
  if (mode) {
    void show(mode, tab);
  }
});

// A click on the toolbar icon is about the current page: add it
api.action.onClicked.addListener((tab) => {
  void show("add", tab);
});

api.contextMenus.onClicked.addListener((info, tab) => {
  const mode = COMMANDS[info.menuItemId];
  if (mode) {
    void show(mode, tab);
  } else if (info.menuItemId === SHORTCUTS_MENU_ITEM) {
    void api.runtime.openOptionsPage();
  }
});

api.runtime.onInstalled.addListener(async ({ reason }) => {
  await createMenu();
  if (reason !== "install") {
    return;
  }
  // Browsers silently drop default shortcuts that conflict with existing ones
  const commands = await api.commands.getAll();
  if (commands.some((command) => !command.shortcut)) {
    await api.runtime.openOptionsPage();
  }
});

// Right click menu of the toolbar icon
async function createMenu(): Promise<void> {
  await api.contextMenus.removeAll();
  const items = [
    { id: "tempesta-add", title: "Add this page" },
    { id: "tempesta-open", title: "Open a bookmark" },
    { id: "separator", type: "separator" as const },
    { id: SHORTCUTS_MENU_ITEM, title: "Keyboard shortcuts…" },
  ];
  for (const item of items) {
    api.contextMenus.create({ ...item, contexts: ["action"] });
  }
}

api.runtime.onMessage.addListener((message: Request, sender, sendResponse) => {
  void handle(message, sender).then(sendResponse);
  // Keep the channel open for the asynchronous response
  return true;
});

api.windows.onRemoved.addListener((windowId) => {
  if (windowId === fallbackWindowId) {
    fallbackWindowId = undefined;
  }
});

async function show(mode: Mode, tab?: chrome.tabs.Tab): Promise<void> {
  // The same shortcut closes the fallback window
  if (fallbackWindowId !== undefined) {
    await api.windows.remove(fallbackWindowId).catch(() => undefined);
    fallbackWindowId = undefined;
    return;
  }
  tab ??= (await api.tabs.query({ active: true, currentWindow: true }))[0];
  if (tab?.id === undefined) {
    return;
  }
  const message: ShowMessage = { type: "show", mode, pageUrl: tab.url ?? "" };
  try {
    await api.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    await api.tabs.sendMessage(tab.id, message);
  } catch {
    // Pages that do not allow scripts (browser pages, stores, new tab)
    await showFallback(mode, tab);
  }
}

async function showFallback(mode: Mode, tab: chrome.tabs.Tab): Promise<void> {
  const parent = await api.windows.get(tab.windowId);
  const left = (parent.left ?? 0) + ((parent.width ?? 0) - FALLBACK_WIDTH) / 2;
  const top = (parent.top ?? 0) + ((parent.height ?? 0) - FALLBACK_HEIGHT) / 4;
  const params = new URLSearchParams({
    mode,
    tabId: String(tab.id),
    pageUrl: tab.url ?? "",
  });
  const window = await api.windows.create({
    url: api.runtime.getURL(`fallback.html?${params}`),
    type: "popup",
    width: FALLBACK_WIDTH,
    height: FALLBACK_HEIGHT,
    left: Math.max(0, Math.round(left)),
    top: Math.max(0, Math.round(top)),
  });
  fallbackWindowId = window?.id;
}

async function handle(
  message: Request,
  sender: chrome.runtime.MessageSender,
): Promise<Response> {
  switch (message.type) {
    case "list":
      return native({ action: "list" });
    case "add":
      return native({
        action: "add",
        path: message.path,
        url: message.url,
        overwrite: message.overwrite,
      });
    case "open":
      return open(message.url, message.tabId ?? sender.tab?.id);
  }
}

async function native(request: object): Promise<Response> {
  try {
    return (await api.runtime.sendNativeMessage(HOST_NAME, request)) as Response;
  } catch (e) {
    return { ok: false, code: "host", message: errorMessage(e) };
  }
}

// Opens the URL in a new tab next to the tab the finder was opened from
async function open(url: string, tabId?: number): Promise<Response> {
  try {
    const source =
      tabId === undefined
        ? undefined
        : await api.tabs.get(tabId).catch(() => undefined);
    await api.tabs.create({
      url,
      windowId: source?.windowId,
      index: source ? source.index + 1 : undefined,
    });
    if (source) {
      await api.windows.update(source.windowId, { focused: true });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, code: "error", message: errorMessage(e) };
  }
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
