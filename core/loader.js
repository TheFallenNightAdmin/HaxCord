const fs = require("fs");
const path = require("path");

// Support Windows, macOS, and Linux
const appData = process.env.APPDATA
    || (process.platform === "darwin"
        ? path.join(process.env.HOME, "Library/Application Support")
        : path.join(process.env.HOME, ".config"));

const base = path.join(appData, "HaxCord");

global.HaxCord = {
    plugins: new Map(),
    version: "0.2.0"
};

// loader.js runs in Discord's main process — require the injector
// which patches BrowserWindow to inject our preload into the renderer
try {
    require(path.join(__dirname, "..", "data", "injector.js"));
    console.log("[HaxCord] Injector loaded.");
} catch (e) {
    console.error("[HaxCord] Failed to load injector:", e);
}
