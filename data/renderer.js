"use strict";

/**
 * HaxCord Renderer v2
 * Runs inside Discord's renderer process after DOM is ready
 * Waits for Discord's webpack to be available before initializing
 */

const path = require("path");
const fs = require("fs");
const electron = require("electron");

// ─── Paths ────────────────────────────────────────────────────────────────────

const appData = process.env.APPDATA
    || (process.platform === "darwin"
        ? path.join(process.env.HOME, "Library/Application Support")
        : path.join(process.env.HOME, ".config"));

const HC_FOLDER    = path.join(appData, "HaxCord");
const PLUGINS_DIR  = path.join(HC_FOLDER, "plugins");
const THEMES_DIR   = path.join(HC_FOLDER, "themes");
const DATA_DIR     = path.join(HC_FOLDER, "data");
const CONFIG_FILE  = path.join(DATA_DIR, "config.json");

// ─── Config ───────────────────────────────────────────────────────────────────

function ensureDirs() {
    for (const dir of [HC_FOLDER, PLUGINS_DIR, THEMES_DIR, DATA_DIR]) {
        if (!fs.existsSync(dir)) {
            try { fs.mkdirSync(dir, {recursive: true}); }
            catch (e) { console.error("[HaxCord] Could not create dir:", dir, e); }
        }
    }
}

function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
        }
    }
    catch (e) { console.error("[HaxCord] Failed to read config:", e); }
    return {plugins: {}, themes: {}};
}

function saveConfig(config) {
    try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 4)); }
    catch (e) { console.error("[HaxCord] Failed to save config:", e); }
}

// ─── Webpack ──────────────────────────────────────────────────────────────────

const Webpack = {
    getModule(filter, all = false) {
        const results = [];
        try {
            // Try webpackChunkdiscord_app first (modern Discord)
            const chunk = window.webpackChunkdiscord_app;
            if (!chunk) return all ? results : null;

            // Push a fake chunk to get the require function
            let req;
            chunk.push([[Symbol()], {}, r => { req = r; }]);
            chunk.pop();
            if (!req || !req.c) return all ? results : null;

            for (const id in req.c) {
                const mod = req.c[id];
                if (!mod || !mod.exports) continue;
                const exports = mod.exports;
                try {
                    if (filter(exports)) {
                        if (!all) return exports;
                        results.push(exports);
                    }
                    if (exports.default && filter(exports.default)) {
                        if (!all) return exports.default;
                        results.push(exports.default);
                    }
                }
                catch (e) { /* skip */ }
            }
        }
        catch (e) { console.error("[HaxCord] Webpack error:", e); }
        return all ? results : null;
    },

    getByProps(...props) {
        return this.getModule(m => props.every(p => m[p] !== undefined));
    },

    getByDisplayName(name) {
        return this.getModule(m => m?.displayName === name || m?.default?.displayName === name);
    },

    getByPrototypes(...protos) {
        return this.getModule(m => m?.prototype && protos.every(p => m.prototype[p]));
    }
};

// ─── Patcher ──────────────────────────────────────────────────────────────────

const Patcher = {
    _patches: new Map(),

    _patch(caller, obj, method, type, callback) {
        if (!obj || !obj[method]) {
            console.error(`[HaxCord] Patcher: ${method} does not exist on object`);
            return () => {};
        }

        if (!this._patches.has(caller)) this._patches.set(caller, []);

        const original = obj[method];
        const patch = {caller, obj, method, original};
        this._patches.get(caller).push(patch);

        obj[method] = function(...args) {
            if (type === "before") {
                try { callback(this, args); }
                catch (e) { console.error(`[HaxCord] Patcher before error (${caller}):`, e); }
                return original.apply(this, args);
            }
            if (type === "instead") {
                try { return callback(this, args, original.bind(this)); }
                catch (e) {
                    console.error(`[HaxCord] Patcher instead error (${caller}):`, e);
                    return original.apply(this, args);
                }
            }
            if (type === "after") {
                const result = original.apply(this, args);
                try { callback(this, args, result); }
                catch (e) { console.error(`[HaxCord] Patcher after error (${caller}):`, e); }
                return result;
            }
        };

        obj[method].__haxcordOriginal = original;
        return () => {
            obj[method] = original;
            const patches = this._patches.get(caller) || [];
            this._patches.set(caller, patches.filter(p => p !== patch));
        };
    },

    before(caller, obj, method, callback) { return this._patch(caller, obj, method, "before", callback); },
    after(caller, obj, method, callback)  { return this._patch(caller, obj, method, "after", callback); },
    instead(caller, obj, method, callback){ return this._patch(caller, obj, method, "instead", callback); },

    unpatchAll(caller) {
        const patches = this._patches.get(caller) || [];
        patches.forEach(p => { p.obj[p.method] = p.original; });
        this._patches.delete(caller);
    }
};

// ─── Plugin Manager ───────────────────────────────────────────────────────────

const PluginManager = {
    plugins: {},
    config: {},

    load(config) {
        this.config = config;
        if (!fs.existsSync(PLUGINS_DIR)) return;

        const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith(".js"));
        for (const file of files) {
            try {
                delete require.cache[require.resolve(path.join(PLUGINS_DIR, file))];
                const plugin = require(path.join(PLUGINS_DIR, file));
                const name = plugin.name || path.basename(file, ".js");
                this.plugins[name] = plugin;
                if (config.plugins[name] !== false) this.enable(name);
            }
            catch (e) { console.error(`[HaxCord] Failed to load plugin ${file}:`, e); }
        }
        console.log(`[HaxCord] ${Object.keys(this.plugins).length} plugin(s) loaded`);
    },

    enable(name) {
        try {
            this.plugins[name]?.start?.();
            this.config.plugins[name] = true;
            saveConfig(this.config);
        }
        catch (e) { console.error(`[HaxCord] Failed to start plugin ${name}:`, e); }
    },

    disable(name) {
        try {
            this.plugins[name]?.stop?.();
            Patcher.unpatchAll(name);
            this.config.plugins[name] = false;
            saveConfig(this.config);
        }
        catch (e) { console.error(`[HaxCord] Failed to stop plugin ${name}:`, e); }
    },

    toggle(name) {
        if (this.config.plugins[name] === false) this.enable(name);
        else this.disable(name);
    },

    isEnabled(name) { return this.config.plugins[name] !== false; }
};

// ─── Theme Manager ────────────────────────────────────────────────────────────

const ThemeManager = {
    applied: {},
    config: {},

    load(config) {
        this.config = config;
        if (!fs.existsSync(THEMES_DIR)) return;

        const files = fs.readdirSync(THEMES_DIR)
            .filter(f => f.endsWith(".css") || f.endsWith(".theme.css"));

        for (const file of files) {
            const name = file.replace(/\.theme\.css$|\.css$/, "");
            if (config.themes[name] !== false) this.apply(name, file);
        }
        console.log(`[HaxCord] ${Object.keys(this.applied).length} theme(s) loaded`);
    },

    apply(name, file) {
        try {
            if (this.applied[name]) return;
            const css = fs.readFileSync(path.join(THEMES_DIR, file), "utf8");
            const el = document.createElement("style");
            el.id = `haxcord-theme-${name}`;
            el.textContent = css;
            document.head.appendChild(el);
            this.applied[name] = el;
        }
        catch (e) { console.error(`[HaxCord] Failed to apply theme ${name}:`, e); }
    },

    remove(name) {
        const el = this.applied[name];
        if (el) { el.remove(); delete this.applied[name]; }
    },

    toggle(name) {
        if (this.applied[name]) {
            this.remove(name);
            this.config.themes[name] = false;
        }
        else {
            const file = fs.existsSync(THEMES_DIR)
                ? fs.readdirSync(THEMES_DIR).find(f => f.startsWith(name))
                : null;
            if (file) this.apply(name, file);
            this.config.themes[name] = true;
        }
        saveConfig(this.config);
    },

    isEnabled(name) { return !!this.applied[name]; }
};

// ─── Settings Panel ───────────────────────────────────────────────────────────

const Settings = {
    _observer: null,

    inject() {
        // Watch for Discord's sidebar to appear using MutationObserver
        // This is more reliable than setInterval
        this._observer = new MutationObserver(() => {
            if (document.getElementById("haxcord-settings-btn")) return;
            const sidebar = document.querySelector("[class*='sidebar-']");
            if (!sidebar) return;

            const separator = document.createElement("div");
            separator.style.cssText = "height:1px;background:rgba(255,255,255,0.06);margin:8px 0;";

            const btn = document.createElement("div");
            btn.id = "haxcord-settings-btn";
            btn.innerHTML = `<span style="color:#c13a3a;margin-right:6px;">⚡</span>HaxCord`;
            btn.style.cssText = `
                padding: 1px 8px;
                margin: 0 8px 2px;
                border-radius: 4px;
                cursor: pointer;
                color: #bfc4c9;
                font-size: 16px;
                line-height: 40px;
                font-weight: 500;
                transition: background 100ms;
            `;
            btn.addEventListener("mouseenter", () => btn.style.backgroundColor = "rgba(193,58,58,0.15)");
            btn.addEventListener("mouseleave", () => btn.style.backgroundColor = "transparent");
            btn.addEventListener("click", () => Settings.openPanel());

            sidebar.appendChild(separator);
            sidebar.appendChild(btn);
        });

        this._observer.observe(document.body, {childList: true, subtree: true});
    },

    openPanel() {
        // Remove existing panel if open (toggle)
        const existing = document.getElementById("haxcord-panel-overlay");
        if (existing) { existing.remove(); return; }

        const config = HaxCord.config;

        const overlay = document.createElement("div");
        overlay.id = "haxcord-panel-overlay";
        overlay.style.cssText = `
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.7);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: Whitney, "Helvetica Neue", Helvetica, Arial, sans-serif;
        `;
        overlay.addEventListener("click", e => {
            if (e.target === overlay) overlay.remove();
        });

        const pluginItems = Object.entries(PluginManager.plugins).map(([name, p]) => `
            <div style="display:flex;justify-content:space-between;align-items:center;
                padding:10px 12px;background:#1e1f26;border-radius:6px;margin-bottom:6px;">
                <div>
                    <div style="font-weight:600;color:#f2f3f5;font-size:14px;">${p.name || name}</div>
                    <div style="color:#949ba4;font-size:12px;margin-top:2px;">${p.description || "No description"} ${p.version ? `· v${p.version}` : ""}</div>
                </div>
                <div id="hc-toggle-plugin-${name}"
                    onclick="window.HaxCord.PluginManager.toggle('${name}');
                        const el=document.getElementById('hc-toggle-plugin-${name}');
                        const on=window.HaxCord.PluginManager.isEnabled('${name}');
                        el.style.background=on?'#c13a3a':'#4e5058';
                        el.textContent=on?'On':'Off';"
                    style="background:${PluginManager.isEnabled(name) ? "#c13a3a" : "#4e5058"};
                        color:#fff;border:none;border-radius:4px;padding:5px 16px;
                        cursor:pointer;font-size:13px;font-weight:600;min-width:50px;text-align:center;">
                    ${PluginManager.isEnabled(name) ? "On" : "Off"}
                </div>
            </div>
        `).join("") || `<div style="color:#949ba4;font-size:13px;padding:8px 0;">
            No plugins installed. Drop .js files into:<br>
            <code style="color:#c13a3a;">${PLUGINS_DIR}</code>
        </div>`;

        const themeFiles = fs.existsSync(THEMES_DIR)
            ? fs.readdirSync(THEMES_DIR).filter(f => f.endsWith(".css"))
            : [];

        const themeItems = themeFiles.map(file => {
            const name = file.replace(/\.theme\.css$|\.css$/, "");
            const on = ThemeManager.isEnabled(name);
            return `
                <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:10px 12px;background:#1e1f26;border-radius:6px;margin-bottom:6px;">
                    <div style="font-weight:600;color:#f2f3f5;font-size:14px;">${name}</div>
                    <div id="hc-toggle-theme-${name}"
                        onclick="window.HaxCord.ThemeManager.toggle('${name}');
                            const el=document.getElementById('hc-toggle-theme-${name}');
                            const on=window.HaxCord.ThemeManager.isEnabled('${name}');
                            el.style.background=on?'#c13a3a':'#4e5058';
                            el.textContent=on?'On':'Off';"
                        style="background:${on ? "#c13a3a" : "#4e5058"};
                            color:#fff;border:none;border-radius:4px;padding:5px 16px;
                            cursor:pointer;font-size:13px;font-weight:600;min-width:50px;text-align:center;">
                        ${on ? "On" : "Off"}
                    </div>
                </div>
            `;
        }).join("") || `<div style="color:#949ba4;font-size:13px;padding:8px 0;">
            No themes installed. Drop .css files into:<br>
            <code style="color:#c13a3a;">${THEMES_DIR}</code>
        </div>`;

        overlay.innerHTML = `
            <div style="background:#111214;border-radius:10px;width:520px;max-height:80vh;
                overflow:hidden;display:flex;flex-direction:column;
                box-shadow:0 8px 40px rgba(0,0,0,0.6);border:1px solid rgba(193,58,58,0.2);">

                <!-- Header -->
                <div style="padding:20px 24px 16px;border-bottom:1px solid #1e1f26;
                    display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="color:#c13a3a;font-size:20px;">⚡</span>
                        <span style="color:#f2f3f5;font-size:18px;font-weight:700;">HaxCord</span>
                        <span style="color:#4e5058;font-size:13px;">v0.2.0</span>
                    </div>
                    <div onclick="document.getElementById('haxcord-panel-overlay').remove()"
                        style="color:#4e5058;cursor:pointer;font-size:20px;line-height:1;
                        padding:4px 8px;border-radius:4px;transition:color 150ms;"
                        onmouseenter="this.style.color='#f2f3f5'"
                        onmouseleave="this.style.color='#4e5058'">✕</div>
                </div>

                <!-- Tabs -->
                <div id="hc-tabs" style="display:flex;border-bottom:1px solid #1e1f26;flex-shrink:0;">
                    <div class="hc-tab" data-tab="plugins"
                        onclick="HaxCord_switchTab('plugins')"
                        style="padding:12px 20px;cursor:pointer;font-size:13px;font-weight:600;
                        color:#c13a3a;border-bottom:2px solid #c13a3a;">
                        Plugins (${Object.keys(PluginManager.plugins).length})
                    </div>
                    <div class="hc-tab" data-tab="themes"
                        onclick="HaxCord_switchTab('themes')"
                        style="padding:12px 20px;cursor:pointer;font-size:13px;font-weight:600;
                        color:#4e5058;border-bottom:2px solid transparent;">
                        Themes (${themeFiles.length})
                    </div>
                    <div class="hc-tab" data-tab="about"
                        onclick="HaxCord_switchTab('about')"
                        style="padding:12px 20px;cursor:pointer;font-size:13px;font-weight:600;
                        color:#4e5058;border-bottom:2px solid transparent;">
                        About
                    </div>
                </div>

                <!-- Content -->
                <div style="overflow-y:auto;padding:16px 24px;flex:1;">
                    <div id="hc-tab-plugins">${pluginItems}</div>
                    <div id="hc-tab-themes" style="display:none;">${themeItems}</div>
                    <div id="hc-tab-about" style="display:none;">
                        <div style="color:#949ba4;font-size:13px;line-height:1.6;">
                            <div style="color:#f2f3f5;font-size:16px;font-weight:700;margin-bottom:12px;">HaxCord v0.2.0</div>
                            <div style="margin-bottom:8px;">A Discord client mod built for power users.</div>
                            <div style="margin-bottom:4px;">Plugins folder: <code style="color:#c13a3a;">${PLUGINS_DIR}</code></div>
                            <div style="margin-bottom:16px;">Themes folder: <code style="color:#c13a3a;">${THEMES_DIR}</code></div>
                            <a href="https://github.com/TheFallenNightAdmin/HaxCord"
                                style="color:#c13a3a;text-decoration:none;">GitHub →</a>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Tab switching function
        window.HaxCord_switchTab = function(tab) {
            document.querySelectorAll(".hc-tab").forEach(t => {
                const isActive = t.dataset.tab === tab;
                t.style.color = isActive ? "#c13a3a" : "#4e5058";
                t.style.borderBottom = isActive ? "2px solid #c13a3a" : "2px solid transparent";
            });
            ["plugins", "themes", "about"].forEach(t => {
                const el = document.getElementById(`hc-tab-${t}`);
                if (el) el.style.display = t === tab ? "block" : "none";
            });
        };
    }
};

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
    try {
        ensureDirs();
        const config = loadConfig();

        PluginManager.load(config);
        ThemeManager.load(config);
        Settings.inject();

        window.HaxCord = {
            version: "0.2.0",
            config,
            Webpack,
            Patcher,
            PluginManager,
            ThemeManager,
            Settings,
            pluginsFolder: PLUGINS_DIR,
            themesFolder: THEMES_DIR,
        };

        console.log("%c[HaxCord] v0.2.0 loaded ⚡", "color:#c13a3a;font-weight:bold;font-size:14px;");
    }
    catch (err) {
        console.error("[HaxCord] Fatal init error:", err);
    }
}

init();
