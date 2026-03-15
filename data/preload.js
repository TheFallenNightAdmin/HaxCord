"use strict";

/**
 * HaxCord Preload
 * Runs in Discord's renderer process with Node.js access.
 * 1. Chains Discord's original preload (passed via --haxcord-original-preload)
 * 2. Loads renderer.js once the DOM is ready
 */

const path = require("path");
const fs = require("fs");

// ── Step 1: Chain Discord's original preload ──────────────────────────────────
// The injector passes the original preload path via additionalArguments
try {
    const arg = process.argv.find(a => a.startsWith("--haxcord-original-preload="));
    if (arg) {
        const originalPreload = arg.slice("--haxcord-original-preload=".length);
        if (originalPreload && fs.existsSync(originalPreload)) {
            require(originalPreload);
        }
    }
} catch (e) {
    console.error("[HaxCord] Failed to chain original preload:", e);
}

// ── Step 2: Load HaxCord renderer once DOM is available ──────────────────────
function loadRenderer() {
    try {
        const rendererPath = path.join(__dirname, "renderer.js");
        if (!fs.existsSync(rendererPath)) {
            console.error("[HaxCord] renderer.js not found at:", rendererPath);
            return;
        }
        require(rendererPath);
    } catch (err) {
        console.error("[HaxCord] Failed to load renderer:", err);
    }
}

// In Electron preloads, document may not be ready yet — use the event if needed
if (typeof document !== "undefined") {
    if (document.readyState === "complete" || document.readyState === "interactive") {
        loadRenderer();
    } else {
        document.addEventListener("DOMContentLoaded", loadRenderer);
    }
} else {
    // Fallback: some Electron versions run preloads before document is defined
    process.once("loaded", loadRenderer);
}

console.log("[HaxCord] Preload loaded.");
