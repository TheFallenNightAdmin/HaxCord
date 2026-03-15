/**
 * HaxCord Installer v2
 * Finds Discord installation, extracts app.asar, injects HaxCord loader
 */

const fs = require("fs");
const path = require("path");
const asar = require("asar");
const os = require("os");

const DISCORD_PATHS = [
  path.join(os.homedir(), "AppData", "Local", "Discord"),
  path.join(os.homedir(), "AppData", "Local", "DiscordCanary"),
  path.join(os.homedir(), "AppData", "Local", "DiscordPTB"),
];

const HAXCORD_ROOT = __dirname;

function findDiscordApp(discordPath) {
  if (!fs.existsSync(discordPath)) return null;

  const entries = fs.readdirSync(discordPath);
  const appFolder = entries
    .filter((e) => e.startsWith("app-"))
    .sort()
    .reverse()[0];

  if (!appFolder) return null;

  const resourcesPath = path.join(discordPath, appFolder, "resources");
  const asarPath = path.join(resourcesPath, "app.asar");

  if (!fs.existsSync(asarPath)) return null;

  return { resourcesPath, asarPath };
}

function installHaxCord(resourcesPath, asarPath) {
  console.log(`[HaxCord] Found Discord at: ${resourcesPath}`);

  const extractPath = path.join(resourcesPath, "app");
  if (!fs.existsSync(extractPath)) {
    console.log("[HaxCord] Extracting app.asar...");
    asar.extractAll(asarPath, extractPath);
  } else {
    console.log("[HaxCord] app folder already exists, skipping extraction.");
  }

  const backupPath = path.join(resourcesPath, "app.asar.bak");
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(asarPath, backupPath);
    console.log("[HaxCord] Backed up original app.asar");
  }

  const packageJson = JSON.parse(
    fs.readFileSync(path.join(extractPath, "package.json"), "utf8")
  );
  const entryFile = path.join(extractPath, packageJson.main);

  let entryContent = fs.readFileSync(entryFile, "utf8");

  const injectionMarker = "// [HaxCord Injected]";
  if (entryContent.includes(injectionMarker)) {
    console.log("[HaxCord] Already injected, skipping.");
    return;
  }

  const injection = `
${injectionMarker}
try {
  require(${JSON.stringify(path.join(HAXCORD_ROOT, "core", "loader.js"))});
} catch(e) {
  console.error("[HaxCord] Failed to load:", e);
}
`;

  fs.writeFileSync(entryFile, injection + entryContent, "utf8");
  console.log(`[HaxCord] Injected into ${entryFile}`);

  fs.unlinkSync(asarPath);
  console.log("[HaxCord] Removed app.asar (Discord will load extracted app folder)");
  console.log("[HaxCord] Installation complete! Restart Discord.");
}

let installed = false;
for (const discordPath of DISCORD_PATHS) {
  const result = findDiscordApp(discordPath);
  if (result) {
    installHaxCord(result.resourcesPath, result.asarPath);
    installed = true;
    break;
  }
}

if (!installed) {
  console.error("[HaxCord] Could not find a Discord installation.");
  console.error("Searched in:", DISCORD_PATHS);
  process.exit(1);
}
