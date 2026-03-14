/**
 * CustomCSS - HaxCord built-in plugin
 * Lets you write and apply your own CSS directly inside Discord
 */

const fs = require("fs");
const path = require("path");

const CSS_FILE = path.join(__dirname, "../../haxcord-custom.css");
const STYLE_ID = "haxcord-custom-css";

module.exports = {
  _manifest: {
    name: "CustomCSS",
    version: "1.0.0",
    description: "Write and apply custom CSS to Discord",
    author: "HaxCord",
    builtin: true,
  },

  _styleEl: null,
  _editorOpen: false,

  start() {

    this._applyCSS(this._loadCSS());

    this._keyHandler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "K") {
        e.preventDefault();
        this._toggleEditor();
      }
    };
    document.addEventListener("keydown", this._keyHandler);
    console.log("[CustomCSS] Started (Ctrl+Shift+K to open editor)");
  },

  stop() {
    this._removeCSS();
    if (this._keyHandler) document.removeEventListener("keydown", this._keyHandler);
    document.getElementById("haxcord-css-editor")?.remove();
  },

  _loadCSS() {
    try {
      if (fs.existsSync(CSS_FILE)) return fs.readFileSync(CSS_FILE, "utf8");
    } catch (_) {}
    return "/* Write your custom CSS here */\n";
  },

  _saveCSS(css) {
    try { fs.writeFileSync(CSS_FILE, css, "utf8"); } catch (_) {}
  },

  _applyCSS(css) {
    if (!this._styleEl) {
      this._styleEl = document.createElement("style");
      this._styleEl.id = STYLE_ID;
      document.head.appendChild(this._styleEl);
    }
    this._styleEl.textContent = css;
  },

  _removeCSS() {
    this._styleEl?.remove();
    this._styleEl = null;
  },

  _toggleEditor() {
    const existing = document.getElementById("haxcord-css-editor");
    if (existing) { existing.remove(); this._editorOpen = false; return; }
    this._openEditor();
    this._editorOpen = true;
  },

  _openEditor() {
    const css = this._loadCSS();
    const overlay = document.createElement("div");
    overlay.id = "haxcord-css-editor";
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 10000;
      background: rgba(0,0,0,0.7);
      display: flex; align-items: center; justify-content: center;
    `;

    overlay.innerHTML = `
      <div style="
        background: var(--background-primary); border-radius: 12px;
        width: 700px; max-height: 80vh; display: flex; flex-direction: column;
        box-shadow: var(--elevation-high); overflow: hidden;
      ">
        <div style="
          padding: 16px 20px; border-bottom: 1px solid var(--background-modifier-accent);
          display: flex; align-items: center; justify-content: space-between;
        ">
          <span style="font-weight:700; font-size:16px; color:var(--header-primary);">
            🎨 Custom CSS
          </span>
          <div style="display:flex; gap:8px;">
            <button id="hxcss-apply" style="
              background:var(--brand-experiment); color:white; border:none;
              border-radius:4px; padding:6px 14px; cursor:pointer; font-weight:600;
            ">Apply</button>
            <button id="hxcss-close" style="
              background:var(--background-modifier-hover); color:var(--text-normal); border:none;
              border-radius:4px; padding:6px 14px; cursor:pointer;
            ">Close</button>
          </div>
        </div>
        <textarea id="hxcss-textarea" spellcheck="false" style="
          flex: 1; background: var(--background-secondary); color: var(--text-normal);
          border: none; padding: 16px; font-family: monospace; font-size: 13px;
          resize: none; outline: none; min-height: 400px; line-height: 1.5;
        ">${css.replace(/</g, "&lt;")}</textarea>
        <div style="
          padding: 8px 16px; font-size: 12px; color: var(--text-muted);
          border-top: 1px solid var(--background-modifier-accent);
        ">
          Ctrl+Shift+K to toggle • Changes saved automatically
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const textarea = overlay.querySelector("#hxcss-textarea");

    overlay.querySelector("#hxcss-apply").onclick = () => {
      const css = textarea.value;
      this._applyCSS(css);
      this._saveCSS(css);
    };

    overlay.querySelector("#hxcss-close").onclick = () => {
      overlay.remove();
      this._editorOpen = false;
    };

    let debounce;
    textarea.addEventListener("input", () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => this._applyCSS(textarea.value), 300);
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) { overlay.remove(); this._editorOpen = false; }
    });

    textarea.focus();
  },
};
