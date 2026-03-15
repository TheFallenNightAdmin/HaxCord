"use strict";

/**
 * HaxCord Preload
 * Runs in Discord's renderer process with full Node.js access
 * Loads renderer.js once the window is ready
 */

const path = require("path");
const fs = require("fs");

// Run any original preload first (important for Discord's own preload chain)
try {
    const originalPreload = process.electronBinding
        ? undefined
        : undefined; // placeholder — chaining handled by injector
}
catch (e) { /* ignore */ }

function loadRenderer() {
    try {
        const rendererPath = path.join(__dirname, "renderer.js");
        if (!fs.existsSync(rendererPath)) {
            console.error("[HaxCord] renderer.js not found at:", rendererPath);
            return;
        }
        require(rendererPath);
    }
    catch (err) {
        console.error("[HaxCord] Failed to load renderer:", err);
    }
}

// Expose for external calls
window.HaxCordPreload = loadRenderer;

// Load when DOM is ready
if (document.readyState === "complete" || document.readyState === "interactive") {
    loadRenderer();
}
else {
    document.addEventListener("DOMContentLoaded", loadRenderer);
}

console.log("[HaxCord] Preload loaded.");
