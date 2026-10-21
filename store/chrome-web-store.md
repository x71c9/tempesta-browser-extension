# Chrome Web Store listing

Values entered by hand in the Chrome Web Store Developer Dashboard.

## Store listing

- Category: Productivity / Tools
- Language: English
- Store icon: `icons/icon-128.png`
- Screenshots (1280x800): `store/screenshots/1-open.png`,
  `store/screenshots/2-open-search.png`, `store/screenshots/3-add.png`
- Small promo tile (440x280): `store/screenshots/promo-tile-440x280.png`
- Homepage URL: https://github.com/x71c9/tempesta-browser-extension
- Support URL: https://github.com/x71c9/tempesta-browser-extension/issues

### Description

```
Browser integration for tempesta, the bookmark manager CLI inspired by pass.

Two keyboard shortcuts open a minimal rofi-like fuzzy finder over the current page:

- Alt+Shift+D adds the current page to the bookmark store: the list of saved paths helps picking the folder, Tab copies a path into the bar, Enter saves.
- Alt+Shift+O opens a saved bookmark: typing filters paths and URLs, arrows move the selection, Enter opens it in a new tab.

A click on the toolbar icon opens the finder in add mode; its right click menu offers both modes.

Bookmarks are plain TOML files in ~/.bookmark-store, optionally versioned with git, shared with the tempesta command line and scripts. Nothing is stored in the browser and nothing is sent anywhere.

Requirements: the tempesta CLI (https://github.com/x71c9/tempesta) with its native messaging host registered:

    tempesta native-host install

Source code: https://github.com/x71c9/tempesta-browser-extension
```

## Privacy practices

### Single purpose

```
Adds the current page to, and opens bookmarks from, the tempesta bookmark store on the local machine through a keyboard-driven fuzzy finder.
```

### Permission justifications

- nativeMessaging:
  `Reads and writes bookmarks through the tempesta command line program installed on the computer, which owns the bookmark store. The extension has no other storage.`
- activeTab:
  `Shows the finder over the current page and reads its URL, only when a keyboard shortcut, the toolbar icon or its menu is used.`
- scripting:
  `Injects the finder into the current page after a user action that granted activeTab.`
- contextMenus:
  `Adds "Add this page", "Open a bookmark" and "Keyboard shortcuts" to the toolbar icon menu.`

### Remote code

No, the extension does not use remote code.

### Data usage

No data collected: leave every category unchecked and certify the three
statements (no sale of data, no use unrelated to the single purpose, no
creditworthiness use).

Privacy policy URL:
https://github.com/x71c9/tempesta-browser-extension/blob/master/PRIVACY.md
