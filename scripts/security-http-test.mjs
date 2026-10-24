import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import { setTimeout as pause } from "node:timers/promises";
import { readFileSync, readdirSync } from "node:fs";

const require = createRequire(import.meta.url);
const port = 3100;
// All overrides apply only to this local child process. No environment files,
// remote settings, real mail providers, customer data, or Blob stores are modified.
const env = { ...process.env, NODE_ENV: "production", CONTACT_EMAIL_ENABLED: "false", APP_ORIGIN: "https://audit.example" };
for (const name of readdirSync(".").filter((name) => /^\.env(?:\.|$)/.test(name))) {
  for (const line of readFileSync(name, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=/.exec(line);
    if (match && /PASS|TOKEN|SECRET|API_KEY|ENCRYPTION_KEY/.test(match[1]) && !match[1].startsWith("NEXT_PUBLIC_")) env[match[1]] = "";
  }
}
for (const key of Object.keys(env)) if (/PASS|TOKEN|SECRET|API_KEY|ENCRYPTION_KEY/.test(key) && !key.startsWith("NEXT_PUBLIC_")) env[key] = "";
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(port)], { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
let exited = false;
child.on("exit", () => { exited = true; });
child.stdout.on("data", () => {});
child.stderr.on("data", () => {});
const stop = () => { if (!exited) child.kill(); };
process.on("SIGINT", () => { stop(); process.exit(130); });
process.on("SIGTERM", () => { stop(); process.exit(143); });
let ready = false;
try {
  for (let i = 0; i < 120; i++) {
    if (exited) throw new Error("The isolated production server could not start; verify port 3100 is free.");
    try { const r = await fetch(`http://127.0.0.1:${port}/admin/login`); if (r.status === 200) { ready = true; break; } } catch { /* startup */ }
    await pause(250);
  }
  assert.ok(ready, "Production server startup timed out.");
  let checked = 0;
  async function check(route, expected, options = {}) {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, { redirect: "manual", ...options });
    assert.equal(response.status, expected, `${options.method || "GET"} ${route}`);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    if (route.startsWith("/admin") || route.startsWith("/api/admin")) assert.match(response.headers.get("cache-control"), /no-store/);
    const body = await response.text();
    assert.equal(/(?:node_modules[\\/]|C:\\Users\\|Error:.*\n\s+at )/.test(body), false, "Production responses must not expose paths or stacks.");
    checked++;
    return { response, body };
  }
  const page = await check("/", 200);
  const nonce = /'nonce-([^']+)'/.exec(page.response.headers.get("content-security-policy"))?.[1];
  assert.ok(nonce); assert.ok(page.body.includes(`nonce="${nonce}"`));
  const nextPage = await check("/admin/login", 200);
  assert.notEqual(nextPage.response.headers.get("content-security-policy"), page.response.headers.get("content-security-policy"));
  for (const route of ["/admin/security", "/admin/enquiries", "/admin/blogs", "/admin/images", "/admin/page-images", "/admin/wear2care", "/admin/nabeen-collection", "/admin/the-nabeen-collection"]) {
    await check(route, 307, { headers: { cookie: "__Host-dji_admin_session=authenticated; dji_admin_session=authenticated" } });
  }
  await check("/admin/enquiries?_rsc=security-check", 307, { headers: { rsc: "1", "next-router-prefetch": "1", cookie: "__Host-dji_admin_session=authenticated", "x-nonce": "forged", "x-site-pathname": "/admin/login" } });
  for (const resource of ["blogs", "images", "slots", "enquiries"]) {
    await check(`/api/admin/${resource}`, 401);
    await check(`/api/admin/${resource}`, 401, { method: resource === "enquiries" ? "GET" : "POST", headers: { cookie: "__Host-dji_admin_session=authenticated", origin: "https://audit.example" } });
  }
  for (const route of ["/.env", "/.env.local", "/data/auth.json", "/data/enquiries.json", "/_todo", "/media/%2e%2e%2fauth.json"]) await check(route, 404);
  console.log(`Production HTTP security checks passed: ${checked} responses; CSP nonces, admin denial, private file denial, headers and sanitized errors verified. External credentials were disabled.`);
  if (process.argv.includes("--serve")) {
    console.log(`Isolated browser preview: http://127.0.0.1:${port}. Press Ctrl+C to stop.`);
    await new Promise((resolve) => child.on("exit", resolve));
  }
} finally { stop(); }
