/**
 * HaxCord Settings UI - v3
 * Full settings panel with tabs: Plugins, Themes, About
 */

const Webpack = require("../core/Webpack");
const Patcher = require("../core/Patcher");
const PluginManager = require("../core/PluginManager");
const ThemeLoader = require("../Themeloader");

const STYLE_ID = "haxcord-settings-style";

const SettingsUI = {
  _unpatch: null,
  _currentTab: "plugins",

  inject() {
    this._injectGlobalStyles();
    setTimeout(() => this._doInject(), 1200);
  },

  _injectGlobalStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      .hx-panel { padding: 32px 24px; color: var(--header-primary); max-width: 780px; }
      .hx-header { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
      .hx-subheader { font-size: 13px; color: var(--text-muted); margin-bottom: 20px; }

      .hx-tabs { display: flex; gap: 2px; margin-bottom: 24px; border-bottom: 2px solid var(--background-modifier-accent); }
      .hx-tab {
        padding: 8px 16px; cursor: pointer; font-size: 14px; font-weight: 600;
        color: var(--interactive-normal); border-radius: 4px 4px 0 0;
        border-bottom: 2px solid transparent; margin-bottom: -2px;
        transition: color 0.15s, border-color 0.15s;
      }
      .hx-tab:hover { color: var(--interactive-hover); }
      .hx-tab.active { color: var(--brand-experiment); border-bottom-color: var(--brand-experiment); }

      .hx-card {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 16px; border-radius: 8px; margin-bottom: 8px;
        background: var(--background-secondary-alt);
        border: 1px solid var(--background-modifier-accent);
        transition: border-color 0.15s;
      }
      .hx-card:hover { border-color: var(--brand-experiment-300); }
      .hx-card-title { font-weight: 600; font-size: 14px; margin-bottom: 2px; }
      .hx-card-meta { font-size: 12px; color: var(--text-muted); }

      .hx-toggle { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
      .hx-toggle input { opacity: 0; width: 0; height: 0; }
      .hx-toggle-slider {
        position: absolute; cursor: pointer; inset: 0;
        border-radius: 24px; transition: 0.2s;
      }
      .hx-toggle input:checked + .hx-toggle-slider { background: var(--brand-experiment); }
      .hx-toggle input:not(:checked) + .hx-toggle-slider { background: var(--background-modifier-accent); }
      .hx-toggle-slider::before {
        content: ""; position: absolute; height: 18px; width: 18px;
        left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.2s;
      }
      .hx-toggle input:checked + .hx-toggle-slider::before { transform: translateX(20px); }

      .hx-badge {
        font-size: 10px; font-weight: 700; padding: 2px 6px;
        border-radius: 4px; text-transform: uppercase; letter-spacing: 0.05em;
        background: var(--brand-experiment-15a); color: var(--brand-experiment);
        margin-left: 8px;
      }

      .hx-empty { color: var(--text-muted); font-size: 14px; padding: 20px 0; }
      .hx-empty code {
        background: var(--background-secondary-alt); padding: 2px 6px;
        border-radius: 4px; font-family: monospace; font-size: 12px;
      }

      .hx-about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
      .hx-stat {
        background: var(--background-secondary-alt); border-radius: 8px;
        padding: 14px 16px; border: 1px solid var(--background-modifier-accent);
      }
      .hx-stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
      .hx-stat-value { font-size: 20px; font-weight: 700; color: var(--brand-experiment); }

      .hx-btn {
        padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer;
        font-size: 13px; font-weight: 600; transition: filter 0.15s;
      }
      .hx-btn:hover { filter: brightness(1.1); }
      .hx-btn-primary { background: var(--brand-experiment); color: white; }
      .hx-btn-secondary { background: var(--background-modifier-hover); color: var(--text-normal); }

      .hx-sidebar-item {
        padding: 6px 10px; border-radius: 4px; cursor: pointer;
        color: var(--interactive-normal); font-size: 14px; transition: 0.1s;
      }
      .hx-sidebar-item:hover { background: var(--background-modifier-hover); color: var(--interactive-hover); }
    `;
    document.head.appendChild(style);
  },

  _doInject() {
    const SettingsView =
      Webpack.getByDisplayName("SettingsView") ||
      Webpack.getByProps("renderSidebar", "renderContent");

    if (!SettingsView) {
      setTimeout(() => this._doInject(), 2000);
      return;
    }

    const target = SettingsView.prototype || SettingsView;
    this._unpatch = Patcher.after("HaxCordSettings", target, "render", (args, res) => {
      try { this._patchSidebar(res); } catch (_) {}
      return res;
    });

    console.log("[HaxCord/Settings] Injected");
  },

  _patchSidebar(res) {
    const React = Webpack.getByProps("createElement", "Component");
    if (!React) return;

    const sidebar = this._findInTree(res, (node) =>
      Array.isArray(node?.props?.children) &&
      node.props.children.some?.((c) => c?.type?.displayName === "MenuItem")
    );
    if (!sidebar) return;

    const self = this;
    const items = [
      React.createElement("div", {
        key: "hx-sep",
        style: { margin: "8px 8px", borderTop: "1px solid var(--background-modifier-accent)" },
      }),
      React.createElement("div", {
        key: "hx-label",
        style: {
          padding: "6px 10px", fontSize: "11px", fontWeight: "700",
          color: "var(--header-secondary)", textTransform: "uppercase", letterSpacing: "0.04em",
        },
      }, "HaxCord"),
      ...["plugins", "store", "themes", "about"].map((tab) =>
        React.createElement("div", {
          key: `hx-${tab}`,
          className: "hx-sidebar-item",
          onClick: () => self.openPanel(tab),
        }, { plugins: "🧩 Plugins", store: "🛒 Store", themes: "🎨 Themes", about: "ℹ️ About" }[tab])
      ),
    ];

    sidebar.props.children.push(...items);
  },

  openPanel(tab = "plugins") {
    this._currentTab = tab;
    const contentArea =
      document.querySelector('[class*="contentRegion"]') ||
      document.querySelector('[class*="content-region"]');
    if (!contentArea) return;

    contentArea.innerHTML = "";
    const panel = document.createElement("div");
    panel.innerHTML = this._buildPanel(tab);
    contentArea.appendChild(panel);
    this._attachListeners(panel);
  },

  _buildPanel(activeTab) {
    const tabBar = `
      <div class="hx-tabs">
        ${["plugins", "themes", "about"].map((t) => `
          <div class="hx-tab ${t === activeTab ? "active" : ""}" data-tab="${t}">
            ${{ plugins: "🧩 Plugins", themes: "🎨 Themes", about: "ℹ️ About" }[t]}
          </div>
        `).join("")}
      </div>
    `;

    let content = "";
    if (activeTab === "plugins") content = this._buildPlugins();
    else if (activeTab === "themes") content = this._buildThemes();
    else content = this._buildAbout();

    return `<div class="hx-panel"><div class="hx-header">HaxCord</div>${tabBar}${content}</div>`;
  },

  _buildPlugins() {
    const plugins = PluginManager.getAll();
    if (!plugins.length) {
      return `<div class="hx-empty">No plugins installed yet.<br>
        Drop <code>.js</code> files into the <code>plugins/</code> folder.</div>`;
    }
    return plugins.map((p) => `
      <div class="hx-card">
        <div>
          <div class="hx-card-title">${p.manifest.name}<span class="hx-badge">v${p.manifest.version}</span></div>
          <div class="hx-card-meta">${p.manifest.author ? `by ${p.manifest.author} — ` : ""}${p.manifest.description || "No description"}</div>
        </div>
        <label class="hx-toggle">
          <input type="checkbox" data-plugin="${p.manifest.name}" ${p.enabled ? "checked" : ""}>
          <span class="hx-toggle-slider"></span>
        </label>
      </div>
    `).join("");
  },

  _buildThemes() {
    const themes = ThemeLoader.getAll();
    if (!themes.length) {
      return `<div class="hx-empty">No themes installed yet.<br>
        Drop <code>.css</code> files into the <code>themes/</code> folder.</div>`;
    }
    return themes.map((t) => `
      <div class="hx-card">
        <div>
          <div class="hx-card-title">${t.name}<span class="hx-badge">v${t.version}</span></div>
          <div class="hx-card-meta">${t.author !== "Unknown" ? `by ${t.author} — ` : ""}${t.description || t.filename}</div>
        </div>
        <label class="hx-toggle">
          <input type="checkbox" data-theme="${t.filename.replace(/\.theme\.css$|\.css$/, "")}" ${t.enabled ? "checked" : ""}>
          <span class="hx-toggle-slider"></span>
        </label>
      </div>
    `).join("");
  },

  _buildAbout() {
    const version = "0.2.0";
    const plugins = PluginManager.getAll();
    const themes = ThemeLoader.getAll();
    return `
      <div class="hx-subheader">A lightweight Discord client mod.</div>
      <div class="hx-about-grid">
        <div class="hx-stat"><div class="hx-stat-label">Version</div><div class="hx-stat-value">v${version}</div></div>
        <div class="hx-stat"><div class="hx-stat-label">Plugins</div><div class="hx-stat-value">${plugins.filter(p=>p.enabled).length} / ${plugins.length}</div></div>
        <div class="hx-stat"><div class="hx-stat-label">Themes</div><div class="hx-stat-value">${themes.filter(t=>t.enabled).length} / ${themes.length}</div></div>
        <div class="hx-stat"><div class="hx-stat-label">Platform</div><div class="hx-stat-value" style="font-size:14px;">${process.platform}</div></div>
      </div>
      <div style="margin-top:20px; display:flex; gap:10px;">
        <button class="hx-btn hx-btn-primary" id="hx-check-updates">Check for Updates</button>
        <button class="hx-btn hx-btn-secondary" id="hx-reload-discord">Reload Discord</button>
      </div>
    `;
  },

  _attachListeners(panel) {
    panel.querySelectorAll(".hx-tab[data-tab]").forEach((tab) => {
      tab.addEventListener("click", () => this.openPanel(tab.dataset.tab));
    });
    panel.querySelectorAll("input[data-plugin]").forEach((cb) => {
      cb.addEventListener("change", async (e) => {
        if (e.target.checked) await PluginManager.enable(e.target.dataset.plugin);
        else await PluginManager.disable(e.target.dataset.plugin);
      });
    });
    panel.querySelectorAll("input[data-theme]").forEach((cb) => {
      cb.addEventListener("change", (e) => {
        if (e.target.checked) ThemeLoader.enable(e.target.dataset.theme);
        else ThemeLoader.disable(e.target.dataset.theme);
      });
    });
    panel.querySelector("#hx-check-updates")?.addEventListener("click", () => {
      require("../Updater").check(false);
    });
    panel.querySelector("#hx-reload-discord")?.addEventListener("click", () => {
      window.location.reload();
    });
  },

  _findInTree(node, predicate, depth = 0) {
    if (depth > 20 || !node || typeof node !== "object") return null;
    if (predicate(node)) return node;
    if (node.props) { const r = this._findInTree(node.props, predicate, depth + 1); if (r) return r; }
    if (Array.isArray(node.children)) {
      for (const child of node.children) { const r = this._findInTree(child, predicate, depth + 1); if (r) return r; }
    }
    return null;
  },

  uninject() {
    if (this._unpatch) this._unpatch();
    document.getElementById(STYLE_ID)?.remove();
  },
};

module.exports = SettingsUI;
