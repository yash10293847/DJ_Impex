import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("../scripts/security-setup.mjs", import.meta.url));

function fixture(t) {
  const cwd = mkdtempSync(path.join(tmpdir(), "dji-setup-test-"));
  assert.equal(path.dirname(cwd), path.resolve(tmpdir()));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  return {
    target: path.join(cwd, ".security/bootstrap.env"),
    run: (input) => spawnSync(process.execPath, [script, "--windows-input"], {
      cwd, input, encoding: "utf8", windowsHide: true,
    }),
  };
}

test("setup preserves Unicode password bytes, prints no secrets and refuses overwrite", (t) => {
  const f = fixture(t);
  const password = `Synthetic-${randomBytes(12).toString("hex")}-é-雪`;
  const input = JSON.stringify({ password, confirmation: password });
  const first = f.run(input);
  assert.equal(first.status, 0);
  const saved = readFileSync(f.target, "utf8");
  assert.equal(saved.includes(password), false);
  const [, salt, digest] = /^ADMIN_PASSWORD_HASH=scrypt-v1:([a-f0-9]{32}):([a-f0-9]{128})$/m.exec(saved);
  assert.equal(scryptSync(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }).toString("hex"), digest);
  assert.match(saved, /^SECURITY_SECRET=[a-f0-9]{64}$/m);
  const second = f.run(input);
  assert.notEqual(second.status, 0);
  assert.equal(readFileSync(f.target, "utf8"), saved);
  const output = first.stdout + first.stderr + second.stdout + second.stderr;
  for (const secret of [password, salt, digest, saved.split("SECURITY_SECRET=")[1].trim()]) {
    assert.equal(output.includes(secret), false, "Setup output must not expose secret values");
  }
});

test("setup rejects malformed, oversized, short and mismatched input without creating credentials", (t) => {
  const f = fixture(t);
  for (const input of ["{", "x".repeat(8193), "null", "{}",
    JSON.stringify({ password: "short", confirmation: "short" }),
    JSON.stringify({ password: "x".repeat(257), confirmation: "x".repeat(257) }),
    JSON.stringify({ password: "synthetic-password", confirmation: "different-password" }),
  ]) {
    assert.notEqual(f.run(input).status, 0);
    assert.equal(existsSync(f.target), false);
  }
});
