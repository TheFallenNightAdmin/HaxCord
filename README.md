# HaxCord

A lightweight Discord client mod built on Electron asar injection. HaxCord adds a plugin system, theme support, live CSS editing, and a built-in settings panel — all without touching Discord's source files.

---
# Visit The Website
https://haxcord.vercel.app
---

## Features

- **Plugin System** — Drop `.js` files into your plugins folder to extend Discord
- **Theme Support** — Load and switch CSS themes from inside Discord
- **Custom CSS** — Live CSS editor with real-time preview (open with `Ctrl+Shift+K`)
- **Webpack Module Access** — Find and patch any Discord internal module at runtime
- **Function Patcher** — Intercept functions before, after, or replace them entirely
- **GUI Installer** — Simple standalone installer for Windows, macOS, and Linux
- **Auto-Updater** — Fetches the latest release automatically on install

---

## Installation

### Using the Installer (Recommended)

Download the latest installer for your platform from [Releases](https://github.com/TheFallenNightAdmin/HaxCord/releases):

| Platform | File |
|----------|------|
| Windows  | `HaxCord-Windows.exe` |
| macOS    | `HaxCord-Mac.zip` |
| Linux    | `HaxCord-Linux.AppImage` |

Run the installer, select your Discord channel (Stable / PTB / Canary), and click **Install**. Discord will restart automatically with HaxCord active.

### Manual Install

```bash
# Clone the repo
git clone https://github.com/TheFallenNightAdmin/HaxCord.git
cd HaxCord

# Install dependencies
npm install

# Close Discord first, then inject
npm run inject
```

To remove HaxCord:

```bash
npm run uninject
```

---

## Built-in Plugins

These plugins ship with HaxCord and are available out of the box:

| Plugin | Description |
|--------|-------------|
| **CustomCSS** | Live CSS editor. Open with `Ctrl+Shift+K`, changes apply instantly. |
| **NoTypingIndicators** | Hides the "X is typing..." indicator in all channels. |
| **AlwaysOnTop** | Keeps the Discord window above all other windows. |
| **ShowTimezones** | Shows a user's local time in their profile. Add `[tz:Region/City]` to your bio to use it. |
| **MusicMenu** | Floating music player inside Discord. Search and play YouTube and SoundCloud tracks. |
| **MenuDuo** | Combined music player (`Alt+M`) and theme switcher (`Esc`) in one plugin. |
| **LocalThemeSwitcher** | Randomly applies one of your installed themes on startup. Press `Esc` to open the switcher. |

---

## Writing Plugins

Drop a `.js` file into your `plugins` folder (`%appdata%/HaxCord/plugins` on Windows):

```js
module.exports = {
  _manifest: {
    name: "MyPlugin",
    version: "1.0.0",
    description: "Does something cool",
    author: "You",
  },

  start() {
    const { Webpack, Patcher } = window.HaxCord;

    const MessageActions = Webpack.getByProps("sendMessage");

    this._unpatch = Patcher.before("MyPlugin", MessageActions, "sendMessage", (args) => {
      console.log("Message args:", args);
    });
  },

  stop() {
    this._unpatch?.();
  },
};
```

Plugins can also be folders with an `index.js` and an optional `manifest.json`.

---

## Plugin API

### `window.HaxCord.Webpack`

| Method | Description |
|--------|-------------|
| `getByProps(...props)` | Find a module by its property names |
| `getByDisplayName(name)` | Find a React component by display name |
| `getModule(filter)` | Find a module using a custom filter function |
| `getAll(filter)` | Get all modules matching a filter |

### `window.HaxCord.Patcher`

| Method | Description |
|--------|-------------|
| `before(caller, module, method, fn)` | Run before the original — can modify arguments |
| `after(caller, module, method, fn)` | Run after the original — can modify the return value |
| `instead(caller, module, method, fn)` | Replace the function entirely |
| `unpatchAll(caller)` | Remove all patches registered under a caller name |

### `window.HaxCord.PluginManager`

| Method | Description |
|--------|-------------|
| `getAll()` | Returns all loaded plugins |
| `enable(name)` | Enables a plugin by name |
| `disable(name)` | Disables a plugin by name |

---

## Themes

Place `.theme.css` files in `%appdata%/HaxCord/themes`. HaxCord ships with several themes:

- **Hax** — Default HaxCord theme
- **Midnight** — Dark midnight-toned theme
- **Luna** — Soft lunar aesthetic
- **BlismaCorps** — Clean corporate style
- **Newbie** — Beginner-friendly minimal theme
- **TIO** — Contrast-focused theme

Use the **LocalThemeSwitcher** or **MenuDuo** plugin to switch themes from inside Discord.

---

## Project Structure

```
HaxCord/
├── core/
│   ├── loader.js          # Entry point injected into Discord
│   ├── Webpack.js         # Discord module finder
│   ├── Patcher.js         # Function patching (before/after/instead)
│   └── PluginManager.js   # Plugin lifecycle management
├── data/
│   ├── injector.js        # Asar injector
│   ├── preload.js         # Electron preload script
│   └── renderer.js        # Renderer process entry
├── installer/             # GUI installer (Electron + Svelte)
├── plugins/               # Built-in and user plugins
├── themes/                # Built-in themes
├── CustomCSS.js           # Live CSS editor
├── settings.js            # Settings panel injected into Discord
├── Updater.js             # Auto-update logic
└── registry.json          # Plugin registry
```

---

## License

MIT © 2026 TheFallenNightAdmin
