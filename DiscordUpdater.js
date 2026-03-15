"use strict";

/**
 * HaxCord DiscordUpdater
 * Detects when Discord has auto-updated to a new version folder and
 * automatically re-injects HaxCord into the new discord_desktop_core.
 *
 * How it works:
 * - On every Discord launch, loader.js calls this before anything else
 * - Reads the last known injected Discord version from haxcord-settings.json
 * - Compares it against the current running Discord version (from process.resourcesPath)
 * - If they differ, Discord has updated — re-inject and update the stored version
 */

const fs   = require("fs");
const path = require("path");
const os   = require("os");

const HAXCORD_ROOT = __dirname;

const appData = process.env.APPDATA
    || (process.platform === "darwin"
        ? path.join(process.env.HOME, "Library/Application Support")
        : path.join(process.env.HOME, ".config"));

const SETTINGS_FILE = path.join(appData, "HaxCord", "data", "config.json");
const INJECTION_MARKER = "// [HaxCord Injected]";

// ── Helpers ──────────────────────────────────────────────────────────────────

function readSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
        }
    } catch (_) {}
    return {};
}

function writeSettings(settings) {
    try {
        const dir = path.dirname(SETTINGS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    } catch (e) {
        console.error("[HaxCord/DiscordUpdater] Failed to save settings:", e);
    }
}

/**
 * Get the current Discord version folder name from the running process.
 * process.resourcesPath looks like:
 *   C:\Users\...\AppData\Local\Discord\app-1.0.9228\resources
 * We want "app-1.0.9228".
 */
function getCurrentDiscordVersion() {
    try {
        const parts = process.resourcesPath.split(path.sep);
        const appFolder = parts.find(p => p.startsWith("app-"));
        return appFolder || null;
    } catch (_) {
        return null;
    }
}

/**
 * Find the discord_desktop_core index.js for a given Discord version folder.
 */
function findCoreIndex(discordBasePath, versionFolder) {
    const modulesPath = path.join(discordBasePath, versionFolder, "modules");
    if (!fs.existsSync(modulesPath)) return null;

    const coreFolder = fs.readdirSync(modulesPath)
        .filter(e => e.startsWith("discord_desktop_core"))
        .sort()
        .reverse()[0];

    if (!coreFolder) return null;

    const indexFile = path.join(modulesPath, coreFolder, "discord_desktop_core", "index.js");
    return fs.existsSync(indexFile) ? indexFile : null;
}

/**
 * Find the Discord base install path (e.g. C:\Users\...\AppData\Local\Discord)
 * by walking up from process.resourcesPath.
 */
function getDiscordBasePath() {
    try {
        // resourcesPath = .../Discord/app-X.X.XXXX/resources
        // go up twice to get .../Discord
        return path.resolve(process.resourcesPath, "..", "..");
    } catch (_) {
        return null;
    }
}

/**
 * Inject HaxCord into the given index.js file.
 */
function inject(indexFile) {
    try {
        let content = fs.readFileSync(indexFile, "utf8");

        if (content.includes(INJECTION_MARKER)) {
            return true; // already injected
        }

        // Back up original
        const backupFile = indexFile + ".bak";
        if (!fs.existsSync(backupFile)) {
            fs.copyFileSync(indexFile, backupFile);
        }

        const loaderPath = path.join(HAXCORD_ROOT, "core", "loader.js").replace(/\\/g, "\\\\");
        const injection = `${INJECTION_MARKER}\ntry {\n  require("${loaderPath}");\n} catch(e) {\n  console.error("[HaxCord] Failed to load:", e);\n}\n`;

        fs.writeFileSync(indexFile, injection + content, "utf8");
        console.log(`[HaxCord/DiscordUpdater] Re-injected into ${indexFile}`);
        return true;
    } catch (e) {
        console.error("[HaxCord/DiscordUpdater] Injection failed:", e);
        return false;
    }
}

// ── Main ─────────────────────────────────────────────────────────────────────

function checkAndUpdate() {
    const currentVersion = getCurrentDiscordVersion();
    if (!currentVersion) {
        console.warn("[HaxCord/DiscordUpdater] Could not determine Discord version.");
        return;
    }

    const settings = readSettings();
    const lastVersion = settings.lastInjectedDiscordVersion;

    if (lastVersion === currentVersion) {
        // Same version — check the injection is still present
        const basePath = getDiscordBasePath();
        if (!basePath) return;

        const indexFile = findCoreIndex(basePath, currentVersion);
        if (!indexFile) return;

        const content = fs.readFileSync(indexFile, "utf8");
        if (!content.includes(INJECTION_MARKER)) {
            console.log("[HaxCord/DiscordUpdater] Injection missing, re-injecting...");
            if (inject(indexFile)) {
                console.log("[HaxCord/DiscordUpdater] Re-injection successful. Please restart Discord.");
            }
        }
        return;
    }

    // Version changed — Discord updated
    console.log(`[HaxCord/DiscordUpdater] Discord updated: ${lastVersion || "unknown"} → ${currentVersion}`);

    const basePath = getDiscordBasePath();
    if (!basePath) {
        console.error("[HaxCord/DiscordUpdater] Could not find Discord base path.");
        return;
    }

    const indexFile = findCoreIndex(basePath, currentVersion);
    if (!indexFile) {
        console.error("[HaxCord/DiscordUpdater] Could not find discord_desktop_core for new version.");
        return;
    }

    if (inject(indexFile)) {
        settings.lastInjectedDiscordVersion = currentVersion;
        writeSettings(settings);
        console.log(`[HaxCord/DiscordUpdater] Successfully updated injection to ${currentVersion}. Please restart Discord.`);
    }
}

module.exports = { checkAndUpdate };
