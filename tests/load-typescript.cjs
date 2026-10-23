const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

/** Compile actual application modules in an isolated context, mocking only I/O.
 * Uses existing TypeScript + node:test; no production/test runner dependency. */
function createLoader({ mocks = {}, env = {}, cwd } = {}) {
  const cache = new Map();
  const root = path.resolve(__dirname, "..");
  const sandbox = { Buffer, URL, Headers, Request, Response, FormData, File, TextDecoder, TextEncoder,
    crypto: globalThis.crypto, console, setTimeout, clearTimeout, process: { env: { ...env }, cwd: () => cwd || root },
  };
  const context = vm.createContext(sandbox);
  function load(filename) {
    filename = path.resolve(root, filename);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    }, fileName: filename }).outputText;
    function localRequire(id) {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id === "server-only") return {};
      if (id.startsWith("@/") || id.startsWith(".")) {
        let next = id.startsWith("@/") ? path.join(root, "src", id.slice(2)) : path.resolve(path.dirname(filename), id);
        next = [next, next + ".ts", next + ".tsx", path.join(next, "index.ts")].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
        if (!next) throw new Error(`Cannot resolve test import ${id}`);
        const relative = path.relative(root, next).replaceAll("\\", "/");
        if (Object.hasOwn(mocks, relative)) return mocks[relative];
        return load(next);
      }
      return require(id);
    }
    const execute = vm.runInContext(`(function(require,module,exports,__dirname){${source}\n})`, context, { filename });
    execute(localRequire, module, module.exports, path.dirname(filename));
    return module.exports;
  }
  return { load, env: sandbox.process.env };
}
module.exports = { createLoader };
