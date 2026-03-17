// loader.js - updated for reliable injection

const { Patcher } = require("./patcher"); // your patcher
const { Modules } = require("./webpack"); // module finder

// Wait until Discord's Webpack is ready
function waitForDiscord(callback) {
  if (!window.webpackChunkdiscord_app) {
    return setTimeout(() => waitForDiscord(callback), 50);
  }
  callback();
}

// Run injection
function runInjection() {
  console.log("[HaxCord] Starting injection...");

  // Grab webpack require
  const req = window.webpackChunkdiscord_app.push([
    [Math.random()],
    {},
    (r) => r
  ]);

  // Get all modules
  const modules = Object.values(req.c).filter(m => m && m.exports);
  console.log(`[HaxCord] Found ${modules.length} modules`);

  // Example: find a module dynamically
  const MessageModule = modules.find(m =>
    m.exports?.default?.sendMessage ||
    m.exports?.sendMessage
  );

  if (!MessageModule) {
    console.warn("[HaxCord] Message module not found! Injection may fail.");
    return;
  }

  console.log("[HaxCord] Message module found, patching...");

  // Example patch: log every message sent
  Patcher.before("HaxCord", MessageModule.exports.default || MessageModule.exports, "sendMessage", (args) => {
    console.log("[HaxCord] Intercepted message:", args);
  });

  console.log("[HaxCord] Injection complete!");
}

// Start
waitForDiscord(runInjection);
