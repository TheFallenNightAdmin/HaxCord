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
                // Pass Discord's original preload path to our preload via additionalArguments
                // so it can chain it. Our preload becomes the entry point and requires the
                // original Discord preload first before running HaxCord.
                options.webPreferences.additionalArguments = options.webPreferences.additionalArguments || [];
                options.webPreferences.additionalArguments.push(`--haxcord-original-preload=${existingPreload}`);
                options.webPreferences.preload = preloadPath;
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
