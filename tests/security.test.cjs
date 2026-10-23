const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes, scryptSync } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { createLoader } = require("./load-typescript.cjs");

class VersionConflict extends Error {}
function memoryStorage() {
  const docs = new Map();
  let revision = 0;
  return {
    docs,
    VersionConflict,
    storage: () => ({
      async readDoc(key) {
        const doc = docs.get(key);
        // Simulate network interleaving between independent server instances.
        await new Promise((resolve) => setTimeout(resolve, 1));
        return doc ? { ...doc } : null;
      },
      async writeDoc(key, text, expected) {
        if ((docs.get(key)?.version ?? null) !== expected) throw new VersionConflict();
        docs.set(key, { text, version: String(++revision) });
      },
    }),
  };
}
function fixture(extra = {}) {
  const password = randomBytes(24).toString("hex");
  const salt = randomBytes(16).toString("hex");
  const hash = `scrypt-v1:${salt}:${scryptSync(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }).toString("hex")}`;
  const io = memoryStorage();
  const jar = new Map();
  let requestHeaders = new Headers({ origin: "https://audit.example", "sec-fetch-site": "same-origin" });
  const cookieOptions = [];
  const cookies = { get: (name) => jar.has(name) ? { value: jar.get(name) } : undefined,
    set: (name, value, options) => { jar.set(name, value); cookieOptions.push(options); }, delete: (name) => jar.delete(name) };
  const env = { NODE_ENV: "test", APP_ORIGIN: "https://audit.example", ADMIN_PASSWORD_HASH: hash, SECURITY_SECRET: randomBytes(32).toString("hex"), ...extra.env };
  const mocks = {
    "@/lib/admin/storage": io,
    "src/lib/admin/storage/index.ts": io,
    "next/headers": { cookies: async () => cookies, headers: async () => requestHeaders },
    "next/navigation": { redirect: (url) => { const error = new Error("redirect"); error.destination = url; throw error; } },
    ...extra.mocks,
  };
  const loader = createLoader({ env, mocks });
  return { ...loader, io, jar, password, hash, cookieOptions, mocks,
    setHeaders: (value) => { requestHeaders = new Headers(value); },
    another: () => createLoader({ env, mocks }),
  };
}
const modulePath = (name) => `src/lib/security/${name}.ts`;

test("S01/S02: cookie presence, arbitrary values and plaintext passwords never authenticate", async () => {
  const f = fixture(); const session = f.load(modulePath("session"));
  assert.equal(await session.currentSession(), null);
  f.jar.set(session.sessionCookieName(), "authenticated");
  assert.equal(await session.currentSession(), null);
  f.jar.set(session.sessionCookieName(), randomBytes(32).toString("hex"));
  assert.equal(await session.currentSession(), null);
  const password = f.load(modulePath("password"));
  assert.equal(await password.verifyPassword(f.password, f.password), false);
  assert.equal(await password.verifyPassword("x".repeat(257), f.hash), false);
  await assert.rejects(session.requireAdmin(), (error) => error.status === 401);
});

test("S02: absent or malformed credentials fail closed; tracked auth is never a fallback", async () => {
  const f = fixture({ env: { ADMIN_PASSWORD_HASH: undefined } });
  await assert.rejects(f.load(modulePath("session")).readAuth(), (error) => error.status === 503);
  f.io.docs.set("security/admin.json", { text: "{broken", version: "1" });
  await assert.rejects(f.load(modulePath("session")).readAuth());
  assert.equal(f.io.docs.has("collections/auth.json"), false);
});

test("S04: opaque session, secure cookies, server expiry and persistent logout replay rejection", async () => {
  const f = fixture({ env: { NODE_ENV: "production" } }); const session = f.load(modulePath("session"));
  await session.createSession(f.hash, false);
  const cookie = f.jar.get(session.sessionCookieName());
  assert.match(session.sessionCookieName(), /^__Host-/);
  assert.equal(f.cookieOptions[0].httpOnly, true); assert.equal(f.cookieOptions[0].secure, true);
  assert.equal(f.cookieOptions[0].sameSite, "lax"); assert.equal(f.cookieOptions[0].path, "/");
  assert.equal(f.cookieOptions[0].maxAge, 86400);
  assert.equal(f.io.docs.get("security/admin.json").text.includes(cookie), false);
  assert.ok(await f.another().load(modulePath("session")).currentSession());
  await session.revokeSession(); f.jar.set(session.sessionCookieName(), cookie);
  assert.equal(await f.another().load(modulePath("session")).currentSession(), null);
  await session.createSession(f.hash, true);
  assert.equal(f.cookieOptions.at(-1).maxAge, 30 * 86400);
  const doc = f.io.docs.get("security/admin.json"); const auth = JSON.parse(doc.text);
  auth.sessions[0].expires = Date.now() - 1; doc.text = JSON.stringify(auth);
  assert.equal(await session.currentSession(), null);
});

test("S04: password change invalidates other sessions and prevents stale login races", async () => {
  const f = fixture(); const session = f.load(modulePath("session"));
  await session.createSession(f.hash, false); const first = f.jar.get(session.sessionCookieName());
  await session.createSession(f.hash, true); const active = await session.requireAdmin();
  const nextHash = await f.load(modulePath("password")).hashPassword(randomBytes(24).toString("hex"));
  await session.replacePassword(f.hash, nextHash, active.tokenHash);
  f.jar.set(session.sessionCookieName(), first); assert.equal(await session.currentSession(), null);
  await assert.rejects(session.createSession(f.hash, false), (error) => error.status === 401);
  assert.equal((await session.readAuth()).passwordHash, nextHash);
});

test("S02/S05: password change requires an authenticated session; missing Origin is denied", async () => {
  const f = fixture(); const actions = f.load("src/app/actions/admin-auth.ts");
  const data = new FormData(); data.set("oldPassword", f.password); data.set("newPassword", f.password); data.set("confirmPassword", f.password);
  assert.match((await actions.changeAdminPasswordAction({}, data)).error, /sign in/i);
  f.setHeaders({}); assert.match((await actions.loginAdminAction({}, data)).error, /not allowed/i);
  assert.equal(f.io.docs.size, 0);
});

test("S05: login limits run inside the action before hashing and cannot be bypassed by a path", async () => {
  const f = fixture(); const actions = f.load("src/app/actions/admin-auth.ts");
  const data = new FormData(); data.set("password", randomBytes(32).toString("hex"));
  for (let i = 0; i < 5; i++) assert.match((await actions.loginAdminAction({}, data)).error, /Invalid password/);
  const another = f.another().load("src/app/actions/admin-auth.ts");
  assert.match((await another.loginAdminAction({}, data)).error, /Too many requests/);
});

test("S05/S06/S18: independent instances share atomic limits including simultaneous first creation", async () => {
  const f = fixture(); const a = f.load(modulePath("rate-limit")); const b = f.another().load(modulePath("rate-limit"));
  const rule = [{ key: "test", limit: 3, windowMs: 1000 }];
  const results = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => (i % 2 ? a : b).consumeLimits("auth", rule, 10000)));
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 3);
  assert.equal(results.filter((r) => r.status === "rejected" && r.reason.status === 429).length, 7);
  await b.consumeLimits("auth", rule, 11001);
  const entry = JSON.parse(f.io.docs.get("security/rate-auth.json").text).test;
  assert.equal(entry.count, 1);
});

test("S05: security storage failures deny attempts instead of using in-memory fallbacks", async () => {
  const f = fixture({ mocks: { "@/lib/admin/storage": { storage: () => { throw new Error("offline"); } } } });
  await assert.rejects(f.load(modulePath("rate-limit")).consumeLimits("auth", [{ key: "ip", limit: 5, windowMs: 1000 }]));
});

test("S06: client identifiers ignore spoofed forwarded chains and store no raw IP", () => {
  const f = fixture({ env: { VERCEL: "1" } }); const request = f.load(modulePath("request"));
  const trusted = request.clientIdentifier(new Headers({ "x-vercel-forwarded-for": "203.0.113.4", "x-forwarded-for": "1.2.3.4" }));
  assert.equal(trusted, request.clientIdentifier(new Headers({ "x-vercel-forwarded-for": "203.0.113.4", "x-forwarded-for": "5.6.7.8" })));
  assert.equal(trusted.includes("203.0.113.4"), false);
  assert.equal(request.clientIdentifier(new Headers({ "x-forwarded-for": "1.2.3.4" })), request.clientIdentifier(new Headers({ "x-forwarded-for": "5.6.7.8" })));
});

test("S08: exact Origin, Fetch Metadata and JSON content-type checks", async () => {
  const f = fixture(); const request = f.load(modulePath("request"));
  for (const headers of [{}, { origin: "https://evil.example" }, { origin: "null" }, { origin: "https://audit.example", "sec-fetch-site": "same-site" }]) {
    assert.throws(() => request.assertSameOrigin(new Headers(headers)), (error) => error.status === 403);
  }
  request.assertSameOrigin(new Headers({ origin: "https://audit.example", "sec-fetch-site": "same-origin" }));
  await assert.rejects(request.readJson(new Request("https://audit.example", { method: "POST", body: "{}" })), (e) => e.status === 415);
  await assert.rejects(request.readJson(new Request("https://audit.example", { method: "POST", headers: { "content-type": "application/json" }, body: "[invalid" })), (e) => e.status === 400);
});

test("S10: request limits work without a Content-Length header", async () => {
  const f = fixture(); const request = f.load(modulePath("request"));
  const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(100)); c.close(); } });
  await assert.rejects(request.readLimitedBody(new Request("https://audit.example", { method: "POST", body: stream, duplex: "half" }), 10), (e) => e.status === 413);
});

test("S01: all 16 direct admin API operations deny access before collection or body access", async () => {
  let reads = 0;
  class StoreError extends Error {}
  const denyStore = { StoreError, readCollection: () => { reads++; throw new Error(); }, mutate: () => { reads++; throw new Error(); } };
  const f = fixture({ mocks: { "@/lib/admin/store": denyStore, "src/lib/admin/store.ts": denyStore,
    "@/lib/slots": { IMAGE_SLOTS: [], resolveSlots: () => { reads++; throw new Error(); } },
    "@/lib/admin/revalidate": { revalidateJournal() {}, revalidateGallery() {}, revalidateSlots() {} },
  } });
  f.jar.set("dji_admin_session", "authenticated");
  let checked = 0;
  for (const resource of ["blogs", "enquiries", "images", "slots"]) for (const suffix of ["route.ts", "[id]/route.ts"]) {
    const routes = f.load(`src/app/api/admin/${resource}/${suffix}`);
    for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
      if (!routes[method]) continue;
      const result = await routes[method](new Request(`https://audit.example/api/admin/${resource}`, { method }), { params: Promise.resolve({ id: "test" }) });
      assert.equal(result.status, 401); assert.match(result.headers.get("cache-control"), /no-store/); checked++;
    }
  }
  assert.equal(checked, 16); assert.equal(reads, 0);
});

test("S08: authenticated mutation still rejects cross-origin requests before processing", async () => {
  const f = fixture(); await f.load(modulePath("session")).createSession(f.hash, false);
  const api = f.load("src/lib/admin/api.ts");
  await assert.rejects(api.guardAdminRequest(new Request("https://audit.example/api/admin/images", { method: "POST", headers: { origin: "https://evil.example" } })), (e) => e.status === 403);
});

test("S07/S13: email escaping and mandatory verified TLS preserve credential bytes", () => {
  const pass = randomBytes(16).toString("hex") + "  ";
  const f = fixture({ env: { EMAIL_USER: "sender@example.org", EMAIL_PASS: pass, SMTP_PORT: "587" } });
  const mail = f.load(modulePath("mail"));
  assert.equal(mail.escapeHtml('<a x="&">\''), "&lt;a x=&quot;&amp;&quot;&gt;&#39;");
  const config = mail.smtpConfiguration(); assert.equal(config.transport.requireTLS, true);
  assert.equal(config.transport.tls.rejectUnauthorized, true); assert.equal(config.transport.auth.pass, pass);
  assert.equal(config.transport.disableFileAccess, true); assert.equal(config.transport.disableUrlAccess, true);
  f.env.SMTP_PORT = "25"; assert.throws(() => mail.smtpConfiguration());
});

function contactForm() {
  const data = new FormData();
  for (const [key, value] of Object.entries({ fullName: '<b>Visitor</b>', countryCode: "+91", whatsappNumber: "1234567890", email: "visitor@example.org", message: '<a href="https://evil.example">payload</a>' })) data.set(key, value);
  data.append("fabrics", "<img src=x>"); return data;
}
test("S06/S07: real contact action escapes both email templates, suppresses duplicates and respects the honeypot", async () => {
  const sent = []; let recorded = 0;
  const f = fixture({ env: { EMAIL_USER: "sender@example.org", EMAIL_PASS: randomBytes(16).toString("hex") }, mocks: {
    nodemailer: { createTransport: () => ({ sendMail: async (message) => { sent.push(message); } }) },
    "@/lib/admin/inbox": { recordEnquiry: async () => { recorded++; return true; } },
  } });
  const action = f.load("src/app/actions/enquiry.ts");
  assert.equal((await action.submitEnquiry({}, contactForm())).status, "success");
  assert.equal(sent.length, 2); assert.equal(recorded, 1);
  for (const message of sent) { assert.equal(message.html.includes('<b>Visitor</b>'), false); assert.ok(message.html.includes("&lt;b&gt;Visitor&lt;/b&gt;")); assert.equal(message.html.includes('<a href="https://evil.example">payload'), false); }
  assert.equal((await action.submitEnquiry({}, contactForm())).status, "error"); assert.equal(sent.length, 2);
  const bot = contactForm(); bot.set("website", "bot"); assert.equal((await action.submitEnquiry({}, bot)).status, "success"); assert.equal(recorded, 1);
});

test("S10: new inputs are bounded and existing JSON collections still validate", async () => {
  const f = fixture(); const schemas = f.load("src/lib/admin/schemas.ts");
  assert.equal(schemas.slotPatchSchema.safeParse({ title: "x".repeat(161) }).success, false);
  assert.equal(schemas.blogPatchSchema.safeParse({ content: "x".repeat(100001) }).success, false);
  for (const url of ["//evil.example/a.jpg", "javascript:alert(1)", "/media/../auth.json", "/media/%2e%2e/auth.json"]) assert.equal(schemas.blogPatchSchema.safeParse({ coverImage: url }).success, false);
  const enquiry = f.load("src/lib/enquiry.ts");
  assert.equal(enquiry.enquirySchema.safeParse({ fullName: "a\r\nb", countryCode: "+91", whatsappNumber: "12345" }).success, false);
  for (const [name, schema] of [["images", schemas.imageSchema], ["blogs", schemas.blogSchema], ["slots", schemas.slotSchema], ["enquiries", schemas.enquirySchema]]) {
    const rows = JSON.parse(await fs.readFile(`data/${name}.json`, "utf8"));
    assert.ok(rows.every((row) => schema.safeParse(row).success), `Existing ${name} must remain readable; values suppressed.`);
  }
});

test("S11: actual image decode rejects spoofed MIME/SVG and re-encodes supported media", async () => {
  const f = fixture(); const upload = f.load(modulePath("upload"));
  for (const bytes of [Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"), Buffer.from("<script>payload</script>"), Buffer.from([1])]) {
    await assert.rejects(upload.validateMedia(bytes, "image/png"), (e) => e.status === 415);
  }
  await assert.rejects(upload.validateMedia(Buffer.alloc(4 * 1024 * 1024 + 1), "image/png"), (e) => e.status === 413);
  const sharp = require("sharp");
  const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: "white" } }).png().toBuffer();
  const result = await upload.validateMedia(png, "image/png"); assert.equal((await sharp(result).metadata()).format, "png");
  await assert.rejects(upload.validateMedia(png, "image/jpeg"), (e) => e.status === 415);
  await assert.rejects(upload.validateMedia(Buffer.from("not a movie"), "video/mp4"), (e) => e.status === 415);
});

test("S14: production cannot use local writable JSON as a fallback", () => {
  const f = createLoader({ env: { NODE_ENV: "production" } });
  assert.throws(() => f.load("src/lib/admin/storage/index.ts").storage(), (e) => e.status === 503);
});

test("S18: local first creation and updates are conditional across independent processes", async (t) => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "dji-security-test-"));
  t.after(async () => { assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep)); await fs.rm(temp, { recursive: true, force: true }); });
  const a = createLoader({ cwd: temp }).load("src/lib/admin/storage/fs-driver.ts").fileSystemDriver;
  const b = createLoader({ cwd: temp }).load("src/lib/admin/storage/fs-driver.ts").fileSystemDriver;
  const result = await Promise.allSettled([a.writeDoc("security/admin.json", "one", null), b.writeDoc("security/admin.json", "two", null)]);
  assert.equal(result.filter((r) => r.status === "fulfilled").length, 1);
  const before = await a.readDoc("security/admin.json"); await b.writeDoc("security/admin.json", "updated", before.version);
  await assert.rejects(a.writeDoc("security/admin.json", "stale", before.version));
  assert.equal((await a.readDoc("security/admin.json")).text, "updated");
  await assert.rejects(a.readDoc("security/../../auth.json"));
});

test("S18: Blob creation is non-overwriting and stale ETags become conflicts", async () => {
  let options;
  class BlobError extends Error {} class BlobPreconditionFailedError extends BlobError {} class BlobNotFoundError extends BlobError {}
  const blob = { BlobError, BlobPreconditionFailedError, BlobNotFoundError, get: async () => null,
    put: async (_key, _body, value) => { options = value; }, del: async () => {} };
  const f = createLoader({ mocks: { "@vercel/blob": blob } }); const driver = f.load("src/lib/admin/storage/blob-driver.ts").blobDriver;
  await driver.writeDoc("security/admin.json", "{}", null); assert.equal(options.allowOverwrite, false); assert.equal(options.ifMatch, undefined);
  await driver.writeDoc("security/admin.json", "{}", "etag"); assert.equal(options.ifMatch, "etag");
  blob.put = async () => { throw new BlobPreconditionFailedError(); };
  await assert.rejects(driver.writeDoc("security/admin.json", "{}", "old"), (e) => e.name === "VersionConflict");
});

test("S09/S15/S16/S17: production CSP, sanitized errors, hidden diagnostics and disabled checklist", () => {
  const f = fixture({ env: { NODE_ENV: "production", NEXT_PUBLIC_SHOW_TODO: "true", EMAIL_USER: "sender@example.org", EMAIL_PASS: randomBytes(16).toString("hex") } });
  const headers = f.load(modulePath("headers")); const csp = headers.contentSecurityPolicy("testnonce", false, true);
  assert.match(csp, /nonce-testnonce/); assert.match(csp, /strict-dynamic/); assert.match(csp, /frame-ancestors 'none'/);
  assert.equal(csp.includes("unsafe-eval"), false); assert.equal(csp.split(";").find((s) => s.trim().startsWith("script-src")).includes("unsafe-inline"), false);
  assert.equal(f.load("src/lib/env.ts").showTodo, false);
  const checks = f.load("src/lib/admin/health.ts").mailChecks(); const serialized = JSON.stringify(checks);
  assert.equal(serialized.includes(f.env.EMAIL_USER), false); assert.equal(serialized.includes(f.env.EMAIL_PASS), false); assert.equal(serialized.includes("characters"), false);
});

test("S15: production API failures never serialize exception paths, stack traces or provider context", async () => {
  const f = fixture(); const api = f.load("src/lib/admin/api.ts");
  const marker = randomBytes(24).toString("hex");
  const response = api.handleError("test", new Error(`C:/internal/path ${marker}`)); const body = await response.text();
  assert.equal(response.status, 500); assert.equal(body.includes(marker), false); assert.equal(body.includes("internal/path"), false); assert.match(body, /Reference/);
});

test("S06: inbox capacity never deletes existing customer records", async () => {
  const rows = Array.from({ length: 5000 }, (_, i) => ({ id: String(i) })); let wrote = false;
  const f = fixture({ mocks: { "./store": { newId: () => "new", nowIso: () => new Date().toISOString(), mutate: async (_name, update) => { const next = update(rows); wrote = true; return next.result; } } } });
  const inbox = f.load("src/lib/admin/inbox.ts");
  assert.equal(await inbox.recordEnquiry({ fullName: "Visitor", email: "", countryCode: "+91", whatsappNumber: "12345", fabrics: [], usage: [], message: "", variant: "full" }), false);
  assert.equal(wrote, false); assert.equal(rows.length, 5000);
});

test("S03: scoped glob replacement supports the Next ESLint plugin's directory API", () => {
  const { getRootDirs } = require("@next/eslint-plugin-next/dist/utils/get-root-dirs");
  const context = { cwd: process.cwd(), settings: { next: { rootDir: "src/{app,lib}" } } };
  const result = getRootDirs(context).map((value) => value.replaceAll("\\", "/")).sort();
  assert.deepEqual(result, ["src/app", "src/lib"]);
});

test("S12: legacy customer and credential files remain byte-for-byte intact pending approval", async () => {
  const { execFileSync } = require("node:child_process");
  for (const name of ["data/auth.json", "data/enquiries.json"]) {
    const original = execFileSync("git", ["show", `HEAD:${name}`]);
    assert.equal(Buffer.compare(original, await fs.readFile(name)), 0, "Existing private data must be preserved; contents suppressed.");
  }
});

test("S18/S10: first-use collection races retain both writers and invalid writes leave data untouched", async () => {
  const f = fixture({ mocks: { "src/lib/admin/seed.ts": { slotSeed: () => [], blogSeed: () => [], imageSeed: () => [], enquirySeed: () => [] } } });
  const a = f.load("src/lib/admin/store.ts"); const b = f.another().load("src/lib/admin/store.ts");
  const make = (id) => ({ id, src: "/images/test.jpg", updatedAt: new Date().toISOString() });
  await Promise.all([a.mutate("slots", (rows) => ({ rows: [...rows, make("a")], result: null })), b.mutate("slots", (rows) => ({ rows: [...rows, make("b")], result: null }))]);
  assert.deepEqual(Array.from((await a.readCollection("slots")).map((row) => row.id)).sort(), ["a", "b"]);
  const original = f.io.docs.get("collections/slots.json").text;
  await assert.rejects(a.mutate("slots", (rows) => ({ rows: [...rows, { ...make("invalid"), title: "x".repeat(161) }], result: null })));
  assert.equal(f.io.docs.get("collections/slots.json").text, original);
});

test("S11: media names reject encoded traversal, alternate streams and invalid separators", () => {
  const f = fixture(); const driver = f.load("src/lib/admin/storage/fs-driver.ts");
  for (const name of ["../auth.json", "..", "file:stream", "a/b", "a\\b", "%2e%2e", "x\0.png"]) assert.equal(driver.safeMediaPath(name), null);
});
