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
Save and open bookmarks from the keyboard, with tempesta, the plain-text bookmark manager for the command line.

Two shortcuts open a small search bar over the current page:

- Alt+Shift+D saves the current page: typing filters the existing folders, Tab completes the path, Enter saves.
- Alt+Shift+O opens a saved bookmark: a few letters of its name or address are enough, Enter opens it in a new tab.

The toolbar icon opens the save bar; its right-click menu offers both actions. Shortcuts can be changed in the browser settings.

Bookmarks are plain text files in ~/.bookmark-store, one per bookmark, optionally synchronized with git, and shared with the tempesta command line. Nothing is stored in the browser and nothing is sent anywhere.

Setup (Linux and macOS):

1. Install tempesta: https://github.com/x71c9/tempesta (AUR, Nix, Homebrew or prebuilt binaries)
2. Run: tempesta init
3. Run: tempesta native-host install

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
