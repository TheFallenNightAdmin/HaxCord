import {progress, status} from "../stores/installation";
import {remote, shell} from "electron";
import {promises as fs} from "fs";
import path from "path";

import {log, lognewline} from "./utils/log";
import succeed from "./utils/succeed";
import fail from "./utils/fail";
import exists from "./utils/exists";
import reset from "./utils/reset";
import kill from "./utils/kill";
import {showRestartNotice} from "./utils/notices";
import doSanityCheck from "./utils/sanity";

const MAKE_DIR_PROGRESS = 30;
const COPY_PACKAGE_PROGRESS = 60;
const INJECT_SHIM_PROGRESS = 90;
const RESTART_DISCORD_PROGRESS = 100;

const hcFolder = path.join(remote.app.getPath("appData"), "HaxCord");
const hcDataFolder = path.join(hcFolder, "data");
const hcPluginsFolder = path.join(hcFolder, "plugins");
const hcThemesFolder = path.join(hcFolder, "themes");

async function makeDirectories(...folders) {
    const progressPerLoop = (MAKE_DIR_PROGRESS - progress.value) / folders.length;
    for (const folder of folders) {
        if (await exists(folder)) {
            log(`✅ Directory exists: ${folder}`);
            progress.set(progress.value + progressPerLoop);
            continue;
        }
        try {
            await fs.mkdir(folder, {recursive: true});
            progress.set(progress.value + progressPerLoop);
            log(`✅ Directory created: ${folder}`);
        }
        catch (err) {
            log(`❌ Failed to create directory: ${folder}`);
            log(`❌ ${err.message}`);
            return err;
        }
    }
}

const asarPath = path.join(hcDataFolder, "haxcord.asar");

async function copyAsar() {
    try {
        // The asar is bundled with the installer in the static assets folder
        const originalFs = require("original-fs").promises;
        const sourcePath = path.join(__static, "haxcord.asar");
        log(`Copying haxcord.asar from ${sourcePath}`);
        
        if (!require("fs").existsSync(sourcePath)) {
            throw new Error(`haxcord.asar not found in installer assets at ${sourcePath}`);
        }
        
        const fileContent = await originalFs.readFile(sourcePath);
        await originalFs.writeFile(asarPath, fileContent);
        log(`✅ Copied haxcord.asar to ${asarPath}`);
    }
    catch (error) {
        log(`❌ Failed to copy haxcord.asar: ${error.message}`);
        throw error;
    }
}

async function injectShims(paths) {
    const progressPerLoop = (INJECT_SHIM_PROGRESS - progress.value) / paths.length;
    for (const discordPath of paths) {
        log("Injecting into: " + discordPath);
        try {
            const escapedPath = asarPath.replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
            await fs.writeFile(
                path.join(discordPath, "index.js"),
                `process.noAsar=true;require("${escapedPath}");process.noAsar=false;\nmodule.exports = require("./core.asar");`
            );
            log("✅ Injection successful");
            progress.set(progress.value + progressPerLoop);
        }
        catch (err) {
            log(`❌ Could not inject shims to ${discordPath}`);
            log(`❌ ${err.message}`);
            return err;
        }
    }
}


export default async function(config) {
    await reset();
    const sane = doSanityCheck(config);
    if (!sane) return fail();

    const channels = Object.keys(config);
    const paths = Object.values(config);

    lognewline("Creating required directories...");
    const makeDirErr = await makeDirectories(hcFolder, hcDataFolder, hcThemesFolder, hcPluginsFolder);
    if (makeDirErr) return fail();
    log("✅ Directories created");
    progress.set(MAKE_DIR_PROGRESS);

    lognewline("Installing HaxCord...");
    try {
        await copyAsar();
    }
    catch (error) {
        return fail();
    }
    log("✅ Package installed");
    progress.set(COPY_PACKAGE_PROGRESS);

    lognewline("Injecting shims...");
    const injectErr = await injectShims(paths);
    if (injectErr) return fail();
    log("✅ Shims injected");
    progress.set(INJECT_SHIM_PROGRESS);

    lognewline("Restarting Discord...");
    const killErr = await kill(channels, (RESTART_DISCORD_PROGRESS - progress.value) / channels.length);
    if (killErr) showRestartNotice();
    else log("✅ Discord restarted");
    progress.set(RESTART_DISCORD_PROGRESS);

    succeed();
};
