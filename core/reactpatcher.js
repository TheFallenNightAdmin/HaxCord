const { Patcher } = require("./patcher");
const { Modules } = require("./webpack");

class ReactPatcher {

  static patchRender(displayName, callback) {
    const ComponentModule = Modules.findByDisplayName(displayName);
    if (!ComponentModule || !ComponentModule.default) {
      console.warn(`[HaxCord] Component ${displayName} not found`);
      return;
    }

    const Component = ComponentModule.default;

    // If class component, patch prototype.render
    if (Component.prototype?.render) {
      Patcher.instead(
        "ReactPatcher",
        Component.prototype,
        "render",
        (original, args, context) => callback(original.bind(context), args, context)
      );
    } else {
      // If function component, patch apply (function call)
      Patcher.instead(
        "ReactPatcher",
        Component,
        "apply",
        (original, args) => callback(original, args)
      );
    }

    console.log(`[HaxCord] Patched React component: ${displayName}`);
  }
}

module.exports = { ReactPatcher };
