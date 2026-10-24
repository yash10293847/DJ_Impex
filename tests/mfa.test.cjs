const { test } = require("node:test");
const assert = require("node:assert/strict");
const { randomBytes, scryptSync } = require("node:crypto");
const { createLoader } = require("./load-typescript.cjs");

function fixture() {
  const password = randomBytes(20).toString("hex");
  const salt = randomBytes(16).toString("hex");
  const hash = `scrypt-v1:${salt}:${scryptSync(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }).toString("hex")}`;
  const docs = new Map(),
    jar = new Map(),
    options = [],
    events = [];
  let revision = 0;
  let requestHeaders = new Headers({ origin: "https://audit.example", "sec-fetch-site": "same-origin" });
  class VersionConflict extends Error {}
  const io = {
    VersionConflict,
    storage: () => ({
      async readDoc(key) {
        const value = docs.get(key);
        await new Promise((resolve) => setTimeout(resolve, 1));
        return value ? { ...value } : null;
      },
      async writeDoc(key, text, expected) {
        if ((docs.get(key)?.version ?? null) !== expected) throw new VersionConflict();
        docs.set(key, { text, version: String(++revision) });
      },
    }),
  };
  const env = {
    NODE_ENV: "production",
    ADMIN_EMAIL: "admin@example.org",
    ADMIN_PASSWORD_HASH: hash,
    APP_ORIGIN: "https://audit.example",
    SECURITY_SECRET: randomBytes(32).toString("hex"),
    MFA_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  };
  const cookies = {
    get: (key) => (jar.has(key) ? { value: jar.get(key) } : undefined),
    set: (key, value, attributes) => {
      jar.set(key, value);
      options.push({ key, ...attributes });
    },
    delete: (key) => jar.delete(key),
  };
  const mocks = {
    "@/lib/admin/storage": io,
    "src/lib/admin/storage/index.ts": io,
    "next/headers": { cookies: async () => cookies, headers: async () => requestHeaders },
    "next/navigation": {
      redirect: (destination) => {
        const error = new Error("redirect");
        error.destination = destination;
        throw error;
      },
    },
    "src/lib/security/errors.ts": {
      SecurityError: class extends Error {
        constructor(status, message) {
          super(message);
          this.status = status;
        }
      },
      securityEvent: (event) => events.push(event),
    },
  };
  function instance() {
    return createLoader({ env, mocks });
  }
  const loader = instance();
  const session = loader.load("src/lib/security/session.ts");
  const crypto = loader.load("src/lib/security/mfa-crypto.ts");
  const actions = loader.load("src/app/actions/admin-mfa.ts");
  const login = loader.load("src/app/actions/admin-auth.ts");
  const form = (data) => {
    const result = new FormData();
    for (const [key, value] of Object.entries(data)) result.set(key, value);
    return result;
  };
  const read = () => JSON.parse(docs.get("security/admin.json").text);
  const change = (fn) => {
    const doc = read();
    fn(doc);
    docs.set("security/admin.json", { text: JSON.stringify(doc), version: String(++revision) });
  };
  async function enroll() {
    await session.createSession(hash, false);
    const oldToken = jar.get(session.sessionCookieName());
    const result = await actions.beginMfaEnrollmentAction({}, form({ password }));
    assert.ok(result.setup, result.error);
    const code = crypto.authenticator(result.setup.manualKey).generate();
    await assert.rejects(
      actions.confirmMfaEnrollmentAction({}, form({ code, savedRecoveryCodes: "on" })),
      (error) => error.destination === "/admin/security?mfa=enabled",
    );
    return { ...result.setup, oldToken, code };
  }
  async function challenge() {
    jar.delete(session.sessionCookieName());
    const result = await login.loginAdminAction(
      {},
      form({ email: env.ADMIN_EMAIL, password, remember: "on" }),
    );
    assert.equal(result.needsMfa, true, result.error);
    return jar.get(session.challengeCookieName());
  }
  return {
    password,
    hash,
    env,
    jar,
    docs,
    session,
    crypto,
    actions,
    login,
    form,
    read,
    change,
    options,
    events,
    instance,
    enroll,
    challenge,
    setHeaders: (value) => {
      requestHeaders = new Headers(value);
    },
  };
}

test("MFA: RFC TOTP vectors, exact input lengths, encryption authentication and replay steps", () => {
  const key = randomBytes(32).toString("hex");
  const f = createLoader({ env: { MFA_ENCRYPTION_KEY: key } });
  const mfa = f.load("src/lib/security/mfa-crypto.ts");
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
  // RFC 6238 SHA-1 vectors truncated to six digits.
  for (const [seconds, code] of [
    [59, "287082"],
    [1111111109, "081804"],
    [1111111111, "050471"],
    [1234567890, "005924"],
    [2000000000, "279037"],
    [20000000000, "353130"],
  ]) {
    const step = mfa.validTotpStep(secret, code, -1, seconds * 1000);
    assert.equal(step, Math.floor(seconds / 30));
    assert.equal(mfa.validTotpStep(secret, code, step, seconds * 1000), null);
  }
  for (const code of ["1", "1234567", "１２３４５６", "123 456"])
    assert.equal(mfa.validTotpStep(secret, code, -1, 59000), null);
  const sealed = mfa.sealMfaSecret(secret);
  assert.equal(sealed.includes(secret), false);
  assert.equal(mfa.openMfaSecret(sealed), secret);
  const parts = sealed.split(":");
  parts[2] = (parts[2][0] === "0" ? "1" : "0") + parts[2].slice(1);
  assert.throws(() => mfa.openMfaSecret(parts.join(":")));
  f.env.MFA_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  assert.throws(() => mfa.openMfaSecret(sealed));
  f.env.MFA_ENCRYPTION_KEY = "";
  assert.throws(() => mfa.sealMfaSecret(secret));
});

test("MFA: enrollment requires session, origin, password, saved codes, matching browser and unexpired setup", async () => {
  const f = fixture();
  assert.match(
    (await f.actions.beginMfaEnrollmentAction({}, f.form({ password: f.password }))).error,
    /sign in/i,
  );
  await f.session.createSession(f.hash, false);
  f.setHeaders({ origin: "https://attacker.example" });
  assert.match(
    (await f.actions.beginMfaEnrollmentAction({}, f.form({ password: f.password }))).error,
    /not allowed/i,
  );
  f.setHeaders({ origin: "https://audit.example", "sec-fetch-site": "same-origin" });
  assert.match(
    (await f.actions.beginMfaEnrollmentAction({}, f.form({ password: "wrong" }))).error,
    /incorrect/i,
  );
  const setup = (await f.actions.beginMfaEnrollmentAction({}, f.form({ password: f.password }))).setup;
  assert.ok(setup.qrCode.startsWith("data:image/png;base64,"));
  assert.equal(setup.recoveryCodes.length, 10);
  const stored = f.docs.get("security/admin.json").text;
  assert.equal(stored.includes(setup.manualKey), false);
  for (const code of setup.recoveryCodes) assert.equal(stored.includes(code), false);
  const code = f.crypto.authenticator(setup.manualKey).generate();
  assert.match(
    (await f.actions.confirmMfaEnrollmentAction({}, f.form({ code }))).error,
    /Save your recovery/i,
  );
  const firstToken = f.jar.get(f.session.sessionCookieName());
  await f.session.createSession(f.hash, false);
  assert.match(
    (await f.actions.confirmMfaEnrollmentAction({}, f.form({ code, savedRecoveryCodes: "on" }))).error,
    /expired/i,
  );
  f.jar.set(f.session.sessionCookieName(), firstToken);
  f.change((auth) => {
    auth.pendingMfa.expires = Date.now() - 1;
  });
  assert.match(
    (await f.actions.confirmMfaEnrollmentAction({}, f.form({ code, savedRecoveryCodes: "on" }))).error,
    /expired/i,
  );
  assert.equal(f.read().mfa, undefined);
});

test("MFA: successful enrollment revokes old sessions; password alone and challenge cookies cannot authenticate", async () => {
  const f = fixture();
  const setup = await f.enroll();
  assert.ok(await f.session.currentSession());
  assert.equal(await f.session.verifySessionToken(setup.oldToken), null);
  await assert.rejects(f.session.createSession(f.hash, false), /verification is required/i);
  const challenge = await f.challenge();
  assert.match(challenge, /^[a-f0-9]{64}$/);
  assert.equal(await f.session.currentSession(), null);
  assert.equal(await f.session.verifySessionToken(challenge), null);
  assert.equal(f.jar.has(f.session.sessionCookieName()), false);
  const attributes = f.options.find((value) => value.key === f.session.challengeCookieName());
  assert.equal(attributes.httpOnly, true);
  assert.equal(attributes.secure, true);
  assert.equal(attributes.maxAge, 300);
  assert.equal(f.docs.get("security/admin.json").text.includes(challenge), false);
  assert.equal(await f.instance().load("src/lib/security/session.ts").verifySessionToken(challenge), null);
  await assert.rejects(f.session.requireAdmin(), /sign in/i);
});

test("MFA: real two-step login verifies a fresh TOTP, creates remembered session and prevents challenge/code replay", async () => {
  const f = fixture();
  const setup = await f.enroll();
  const challenge = await f.challenge();
  // Advance only the prior-used counter so a real current code can be tested without waiting.
  f.change((auth) => {
    auth.mfa.lastStep = -1;
  });
  const code = f.crypto.authenticator(setup.manualKey).generate();
  await assert.rejects(
    f.login.loginAdminAction({}, f.form({ step: "mfa", code })),
    (error) => error.destination === "/admin/images",
  );
  assert.ok(await f.session.currentSession());
  assert.equal(f.options.at(-1).maxAge, 30 * 86400);
  f.jar.set(f.session.challengeCookieName(), challenge);
  await assert.rejects(f.session.finishMfaChallenge(code), /expired/i);
  await f.challenge();
  await assert.rejects(f.session.finishMfaChallenge(code), /already used/i);
  assert.equal(f.read().challenges.at(-1).attempts, 1);
});

test("MFA: independent instances atomically consume TOTP and recovery codes once", async () => {
  const f = fixture(),
    setup = await f.enroll();
  await f.challenge();
  f.change((auth) => {
    auth.mfa.lastStep = -1;
  });
  const code = f.crypto.authenticator(setup.manualKey).generate();
  const other = f.instance().load("src/lib/security/session.ts");
  const results = await Promise.allSettled([
    f.session.finishMfaChallenge(code),
    other.finishMfaChallenge(code),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  await f.challenge();
  const recovery = setup.recoveryCodes[0];
  const recoveryResults = await Promise.allSettled([
    f.session.finishMfaChallenge(recovery),
    other.finishMfaChallenge(recovery),
  ]);
  assert.equal(recoveryResults.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(f.read().mfa.recoveryHashes.length, 9);
  await f.challenge();
  await assert.rejects(f.session.finishMfaChallenge(recovery), /already used/i);
});

test("MFA: expired, over-attempted and password-stale challenges fail closed", async () => {
  const f = fixture(),
    setup = await f.enroll();
  await f.challenge();
  f.change((auth) => {
    auth.challenges.at(-1).expires = Date.now() - 1;
  });
  await assert.rejects(f.session.finishMfaChallenge(setup.recoveryCodes[0]), /expired/i);
  await f.challenge();
  for (let i = 0; i < 5; i++) await assert.rejects(f.session.finishMfaChallenge("invalid"), /Invalid/i);
  await assert.rejects(f.session.finishMfaChallenge(setup.recoveryCodes[0]), /expired/i);
  await f.challenge();
  f.change((auth) => {
    auth.challenges.at(-1).passwordHash = auth.passwordHash.replace(
      /^scrypt-v1:[a-f0-9]{32}:/,
      `scrypt-v1:${randomBytes(16).toString("hex")}:`,
    );
  });
  await assert.rejects(f.session.finishMfaChallenge(setup.recoveryCodes[0]), /expired/i);
});

test("MFA: recovery regeneration and disabling require both factors, revoke sessions and preserve password", async () => {
  const f = fixture(),
    setup = await f.enroll();
  const oldSession = randomBytes(32).toString("hex");
  f.change((auth) => {
    auth.sessions.push(f.session.newSessionRecord(oldSession, false, auth.mfa.version));
  });
  assert.match(
    (
      await f.actions.manageMfaAction(
        {},
        f.form({ operation: "recovery", password: "wrong", code: setup.recoveryCodes[0] }),
      )
    ).error,
    /incorrect/i,
  );
  assert.match(
    (await f.actions.manageMfaAction({}, f.form({ operation: "disable", password: f.password, code: "bad" })))
      .error,
    /fresh authenticator/i,
  );
  const result = await f.actions.manageMfaAction(
    {},
    f.form({ operation: "recovery", password: f.password, code: setup.recoveryCodes[0] }),
  );
  assert.equal(result.enabled, true, result.error);
  assert.equal(result.recoveryCodes.length, 10);
  assert.equal(await f.session.verifySessionToken(oldSession), null);
  await f.challenge();
  await assert.rejects(f.session.finishMfaChallenge(setup.recoveryCodes[1]), /already used/i);
  await f.session.finishMfaChallenge(result.recoveryCodes[0]);
  await assert.rejects(
    f.actions.manageMfaAction(
      {},
      f.form({ operation: "disable", password: f.password, code: result.recoveryCodes[1] }),
    ),
    (error) => error.destination === "/admin/security?mfa=disabled",
  );
  assert.equal(f.read().mfa, undefined);
  assert.equal(f.read().passwordHash, f.hash);
  assert.ok(await f.session.currentSession());
});

test("MFA: password change cannot remove MFA, uses a fresh factor and invalidates challenges and sessions", async () => {
  const f = fixture(),
    setup = await f.enroll();
  const active = await f.session.requireAdmin();
  const oldSession = f.jar.get(f.session.sessionCookieName());
  const nextHash = await f
    .instance()
    .load("src/lib/security/password.ts")
    .hashPassword(randomBytes(20).toString("hex"));
  await assert.rejects(f.session.replacePassword(f.hash, nextHash, active.tokenHash), /fresh authenticator/i);
  await f.session.replacePassword(f.hash, nextHash, active.tokenHash, setup.recoveryCodes[0]);
  assert.equal(f.read().passwordHash, nextHash);
  assert.ok(f.read().mfa);
  assert.equal(f.read().mfa.recoveryHashes.length, 9);
  assert.equal(await f.session.verifySessionToken(oldSession), null);
  assert.ok(await f.session.currentSession());
  assert.equal(f.read().pendingMfa, undefined);
  assert.equal((f.read().challenges ?? []).length, 0);
});

test("MFA: recovery remains usable if the encryption key is unavailable; missing enrollment key never enables MFA", async () => {
  const f = fixture(),
    setup = await f.enroll();
  const other = f.instance();
  other.env.MFA_ENCRYPTION_KEY = "";
  await f.challenge();
  await other.load("src/lib/security/session.ts").finishMfaChallenge(setup.recoveryCodes[0]);
  assert.ok(await f.session.currentSession());
  const notEnrolled = fixture();
  await notEnrolled.session.createSession(notEnrolled.hash, false);
  // Use a new module context with an absent key.
  const noKey = notEnrolled.instance();
  noKey.env.MFA_ENCRYPTION_KEY = "";
  const result = await noKey
    .load("src/app/actions/admin-mfa.ts")
    .beginMfaEnrollmentAction({}, notEnrolled.form({ password: notEnrolled.password }));
  assert.ok(result.error);
  assert.equal(notEnrolled.read().pendingMfa, undefined);
});
