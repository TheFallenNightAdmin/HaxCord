/**
 * ShowTimezones - HaxCord built-in plugin
 * Shows a user's local time in their profile popout (if they've set a timezone)
 * Stores your own timezone locally and shows it to other HaxCord users via bio parsing
 */

module.exports = {
  _manifest: {
    name: "ShowTimezones",
    version: "1.0.0",
    description: "Shows local time in user profiles",
    author: "HaxCord",
    builtin: true,
  },

  _unpatch: null,

  start() {
    const { Webpack, Patcher } = window.HaxCord;

    const UserPopout = Webpack.getByDisplayName("UserPopout") ||
      Webpack.getByProps("renderHeader", "renderBio");

    if (!UserPopout) {
      console.warn("[ShowTimezones] Could not find UserPopout");
      return;
    }

    const React = Webpack.getByProps("createElement");
    if (!React) return;

    this._unpatch = Patcher.after(
      "ShowTimezones",
      UserPopout.prototype || UserPopout,
      "render",
      (args, result) => {
        try {
          const user = args[0]?.user || this._findProp(result, "user");
          if (!user) return result;

          const timezone = this._getTimezoneFromBio(user.bio || "");
          if (!timezone) return result;

          const timeDisplay = this._buildTimeDisplay(React, timezone, user.username);
          this._injectIntoResult(result, timeDisplay);
        } catch (_) {}
        return result;
      }
    );

    console.log("[ShowTimezones] Started");
  },

  stop() {
    if (this._unpatch) this._unpatch();
  },

  _getTimezoneFromBio(bio) {
    
    const match = bio.match(/\[tz:([^\]]+)\]/);
    return match ? match[1] : null;
  },

  _buildTimeDisplay(React, timezone, username) {
    let timeStr = "Unknown";
    try {
      timeStr = new Date().toLocaleTimeString("en-US", {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (_) {}

    return React.createElement("div", {
      style: {
        fontSize: "12px",
        color: "var(--text-muted)",
        marginTop: "4px",
        display: "flex",
        alignItems: "center",
        gap: "4px",
      },
    },
      React.createElement("span", null, "🕐"),
      React.createElement("span", null, `Local time: ${timeStr} (${timezone})`)
    );
  },

  _injectIntoResult(result, element) {

    const target = this._findInTree(result, (node) =>
      node?.props?.className?.includes?.("userBio") ||
      node?.props?.className?.includes?.("note")
    );
    if (target && Array.isArray(target.props?.children)) {
      target.props.children.push(element);
    }
  },

  _findInTree(node, predicate, depth = 0) {
    if (depth > 15 || !node || typeof node !== "object") return null;
    if (predicate(node)) return node;
    const children = node.props?.children;
    if (Array.isArray(children)) {
      for (const child of children) {
        const r = this._findInTree(child, predicate, depth + 1);
        if (r) return r;
      }
    } else if (children) {
      return this._findInTree(children, predicate, depth + 1);
    }
    return null;
  },

  _findProp(node, prop, depth = 0) {
    if (depth > 10 || !node || typeof node !== "object") return null;
    if (node?.props?.[prop]) return node.props[prop];
    const children = node?.props?.children;
    if (Array.isArray(children)) {
      for (const child of children) {
        const r = this._findProp(child, prop, depth + 1);
        if (r) return r;
      }
    }
    return null;
  },
};
