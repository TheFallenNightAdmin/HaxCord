/**
 * HaxCord Theme Loader
 * Loads .css and .theme.css files from the themes/ directory
 */

const fs = require("fs");
const path = require("path");

const THEMES_DIR = path.join(__dirname, "../../themes");

const ThemeLoader = {
  _injectedStyles: new Map(),

  init() {
    if (!fs.existsSync(THEMES_DIR)) {
      fs.mkdirSync(THEMES_DIR, { recursive: true });
    }

    const settings = this._getSettings();

    const files = fs.readdirSync(THEMES_DIR).filter(
      (f) => f.endsWith(".css") || f.endsWith(".theme.css")
    );

    for (const file of files) {
      const name = file.replace(/\.theme\.css$|\.css$/, "");
      const enabled = settings.enabledThemes?.includes(name) ?? false;
      if (enabled) this.enable(name);
    }

    console.log(`[HaxCord/Themes] Loaded ${this._injectedStyles.size} theme(s)`);
  },

  getAll() {
    if (!fs.existsSync(THEMES_DIR)) return [];

    return fs.readdirSync(THEMES_DIR)
      .filter((f) => f.endsWith(".css"))
      .map((file) => {
        const name = file.replace(/\.theme\.css$|\.css$/, "");
        const filePath = path.join(THEMES_DIR, file);
        const content = fs.readFileSync(filePath, "utf8");

        const meta = this._parseMeta(content);

        return {
          name: meta.name || name,
          filename: file,
          author: meta.author || "Unknown",
          version: meta.version || "1.0.0",
          description: meta.description || "",
          enabled: this._injectedStyles.has(name),
        };
      });
  },

  enable(name) {
    if (this._injectedStyles.has(name)) return;

    const filePath = this._findThemeFile(name);
    if (!filePath) {
      console.warn(`[HaxCord/Themes] Theme not found: ${name}`);
      return;
    }

    try {
      const css = fs.readFileSync(filePath, "utf8");
      const styleEl = document.createElement("style");
      styleEl.id = `haxcord-theme-${name}`;
      styleEl.setAttribute("data-haxcord-theme", name);
      styleEl.textContent = css;
      document.head.appendChild(styleEl);
      this._injectedStyles.set(name, styleEl);
      this._saveEnabled(name, true);
      console.log(`[HaxCord/Themes] Enabled: ${name}`);
    } catch (e) {
      console.error(`[HaxCord/Themes] Failed to load ${name}:`, e);
    }
  },

  disable(name) {
    const styleEl = this._injectedStyles.get(name);
    if (!styleEl) return;
    styleEl.remove();
    this._injectedStyles.delete(name);
    this._saveEnabled(name, false);
    console.log(`[HaxCord/Themes] Disabled: ${name}`);
  },

  reload(name) {
    this.disable(name);
    this.enable(name);
  },

  _findThemeFile(name) {
    const candidates = [
      path.join(THEMES_DIR, `${name}.theme.css`),
      path.join(THEMES_DIR, `${name}.css`),
    ];
    return candidates.find((p) => fs.existsSync(p)) ?? null;
  },

  _parseMeta(css) {
    const meta = {};
    const block = css.match(/\/\*\*([\s\S]*?)\*\//)?.[1] ?? "";
    for (const [, key, value] of block.matchAll(/@(\w+)\s+([^\n@]+)/g)) {
      meta[key.toLowerCase()] = value.trim();
    }
    return meta;
  },

  _getSettings() {
    try {
      const p = path.join(__dirname, "../../haxcord-settings.json");
      if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
    } catch (_) {}
    return {};
  },

  _saveEnabled(name, enabled) {
    const settingsPath = path.join(__dirname, "../../haxcord-settings.json");
    const settings = this._getSettings();
    if (!settings.enabledThemes) settings.enabledThemes = [];
    if (enabled && !settings.enabledThemes.includes(name)) {
      settings.enabledThemes.push(name);
    } else if (!enabled) {
      settings.enabledThemes = settings.enabledThemes.filter((n) => n !== name);
    }
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  },
};

module.exports = ThemeLoader;
