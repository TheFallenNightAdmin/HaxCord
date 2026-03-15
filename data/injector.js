"use strict";

/**
 * HaxCord Injector v2
 * Runs in Discord's main process via loader.js
 * Patches BrowserWindow to inject our preload into renderer windows
 */

const path = require("path");
const Module = require("module");

const preloadPath = path.join(__dirname, "preload.js");

let patched = false;

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
    const result = originalLoad.apply(this, arguments);

    if (patched) return result;
    if (request !== "electron") return result;
    if (!result || !result.BrowserWindow) return result;
    if (result.BrowserWindow.__haxcordPatched) return result;

    patched = true;

    const OriginalBrowserWindow = result.BrowserWindow;

    class PatchedBrowserWindow extends OriginalBrowserWindow {
        constructor(options = {}) {
            if (!options.webPreferences) options.webPreferences = {};

            const existingPreload = options.webPreferences.preload;

            if (existingPreload && existingPreload !== preloadPath) {
                options.webPreferences.additionalArguments = options.webPreferences.additionalArguments || [];
                options.webPreferences.additionalArguments.push(`--haxcord-original-preload=${existingPreload}`);
            }

            options.webPreferences.preload = preloadPath;
            super(options);
        }
    }

    PatchedBrowserWindow.__haxcordPatched = true;

    // Copy static methods/properties from original
    Object.keys(OriginalBrowserWindow).forEach(key => {
        try { PatchedBrowserWindow[key] = OriginalBrowserWindow[key]; }
        catch (e) { /* skip read-only */ }
    });

    // Directly assign on the exports object — avoids defineProperty restrictions
    result.BrowserWindow = PatchedBrowserWindow;

    console.log("[HaxCord] BrowserWindow patched.");
    return result;
};

console.log("[HaxCord] Injector loaded.");
