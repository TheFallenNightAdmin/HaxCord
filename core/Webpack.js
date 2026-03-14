/**
 * HaxCord Webpack
 * Hooks into Discord's webpack and lets you find internal modules
 */

const Webpack = {
  _modules: null,

  init() {
    return new Promise((resolve) => {
      const check = () => {
        if (window.webpackChunkdiscord_app) {
          this._hookWebpack();
          resolve();
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  },

  _hookWebpack() {
    const chunk = window.webpackChunkdiscord_app;
    const modules = {};

    chunk.push([
      [Symbol()],
      {},
      (req) => {

        for (const id of Object.keys(req.c)) {
          modules[id] = req.c[id].exports;
        }
        this._modules = modules;
        this._require = req;
      },
    ]);

    console.log(`[HaxCord/Webpack] Cached ${Object.keys(modules).length} modules`);
  },

  getModule(filter) {
    if (!this._modules) return null;

    for (const id of Object.keys(this._modules)) {
      const mod = this._modules[id];
      try {
        if (mod && filter(mod)) return mod;
        if (mod?.default && filter(mod.default)) return mod.default;
      } catch (_) {}
    }
    return null;
  },

  getByProps(...props) {
    return this.getModule((m) => props.every((p) => p in m));
  },

  getByDisplayName(name) {
    return this.getModule(
      (m) => m?.displayName === name || m?.default?.displayName === name
    );
  },

  getAll(filter) {
    if (!this._modules) return [];
    const results = [];
    for (const id of Object.keys(this._modules)) {
      const mod = this._modules[id];
      try {
        if (mod && filter(mod)) results.push(mod);
      } catch (_) {}
    }
    return results;
  },
};

module.exports = Webpack;
