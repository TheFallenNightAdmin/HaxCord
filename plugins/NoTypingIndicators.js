/**
 * NoTypingIndicators - HaxCord built-in plugin
 * Hides the "X is typing..." indicator in all channels
 */

module.exports = {
  _manifest: {
    name: "NoTypingIndicators",
    version: "1.0.0",
    description: 'Hides the "X is typing..." indicator',
    author: "HaxCord",
    builtin: true,
  },

  _unpatch: null,
  _styleEl: null,

  start() {
    const { Webpack, Patcher } = window.HaxCord;

    const TypingStore = Webpack.getByProps("getTypingUsers", "isTyping");
    if (TypingStore) {
      this._unpatch = Patcher.instead(
        "NoTypingIndicators",
        TypingStore,
        "getTypingUsers",
        () => ({})
      );
    }

    this._styleEl = document.createElement("style");
    this._styleEl.id = "haxcord-no-typing";
    this._styleEl.textContent = `
      [class*="typingIndicator"],
      [class*="typing-"] { display: none !important; }
    `;
    document.head.appendChild(this._styleEl);

    console.log("[NoTypingIndicators] Started");
  },

  stop() {
    if (this._unpatch) this._unpatch();
    this._styleEl?.remove();
    console.log("[NoTypingIndicators] Stopped");
  },
};
