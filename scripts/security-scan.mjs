import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";

const secrets = new Set();
for (const name of readdirSync(".").filter((n) => n.startsWith(".env") && n !== ".env.example")) {
  if (!statSync(name).isFile()) continue;
  for (const line of readFileSync(name, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);
    if (!match || !/PASS|TOKEN|SECRET|API_KEY|ENCRYPTION_KEY/.test(match[1]) || match[1].startsWith("NEXT_PUBLIC_")) continue;
    const value = match[2].trim().replace(/^['"]|['"]$/g, "");
    if (value.length >= 8) secrets.add(value);
  }
}
for (const [key, value] of Object.entries(process.env)) {
  if (/PASS|TOKEN|SECRET|API_KEY|ENCRYPTION_KEY/.test(key) && !key.startsWith("NEXT_PUBLIC_") && value?.length >= 8) secrets.add(value);
}
let failures = 0;
function check(name) {
  const bytes = readFileSync(name);
  const text = bytes.toString("utf8");
  if ([...secrets].some((value) => bytes.includes(Buffer.from(value))) ||
      /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text) ||
      /(?:AKIA[A-Z0-9]{16}|gh[pousr]_[a-zA-Z0-9]{30,}|sk_live_[a-zA-Z0-9]{20,})/.test(text)) {
    console.error(`Sensitive material detected in ${name}; values suppressed.`); failures++;
  }
}
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
// Include new source/test files before staging so a passing scan covers the
// complete proposed change, while respecting ignored private runtime files.
const candidates = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
for (const name of candidates) {
  if (/^\.env(?:\.|$)/.test(name) && name !== ".env.example") { console.error("An environment file is tracked; values suppressed."); failures++; }
  if (existsSync(name) && statSync(name).isFile()) check(name);
}
function walk(directory) {
  if (!existsSync(directory)) return;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const name = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(name); else if (entry.isFile()) check(name);
  }
}
walk("public"); walk(".next/static");
const staged = execFileSync("git", ["diff", "--cached", "--name-only", "-z"], { encoding: "utf8" }).split("\0");
if (staged.some((name) => /^(data\/(auth|enquiries)\.json|\.security\/)/.test(name))) {
  console.error("Private runtime data is staged. Review and unstage it before committing; no files were removed."); failures++;
}
// These legacy tracked files remain an explicit manual remediation item.
if (tracked.includes("data/auth.json") || tracked.includes("data/enquiries.json")) console.warn("Manual review pending: legacy authentication/enquiry files remain tracked (S12).");
if (failures) process.exitCode = 1;
else console.log("Secret scan passed for tracked and new non-ignored files, public assets and available browser bundles. No secret values printed.");
