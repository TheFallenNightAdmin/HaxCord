/**
 * HaxCord Webpack v2
 * Hooks into Discord's webpack and lets you find internal modules
 */

const Modules = {
  getAll: function () {
    if (!window.webpackChunkdiscord_app) return [];
    const req = window.webpackChunkdiscord_app.push([
      [Math.random()],
      {},
      (r) => r
    ]);
    return Object.values(req.c).filter(m => m && m.exports);
  },

  findByProps: function (...props) {
    const modules = this.getAll();
    return modules.find(m =>
      m.exports && props.every(p => p in (m.exports.default || m.exports))
    )?.exports;
  },

  findByDisplayName: function(name) {
    const modules = this.getAll();
    return modules.find(m =>
      m.exports && (m.exports.default?.displayName === name)
    )?.exports;
  }
};

module.exports = { Modules };
