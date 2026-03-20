"use strict";

/**
 * HaxCord Injector
 * Runs in Discord's main process via discord_desktop_core/index.js
 * Patches BrowserWindow to inject our preload ALONGSIDE Discord's own preload
 */

const path = require("path");
const Module = require("module");

const preloadPath = path.join(__dirname, "preload.js");

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
    const result = originalLoad.apply(this, arguments);

    if (request !== "electron") return result;
    if (!result || !result.BrowserWindow) return result;
    if (result.BrowserWindow.__haxcordPatched) return result;

    const OriginalBrowserWindow = result.BrowserWindow;

    class PatchedBrowserWindow extends OriginalBrowserWindow {
        constructor(options = {}) {
            if (!options.webPreferences) options.webPreferences = {};

            const existingPreload = options.webPreferences.preload;

            if (existingPreload && existingPreload !== preloadPath) {
                // Keep Discord's original preload — inject ours via additionalArguments
                // so Discord's own boot process is NOT interrupted
                try {
                    const preloads = options.webPreferences.additionalPreloads || [];
                    options.webPreferences.preload = existingPreload; // keep original
                    // Use session preloads instead — safer than replacing
                    super(options);
                    // After window is created, register our preload in the session
                    this.webContents.session.setPreloads([
                        ...this.webContents.session.getPreloads().filter(p => p !== preloadPath),
                        preloadPath
                    ]);
                    return;
                }
                catch (e) {
                    // fallback — just keep original preload, skip ours for this window
                    options.webPreferences.preload = existingPreload;
                    super(options);
                    return;
                }
            }

            super(options);
        }
    }

    PatchedBrowserWindow.__haxcordPatched = true;

    Object.keys(OriginalBrowserWindow).forEach(key => {
        try { PatchedBrowserWindow[key] = OriginalBrowserWindow[key]; }
        catch (e) { /* skip read-only */ }
    });

    try {
        Object.defineProperty(result, "BrowserWindow", {
            get: () => PatchedBrowserWindow,
            configurable: true
        });
    }
    catch (e) {
        console.error("[HaxCord] Failed to patch BrowserWindow:", e);
    }

    return result;
};

console.log("[HaxCord] Injector loaded.");
