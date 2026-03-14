# HaxCord

A Discord client mod with plugin support. Built on Electron asar patching.

## Structure

```
haxcord/
├── scripts/
│   ├── install.js       # Patches Discord, injects HaxCord
│   └── uninstall.js     # Restores original Discord
├── src/
│   ├── core/
│   │   ├── loader.js        # Entry point injected into Discord
│   │   ├── HaxCord.js       # Main init, ties everything together
│   │   ├── webpack.js       # Discord module finder
│   │   ├── patcher.js       # Function patching (before/after/instead)
│   │   └── pluginManager.js # Plugin lifecycle management
│   └── ui/
│       └── settings.js      # Settings panel injected into Discord
└── plugins/
    └── ExamplePlugin.js     # Example plugin
```

## Install

```bash
# Install dependencies
npm install

# Inject into Discord (close Discord first)
npm run inject

# Open Discord - HaxCord is now running
```

## Uninstall

```bash
npm run uninject
```

## Writing Plugins

Drop a `.js` file into the `plugins/` folder:

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

    const unpatch = Patcher.before("MyPlugin", MessageActions, "sendMessage", (args) => {
      console.log("Sending message:", args);
    });

    this._unpatch = unpatch;
  },

  stop() {
    this._unpatch?.();
  },
};
```

## Plugin API

### `window.HaxCord.Webpack`

| Method | Description |
|--------|-------------|
| `getByProps(...props)` | Find module with these properties |
| `getByDisplayName(name)` | Find React component by display name |
| `getModule(filter)` | Find module by custom filter function |
| `getAll(filter)` | Get all modules matching filter |

### `window.HaxCord.Patcher`

| Method | Description |
|--------|-------------|
| `before(caller, module, method, fn)` | Run before original, can modify args |
| `after(caller, module, method, fn)` | Run after original, can modify return value |
| `instead(caller, module, method, fn)` | Replace function entirely |
| `unpatchAll(caller)` | Remove all patches by caller name |

### `window.HaxCord.PluginManager`

| Method | Description |
|--------|-------------|
| `getAll()` | Get all loaded plugins |
| `enable(name)` | Enable a plugin |
| `disable(name)` | Disable a plugin |
