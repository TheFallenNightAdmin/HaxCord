/**
 * AlwaysOnTop - HaxCord built-in plugin
 * Keeps Discord window above all other windows via Electron's setAlwaysOnTop
 */

const { remote } = require("electron");

module.exports = {
  _manifest: {
    name: "AlwaysOnTop",
    version: "1.0.0",
    description: "Keep Discord always on top of other windows",
    author: "HaxCord",
    builtin: true,
  },

  start() {
    try {
      const win = remote.getCurrentWindow();
      win.setAlwaysOnTop(true);
      console.log("[AlwaysOnTop] Enabled");
    } catch (e) {

      try {
        const { ipcRenderer } = require("electron");
        ipcRenderer.invoke("haxcord-always-on-top", true);
      } catch (_) {
        console.warn("[AlwaysOnTop] Could not set always-on-top:", e.message);
      }
    }
  },

  stop() {
    try {
      const win = remote.getCurrentWindow();
      win.setAlwaysOnTop(false);
    } catch (_) {}
    console.log("[AlwaysOnTop] Disabled");
  },
};
