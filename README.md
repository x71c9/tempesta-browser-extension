<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)"
      srcset="https://raw.githubusercontent.com/x71c9/tempesta-browser-extension/HEAD/.github/logo-dark.svg">
    <source media="(prefers-color-scheme: light)"
      srcset="https://raw.githubusercontent.com/x71c9/tempesta-browser-extension/HEAD/.github/logo-light.svg">
    <img alt="Tempesta logo" width="160"
      src="https://raw.githubusercontent.com/x71c9/tempesta-browser-extension/HEAD/.github/logo-light.svg">
  </picture>
</div>

# tempesta-browser-extension

Browser extension for [tempesta](https://github.com/x71c9/tempesta), the
bookmark manager CLI inspired by `pass`. Two keyboard shortcuts open a minimal
rofi-like fuzzy finder over the current page, backed by the same
`~/.bookmark-store` used on the command line.

Built for Firefox and Chromium-based browsers (Chromium, Chrome, Brave) from a
single code base.

## Install

| Browser | Store |
| ------- | ----- |
| Firefox | [addons.mozilla.org](https://addons.mozilla.org/firefox/addon/tempesta-browser-extension/) |
| Chromium, Chrome, Brave | [Chrome Web Store](https://chromewebstore.google.com/detail/mmghkkaaciolnpicbbmdhieeginfpkmf) |

The extension does nothing on its own: it needs `tempesta` registered as its
native messaging host (see [Requirements](#requirements)). Packages of every
version are also attached to the
[GitHub releases](https://github.com/x71c9/tempesta-browser-extension/releases).

## How it works

```
finder (overlay or popup window) -> background script -> tempesta (native messaging host) -> ~/.bookmark-store
```

The extension has no access to the filesystem: every read and write goes
through `tempesta`, registered as a
[native messaging host](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Native_messaging).
Bookmarks added from the browser are committed and pushed exactly like
`tempesta add` does, when the git backend is enabled.

## Requirements

- `tempesta` 0.3.0 or later (the first version with the `native-host`
  command), initialized with `tempesta init`
- the native messaging host registered for the browser in use:

```bash
tempesta native-host install                    # every installed browser
tempesta native-host install --browser firefox  # firefox, chromium, chrome, brave
```

When the host cannot be started, the finder shows
`tempesta not reachable (...)` with the browser error.

### Declarative setup (Nix)

`tempesta native-host install --print` writes the host manifest to stdout
instead of installing it, so that it can be generated at build time. A
home-manager example that installs the extension from the stores (both
browsers then keep it on the latest version) and registers the host:

```nix
let
  tempesta = pkgs.nur.repos.x71c9.tempesta;
  nativeHost = browser: pkgs.runCommand "tempesta-native-host-${browser}.json" { } ''
    ${tempesta}/bin/tempesta native-host install --browser ${browser} \
      --path ${tempesta}/bin/tempesta --print > $out
  '';
in
{
  home.packages = [ tempesta ];

  home.file.".mozilla/native-messaging-hosts/com.x71c9.tempesta.json".source = nativeHost "firefox";
  programs.firefox.policies.ExtensionSettings."tempesta-browser-extension@x71c9.com" = {
    install_url = "https://addons.mozilla.org/firefox/downloads/latest/tempesta-browser-extension/latest.xpi";
    installation_mode = "force_installed";
  };

  home.file.".config/chromium/NativeMessagingHosts/com.x71c9.tempesta.json".source = nativeHost "chromium";
  programs.chromium.extensions = [ { id = "mmghkkaaciolnpicbbmdhieeginfpkmf"; } ];
}
```

Chromium reads user-level hosts from `<user-data-dir>/NativeMessagingHosts`:
profiles started with `--user-data-dir` do not see the manifest in
`~/.config/chromium`. A system-wide manifest in
`/etc/chromium/native-messaging-hosts` (NixOS: `environment.etc`) serves every
profile, and the `ExtensionInstallForcelist` policy installs the extension in
every profile.

## Usage

| Shortcut      | Command                                         |
| ------------- | ----------------------------------------------- |
| `Alt+Shift+D` | Add the current page to the bookmark store      |
| `Alt+Shift+O` | Open a bookmark from the bookmark store         |

A click on the toolbar icon opens the finder in add mode; its right click menu
offers both modes and the keyboard shortcuts.

Shortcuts are configurable in `about:addons` → *Manage Extension Shortcuts*
(Firefox) and `chrome://extensions/shortcuts` (Chromium). The extension options
page lists the current shortcuts and links to those settings; browsers drop
a default shortcut that conflicts with an existing one, so on install the
options page opens when a shortcut is left unassigned.

Pressing the same shortcut again, `Esc` or a click outside the finder closes
it. On pages that do not allow extensions (browser pages, extension stores,
the new tab page) the finder opens in a small popup window instead.

### Add

The list shows every saved path; typing filters it.

| Key / action    | Effect                                                  |
| --------------- | ------------------------------------------------------- |
| `Tab` / click   | Copy the selected path into the bar                     |
| `↑` `↓`         | Move the selection                                      |
| `Enter`         | Save the current page at the path written in the bar    |

When the path already exists, a second `Enter` overwrites it (keeping its
tags) and `Esc` cancels.

### Open

Typing filters the bookmarks by path and URL (path matches rank higher);
space separated terms must all match.

| Key / action          | Effect                                    |
| --------------------- | ----------------------------------------- |
| `↑` `↓` `Tab` `PgUp` `PgDn` | Move the selection                  |
| `Enter` / click       | Open the selected bookmark in a new tab   |

## Development

```bash
npm install
npm run build      # dist/chromium and dist/firefox
npm run watch      # rebuild on change
npm test           # fuzzy matcher unit tests
npm run lint       # type check + web-ext lint
```

`scripts/dev-run <firefox|chromium>` builds the extension and starts the
browser against a throwaway bookmark store in `.dev/`, seeded with a copy of
the bookmark files in `~/.bookmark-store`. The native host binary defaults to
`../tempesta/target/debug/tempesta` (override with `TEMPESTA_BIN`). For
Firefox the host manifest is installed in `~/.mozilla/native-messaging-hosts`,
the only location Firefox reads; for Chromium it is placed inside the
throwaway profile.

`scripts/icons` renders `icons/icon.svg` into the PNG sizes (requires
`rsvg-convert`).

### Layout

| Path                   | Content                                              |
| ---------------------- | ---------------------------------------------------- |
| `manifests/`           | Shared manifest, merged with the per-browser parts   |
| `src/background.ts`    | Commands, injection, native host bridge, tab opening |
| `src/content.ts`       | Finder overlay in a closed shadow root               |
| `src/fallback.*`       | Finder in a popup window for restricted pages        |
| `src/finder/`          | Finder UI, fuzzy matcher, stylesheet                 |
| `src/protocol.ts`      | Messages exchanged with the background and the host  |
| `src/options.*`        | Options page: shortcuts and links                    |
| `store/`               | Store listing metadata                               |
| `scripts/`             | Development, packaging and publishing scripts       |
| `.github/workflows/`   | PR validation, release and publishing pipelines      |

### Extension IDs

- Firefox: `tempesta-browser-extension@x71c9.com`
- Chromium (Chrome Web Store item; unpacked builds get the same ID from the
  `key` in `manifests/chromium.json`, the public key of the store item):
  `mmghkkaaciolnpicbbmdhieeginfpkmf`

Both are allowed by the host manifests written by `tempesta native-host install`.

## Building from source

The published packages are built with Node.js 24 and npm 11:

```bash
npm ci
node build.mjs --release   # dist/chromium and dist/firefox, without the development key
scripts/package            # artifacts/: store packages and source archive
```

The output is bundled with esbuild but not minified.

## Release

Releases are started by hand (see [CONTRIBUTING.md](CONTRIBUTING.md)):
`release.yml` bumps the version of `master` and pushes the tag, `publish.yml`
creates the GitHub release and submits the version to both stores for review.
Merging a PR into `master` does not release anything.

| Setting | Kind | Used by |
| ------------------------ | -------- | ------------------------------------------------------ |
| `BYPASS_BRANCH_RULE_PAT` | secret   | `release`: pushes the version bump and the tag          |
| `AMO_JWT_ISSUER`         | secret   | `publish`: addons.mozilla.org API key                   |
| `AMO_JWT_SECRET`         | secret   | `publish`: addons.mozilla.org API secret                |
| `CWS_PUBLISHER_ID`       | variable | `publish`: Chrome Web Store publisher                   |
| `CWS_EXTENSION_ID`       | variable | `publish`: Chrome Web Store item                        |

The Chrome Web Store is reached without stored credentials, through Workload
Identity Federation: Google trusts GitHub Actions tokens issued for release tags
of this repository and lets them act as a service account registered with the
Chrome Web Store publisher. `scripts/setup-cws-publishing` creates the Google
Cloud side.

Listing metadata for addons.mozilla.org lives in `store/amo-metadata.json`.

## License

MIT

---

### Credits

Logo credits [https://www.jacopotripodi.com/](https://www.jacopotripodi.com/)
