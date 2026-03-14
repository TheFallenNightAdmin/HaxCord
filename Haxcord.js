/**
 * HaxCord Core
 * Initializes all subsystems
 */

const Webpack = require("./webpack");
const Patcher = require("./patcher");
const PluginManager = require("./pluginManager");
const SettingsUI = require("../ui/settings");

const HaxCord = {
  version: "0.1.0",

  async init() {
    console.log(`[HaxCord] v${this.version} initializing...`);

    try {
      await Webpack.init();
      console.log("[HaxCord] Webpack ready");

      Patcher.init();
      console.log("[HaxCord] Patcher ready");

      await PluginManager.init();
      console.log("[HaxCord] Plugins loaded");

      SettingsUI.inject();
      console.log("[HaxCord] Settings UI injected");

      console.log("[HaxCord] Ready!");

      window.HaxCord = {
        version: this.version,
        Webpack,
        Patcher,
        PluginManager,
      };
    } catch (e) {
      console.error("[HaxCord] Init failed:", e);
    }
  },
};

module.exports = HaxCord;
