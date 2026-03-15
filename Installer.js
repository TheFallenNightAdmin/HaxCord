/**
 * HaxCord Installer v3
 * Injects into discord_desktop_core/index.js — the same approach used by BetterDiscord.
 * This runs after Electron is fully initialized, avoiding the BrowserWindow lock issue.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");

const DISCORD_PATHS = [
  path.join(os.homedir(), "AppData", "Local", "Discord"),
  path.join(os.homedir(), "AppData", "Local", "DiscordCanary"),
  path.join(os.homedir(), "AppData", "Local", "DiscordPTB"),
];

const HAXCORD_ROOT = __dirname;

function findDiscordCore(discordPath) {
  if (!fs.existsSync(discordPath)) return null;

  const entries = fs.readdirSync(discordPath);
  const appFolder = entries
    .filter((e) => e.startsWith("app-"))
    .sort()
    .reverse()[0];

  if (!appFolder) return null;

  const modulesPath = path.join(discordPath, appFolder, "modules");
  if (!fs.existsSync(modulesPath)) return null;

  // Find discord_desktop_core-N folder
  const coreFolder = fs.readdirSync(modulesPath)
    .filter(e => e.startsWith("discord_desktop_core"))
    .sort()
    .reverse()[0];

  if (!coreFolder) return null;

  const corePath = path.join(modulesPath, coreFolder, "discord_desktop_core");
  const indexFile = path.join(corePath, "index.js");

  if (!fs.existsSync(indexFile)) return null;

  return { corePath, indexFile };
}

function installHaxCord(indexFile) {
  console.log(`[HaxCord] Found discord_desktop_core at: ${indexFile}`);

  let content = fs.readFileSync(indexFile, "utf8");

  const injectionMarker = "// [HaxCord Injected]";
  if (content.includes(injectionMarker)) {
    console.log("[HaxCord] Already injected, skipping.");
    return;
  }

  // Back up original
  const backupFile = indexFile + ".bak";
  if (!fs.existsSync(backupFile)) {
    fs.copyFileSync(indexFile, backupFile);
    console.log("[HaxCord] Backed up original index.js");
  }

  const loaderPath = path.join(HAXCORD_ROOT, "core", "loader.js").replace(/\\/g, "\\\\");

  const injection = `${injectionMarker}
try {
  require("${loaderPath}");
} catch(e) {
  console.error("[HaxCord] Failed to load:", e);
}
`;

  fs.writeFileSync(indexFile, injection + content, "utf8");
  console.log(`[HaxCord] Injected into ${indexFile}`);
  console.log("[HaxCord] Installation complete! Restart Discord.");
}

let installed = false;
for (const discordPath of DISCORD_PATHS) {
  const result = findDiscordCore(discordPath);
  if (result) {
    installHaxCord(result.indexFile);
    installed = true;
    break;
  }
}

if (!installed) {
  console.error("[HaxCord] Could not find a Discord installation.");
  console.error("Searched in:", DISCORD_PATHS);
  process.exit(1);
}
