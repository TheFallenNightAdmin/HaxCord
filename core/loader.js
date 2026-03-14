const fs = require("fs");
const path = require("path");

const base = path.join(process.env.APPDATA, "HaxCord");

global.HaxCord = {
    plugins: new Map(),
    version: "0.2.0"
};

const pluginDir = path.join(base, "plugins");

if (!fs.existsSync(pluginDir)) return;

for (const file of fs.readdirSync(pluginDir)) {
    if (!file.endsWith(".js")) continue;

    try {
        const plugin = require(path.join(pluginDir, file));
        if (plugin.start) plugin.start();

        console.log("[HaxCord] Loaded plugin:", file);
    } catch (e) {
        console.error("[HaxCord] Plugin failed:", file, e);
    }
}
