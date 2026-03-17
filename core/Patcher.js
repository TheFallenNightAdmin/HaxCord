/**
 * HaxCord Patcher v2
 * Safely patches functions with before/after/instead hooks.
 * All patches are tracked and can be removed cleanly.
 */

class Patcher {
  static _patches = [];

  static before(pluginName, module, method, callback) {
    if (!module || !module[method]) {
      console.warn(`[HaxCord] Cannot patch ${method} - module missing`);
      return;
    }

    const original = module[method];
    const patch = function (...args) {
      try {
        callback(args, this);
      } catch (err) {
        console.error(`[HaxCord] Error in before patch for ${method}`, err);
      }
      return original.apply(this, args);
    };

    module[method] = patch;
    Patcher._patches.push({ pluginName, module, method, original });
    console.log(`[HaxCord] Patched (before) ${method} from ${pluginName}`);
  }

  /**
   * Patch a method after it executes
   */
  static after(pluginName, module, method, callback) {
    if (!module || !module[method]) {
      console.warn(`[HaxCord] Cannot patch ${method} - module missing`);
      return;
    }

    const original = module[method];
    const patch = function (...args) {
      const result = original.apply(this, args);
      try {
        callback(result, args, this);
      } catch (err) {
        console.error(`[HaxCord] Error in after patch for ${method}`, err);
      }
      return result;
    };

    module[method] = patch;
    Patcher._patches.push({ pluginName, module, method, original });
    console.log(`[HaxCord] Patched (after) ${method} from ${pluginName}`);
  }

  /**
   * Replace a method entirely
   */
  static instead(pluginName, module, method, callback) {
    if (!module || !module[method]) {
      console.warn(`[HaxCord] Cannot patch ${method} - module missing`);
      return;
    }

    const original = module[method];
    const patch = function (...args) {
      try {
        return callback(original.bind(this), args, this);
      } catch (err) {
        console.error(`[HaxCord] Error in instead patch for ${method}`, err);
        return original.apply(this, args);
      }
    };

    module[method] = patch;
    Patcher._patches.push({ pluginName, module, method, original });
    console.log(`[HaxCord] Patched (instead) ${method} from ${pluginName}`);
  }

  /**
   * Unpatch all methods from a plugin
   */
  static unpatchAll(pluginName) {
    Patcher._patches
      .filter(p => p.pluginName === pluginName)
      .forEach(p => {
        p.module[p.method] = p.original;
      });

    Patcher._patches = Patcher._patches.filter(p => p.pluginName !== pluginName);
    console.log(`[HaxCord] Unpatched all from ${pluginName}`);
  }
}

module.exports = { Patcher };
