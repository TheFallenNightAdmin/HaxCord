/**
 * HaxCord Patcher
 * Safely patches functions with before/after/instead hooks.
 * All patches are tracked and can be removed cleanly.
 */

let _patchId = 0;
const _patches = new Map();

const Patcher = {
  init() {
  },


  before(caller, module, method, callback) {
    return this._addHook("before", caller, module, method, callback);
  },


  after(caller, module, method, callback) {
    return this._addHook("after", caller, module, method, callback);
  },


  instead(caller, module, method, callback) {
    return this._addHook("instead", caller, module, method, callback);
  },

  _addHook(type, caller, module, method, callback) {
    const id = ++_patchId;
    const key = `${module}.${method}`;

    if (!_patches.has(key)) {
      const original = module[method];
      const hooks = { before: [], after: [], instead: [] };

      module[method] = function (...args) {
        const entry = _patches.get(key);
        if (!entry) return original.apply(this, args);

        for (const hook of entry.hooks.before) {
          try {
            const newArgs = hook.callback.call(this, args);
            if (Array.isArray(newArgs)) args = newArgs;
          } catch (e) {
            console.error(`[HaxCord/Patcher] Before hook error (${hook.caller}):`, e);
          }
        }

        let result;

        if (entry.hooks.instead.length > 0) {

          const instead = entry.hooks.instead[entry.hooks.instead.length - 1];
          try {
            result = instead.callback.call(this, args, original.bind(this));
          } catch (e) {
            console.error(`[HaxCord/Patcher] Instead hook error (${instead.caller}):`, e);
            result = original.apply(this, args);
          }
        } else {
          result = original.apply(this, args);
        }

        for (const hook of entry.hooks.after) {
          try {
            const newResult = hook.callback.call(this, args, result);
            if (newResult !== undefined) result = newResult;
          } catch (e) {
            console.error(`[HaxCord/Patcher] After hook error (${hook.caller}):`, e);
          }
        }

        return result;
      };

      Object.assign(module[method], original);
      module[method].__haxcord_original = original;

      _patches.set(key, { module, method, original, hooks });
    }

    const entry = _patches.get(key);
    const hook = { id, caller, callback };
    entry.hooks[type].push(hook);

    return () => this._removeHook(key, type, id);
  },

  _removeHook(key, type, id) {
    const entry = _patches.get(key);
    if (!entry) return;

    entry.hooks[type] = entry.hooks[type].filter((h) => h.id !== id);

    const total =
      entry.hooks.before.length +
      entry.hooks.after.length +
      entry.hooks.instead.length;

    if (total === 0) {
      entry.module[entry.method] = entry.original;
      _patches.delete(key);
    }
  },

  unpatchAll(caller) {
    for (const [key, entry] of _patches.entries()) {
      for (const type of ["before", "after", "instead"]) {
        entry.hooks[type] = entry.hooks[type].filter((h) => {
          return h.caller !== caller;
        });
      }
      const total =
        entry.hooks.before.length +
        entry.hooks.after.length +
        entry.hooks.instead.length;
      if (total === 0) {
        entry.module[entry.method] = entry.original;
        _patches.delete(key);
      }
    }
  },
};

module.exports = Patcher;
