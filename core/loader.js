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

// Check if Discord has updated and re-inject if needed
try {
    require(path.join(__dirname, "..", "DiscordUpdater.js")).checkAndUpdate();
} catch (e) {
    console.error("[HaxCord] DiscordUpdater failed:", e);
}

// loader.js runs in Discord's main process — require the injector
// which patches BrowserWindow to inject our preload into the renderer
try {
    require(path.join(__dirname, "..", "data", "injector.js"));
    console.log("[HaxCord] Injector loaded.");
} catch (e) {
    console.error("[HaxCord] Failed to load injector:", e);
}
