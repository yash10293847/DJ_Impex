const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { createLoader } = require("./load-typescript.cjs");

function fixture() {
  const token = "a".repeat(64);
  const hash = createHash("sha256").update(token).digest("hex");
  let reads = 0;
  let cookie = token;
  let requestCache = new Map();
  let auth = {
    passwordHash: `scrypt-v1:${"b".repeat(32)}:${"c".repeat(128)}`,
    sessions: [{ tokenHash: hash, expires: Date.now() + 60000 }],
  };
  const loader = createLoader({ mocks: {
    // Model React's render-scoped dispatcher; a new request drops its cache.
    react: { cache: (fn) => (...args) => {
      if (!requestCache.has(fn)) requestCache.set(fn, fn(...args));
      return requestCache.get(fn);
    } },
    "next/headers": { cookies: async () => ({ get: () => cookie ? { value: cookie } : undefined }) },
    "next/navigation": { redirect: (destination) => { throw Object.assign(new Error("redirect"), { destination }); } },
    "@/lib/admin/storage": { storage: () => ({ readDoc: async () => { reads++; return { text: JSON.stringify(auth) }; } }) },
  } });
  return {
    session: loader.load("src/lib/security/session.ts"),
    reads: () => reads,
    nextRequest: () => { requestCache = new Map(); },
    setSessions: (sessions) => { auth = { ...auth, sessions }; },
    setCookie: (value) => { cookie = value; },
  };
}

test("page guards and security settings share one read within a render", async () => {
  const f = fixture();
  await Promise.all([f.session.requireAdminPage(), f.session.requireAdminPage(), f.session.requireAdminPageAuth()]);
  assert.equal(f.reads(), 1);
  f.nextRequest();
  await f.session.requireAdminPage();
  assert.equal(f.reads(), 2);
});

test("revocation is checked again on the next page request and uncached API checks", async () => {
  const f = fixture();
  await f.session.requireAdminPage();
  f.setSessions([]);
  assert.equal(await f.session.currentSession(), null);
  f.nextRequest();
  await assert.rejects(f.session.requireAdminPage(), (error) => error.destination === "/admin/login");
  assert.equal(f.reads(), 3);
});

test("missing, malformed, expired and unknown sessions never render an admin page", async () => {
  for (const cookie of [undefined, "invalid", "d".repeat(64)]) {
    const f = fixture();
    f.setCookie(cookie);
    await assert.rejects(f.session.requireAdminPageAuth(), (error) => error.destination === "/admin/login");
  }
  const f = fixture();
  f.setSessions([{ tokenHash: createHash("sha256").update("a".repeat(64)).digest("hex"), expires: Date.now() - 1000 }]);
  await assert.rejects(f.session.requireAdminPageAuth(), (error) => error.destination === "/admin/login");
});
