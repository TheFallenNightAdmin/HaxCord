/**
 * HaxCord Auto-Updater
 * Checks GitHub releases for updates and applies them automatically
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const GITHUB_REPO = "TheFallenNightAdmin/haxcord";
const CURRENT_VERSION = require("../../package.json").version;
const HAXCORD_ROOT = path.resolve(__dirname, "../..");

const Updater = {
  async check(silent = false) {
    try {
      const latest = await this._fetchLatestRelease();
      if (!latest) return;

      if (this._isNewer(latest.version, CURRENT_VERSION)) {
        console.log(`[HaxCord/Updater] Update available: v${CURRENT_VERSION} → v${latest.version}`);
        this._notifyUser(latest);
      } else if (!silent) {
        console.log(`[HaxCord/Updater] Up to date (v${CURRENT_VERSION})`);
      }
    } catch (e) {
      console.warn("[HaxCord/Updater] Update check failed:", e.message);
    }
  },

  _fetchLatestRelease() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: "api.github.com",
        path: `/repos/${GITHUB_REPO}/releases/latest`,
        headers: { "User-Agent": "HaxCord-Updater" },
      };

      https.get(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const release = JSON.parse(data);
            resolve({
              version: release.tag_name?.replace(/^v/, "") ?? null,
              url: release.html_url,
              notes: release.body ?? "",
              zipUrl: release.zipball_url,
            });
          } catch (e) {
            reject(e);
          }
        });
        res.on("error", reject);
      }).on("error", reject);
    });
  },

  _isNewer(latest, current) {
    const parse = (v) => v.split(".").map(Number);
    const [lMaj, lMin, lPatch] = parse(latest);
    const [cMaj, cMin, cPatch] = parse(current);
    if (lMaj !== cMaj) return lMaj > cMaj;
    if (lMin !== cMin) return lMin > cMin;
    return lPatch > cPatch;
  },

  _notifyUser(release) {

    const toastContainer = this._getOrCreateToastContainer();

    const toast = document.createElement("div");
    toast.style.cssText = `
      background: var(--background-floating);
      border: 1px solid var(--brand-experiment);
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 10px;
      color: var(--header-primary);
      box-shadow: var(--elevation-high);
      max-width: 340px;
      animation: haxcord-slideIn 0.2s ease;
    `;

    toast.innerHTML = `
      <div style="font-weight:700; margin-bottom:4px;">
        🚀 HaxCord Update Available
      </div>
      <div style="font-size:13px; color:var(--text-muted); margin-bottom:10px);">
        v${CURRENT_VERSION} → v${release.version}
      </div>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <button id="haxcord-update-btn" style="
          background: var(--brand-experiment);
          color: white;
          border: none;
          border-radius: 4px;
          padding: 6px 14px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
        ">Update Now</button>
        <button id="haxcord-dismiss-btn" style="
          background: var(--background-modifier-hover);
          color: var(--text-normal);
          border: none;
          border-radius: 4px;
          padding: 6px 14px;
          cursor: pointer;
          font-size: 13px;
        ">Later</button>
      </div>
    `;

    toastContainer.appendChild(toast);

    toast.querySelector("#haxcord-update-btn").onclick = () => {
      this._applyUpdate(release);
      toast.remove();
    };
    toast.querySelector("#haxcord-dismiss-btn").onclick = () => toast.remove();

    setTimeout(() => toast.remove(), 15000);
  },

  async _applyUpdate(release) {
    console.log("[HaxCord/Updater] Applying update...");
    try {

      execSync("git pull", { cwd: HAXCORD_ROOT, stdio: "inherit" });
      execSync("npm install", { cwd: HAXCORD_ROOT, stdio: "inherit" });
      console.log("[HaxCord/Updater] Update applied! Reload Discord to finish.");
      this._showToast("✅ Update applied! Press Ctrl+R to reload Discord.");
    } catch (e) {
      console.error("[HaxCord/Updater] Auto-update failed:", e.message);
      this._showToast("❌ Auto-update failed. Please update manually from GitHub.");
    }
  },

  _showToast(message) {
    const container = this._getOrCreateToastContainer();
    const toast = document.createElement("div");
    toast.style.cssText = `
      background: var(--background-floating);
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 8px;
      color: var(--header-primary);
      box-shadow: var(--elevation-high);
      font-size: 14px;
    `;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
  },

  _getOrCreateToastContainer() {
    let container = document.getElementById("haxcord-toasts");
    if (!container) {
      container = document.createElement("div");
      container.id = "haxcord-toasts";
      container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      `;

      const style = document.createElement("style");
      style.textContent = `
        @keyframes haxcord-slideIn {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(container);
    }
    return container;
  },
};

module.exports = Updater;
