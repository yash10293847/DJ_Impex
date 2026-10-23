const { globSync } = require("tinyglobby");

// @next/eslint-plugin-next uses only globSync(pattern, { onlyDirectories: true }).
// tinyglobby expands literal directories by default, unlike fast-glob; disable
// expansion and normalize trailing separators to preserve the plugin's contract.
exports.globSync = (pattern, options) => globSync(pattern, { ...options, expandDirectories: false })
  .map((entry) => entry.replace(/\/$/, ""));
