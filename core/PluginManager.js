/**
 * HaxCord Plugin Manager
 * Loads plugins from the plugins directory, manages their lifecycle
 */

const path = require("path");
const fs = require("fs");

const PLUGINS_DIR = path.join(__dirname, "../../plugins");

const PluginManager = {
  plugins: new Map(),

  async init() {
    if (!fs.existsSync(PLUGINS_DIR)) {
      fs.mkdirSync(PLUGINS_DIR, { recursive: true });
    }

    const entries = fs.readdirSync(PLUGINS_DIR);

    for (const entry of entries) {
      const pluginPath = path.join(PLUGINS_DIR, entry);
      const stat = fs.statSync(pluginPath);

      if (stat.isDirectory()) {
        await this._loadPlugin(pluginPath);
      } else if (entry.endsWith(".js")) {
        await this._loadPlugin(pluginPath);
      }
    }

    console.log(`[HaxCord/Plugins] Loaded ${this.plugins.size} plugin(s)`);
  },

  async _loadPlugin(pluginPath) {
    try {
      let instance;

      if (fs.statSync(pluginPath).isDirectory()) {
        const manifestPath = path.join(pluginPath, "manifest.json");
        const indexPath = path.join(pluginPath, "index.js");

        if (!fs.existsSync(indexPath)) return;

        const manifest = fs.existsSync(manifestPath)
          ? JSON.parse(fs.readFileSync(manifestPath, "utf8"))
          : { name: path.basename(pluginPath), version: "1.0.0" };

        instance = require(indexPath);
        instance._manifest = manifest;
      } else {
        instance = require(pluginPath);
        if (!instance._manifest) {
          instance._manifest = {
            name: path.basename(pluginPath, ".js"),
            version: "1.0.0",
          };
        }
      }

      const name = instance._manifest.name;
      const enabled = this._isEnabled(name);

      this.plugins.set(name, { manifest: instance._manifest, instance, enabled });

      if (enabled) {
        await this._start(name);
      }
    } catch (e) {
      console.error(`[HaxCord/Plugins] Failed to load ${pluginPath}:`, e);
    }
  },

  async _start(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) return;
    try {
      if (typeof plugin.instance.start === "function") {
        await plugin.instance.start();
      }
      plugin.enabled = true;
      console.log(`[HaxCord/Plugins] Started: ${name}`);
    } catch (e) {
      console.error(`[HaxCord/Plugins] Error starting ${name}:`, e);
    }
  },

  async _stop(name) {
    const plugin = this.plugins.get(name);
    if (!plugin) return;
    try {
      if (typeof plugin.instance.stop === "function") {
        await plugin.instance.stop();
      }

      const Patcher = require("./patcher");
      Patcher.unpatchAll(name);
      plugin.enabled = false;
      console.log(`[HaxCord/Plugins] Stopped: ${name}`);
    } catch (e) {
      console.error(`[HaxCord/Plugins] Error stopping ${name}:`, e);
    }
  },

  async enable(name) {
    await this._start(name);
    this._saveEnabled(name, true);
  },

  async disable(name) {
    await this._stop(name);
    this._saveEnabled(name, false);
  },

  getAll() {
    return Array.from(this.plugins.values());
  },

  _getSettings() {
    try {
      const settingsPath = path.join(__dirname, "../../haxcord-settings.json");
      if (fs.existsSync(settingsPath)) {
        return JSON.parse(fs.readFileSync(settingsPath, "utf8"));
      }
    } catch (_) {}
    return { enabledPlugins: [] };
  },

  _saveSettings(settings) {
    const settingsPath = path.join(__dirname, "../../haxcord-settings.json");
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  },

  _isEnabled(name) {
    const settings = this._getSettings();

    if (!settings.disabledPlugins) return true;
    return !settings.disabledPlugins.includes(name);
  },

  _saveEnabled(name, enabled) {
    const settings = this._getSettings();
    if (!settings.disabledPlugins) settings.disabledPlugins = [];
    if (!enabled && !settings.disabledPlugins.includes(name)) {
      settings.disabledPlugins.push(name);
    } else if (enabled) {
      settings.disabledPlugins = settings.disabledPlugins.filter((n) => n !== name);
    }
    this._saveSettings(settings);
  },
};

module.exports = PluginManager;
