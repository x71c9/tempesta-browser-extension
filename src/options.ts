// Options page: current keyboard shortcuts and a link to the browser page
// where they are changed (extensions cannot change them in Chromium)

import { api } from "./api.ts";
import css from "./options.css";
import { COMMANDS } from "./protocol.ts";

const CHROMIUM_SHORTCUTS = "chrome://extensions/shortcuts";
const REPOSITORY_URL = "https://github.com/x71c9/tempesta-browser-extension";

interface ShortcutCommands {
  openShortcutSettings?: () => Promise<void>;
}

const style = document.createElement("style");
style.textContent = css;
document.head.append(style);

const main = document.createElement("main");
const title = document.createElement("h1");
title.textContent = "Tempesta";
const heading = document.createElement("h2");
heading.textContent = "Keyboard shortcuts";
const table = document.createElement("table");
const button = document.createElement("button");
button.textContent = "Change shortcuts";
const footer = document.createElement("footer");
const repository = document.createElement("a");
repository.href = REPOSITORY_URL;
repository.target = "_blank";
repository.rel = "noopener";
const star = document.createElement("span");
star.className = "star";
star.textContent = "★";
repository.append(star, " Star tempesta-browser-extension on GitHub");
footer.append(repository);
main.append(title, heading, table, button, footer);
document.body.append(main);

async function render(): Promise<void> {
  const commands = await api.commands.getAll();
  const rows = commands
    .filter((command) => command.name && COMMANDS[command.name])
    .map((command) => {
      const row = document.createElement("tr");
      const mode = document.createElement("td");
      mode.className = `mode ${COMMANDS[command.name ?? ""]}`;
      mode.textContent = COMMANDS[command.name ?? ""] ?? "";
      const description = document.createElement("td");
      description.textContent = command.description ?? "";
      const shortcut = document.createElement("td");
      if (command.shortcut) {
        const key = document.createElement("kbd");
        key.textContent = command.shortcut;
        shortcut.append(key);
      } else {
        shortcut.className = "unset";
        shortcut.textContent = "not set";
      }
      row.append(mode, description, shortcut);
      return row;
    });
  table.replaceChildren(...rows);
}

button.addEventListener("click", async () => {
  // Firefox opens its own shortcut settings, Chromium only through its URL
  const commands = api.commands as typeof api.commands & ShortcutCommands;
  if (commands.openShortcutSettings) {
    await commands.openShortcutSettings();
  } else {
    await api.tabs.create({ url: CHROMIUM_SHORTCUTS });
  }
});

// Shortcuts may have changed in the other tab
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    void render();
  }
});

void render();
