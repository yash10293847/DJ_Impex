import { randomBytes, scryptSync } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";

if (!process.stdin.isTTY) throw new Error("Run setup in an interactive terminal.");
const silent = new Writable({ write(_chunk, _encoding, callback) { callback(); } });
const prompt = createInterface({ input: process.stdin, output: silent, terminal: true });
try {
  process.stdout.write("New administrator password (12-256 characters; hidden): ");
  const password = await prompt.question("");
  process.stdout.write("\nConfirm password (hidden): ");
  const confirmation = await prompt.question("");
  process.stdout.write("\n");
  if (password.length < 12 || password.length > 256 || password !== confirmation) throw new Error("Passwords must match and contain 12-256 characters.");
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }).toString("hex");
  await mkdir(".security", { recursive: true });
  // Exclusive creation prevents replacing an existing bootstrap/recovery file.
  await writeFile(".security/bootstrap.env", `ADMIN_PASSWORD_HASH=scrypt-v1:${salt}:${hash}\nSECURITY_SECRET=${randomBytes(32).toString("hex")}\n`, { flag: "wx", mode: 0o600 });
  process.stdout.write("Created ignored .security/bootstrap.env. Values were not printed. Follow SECURITY_SETUP.md; do not commit this file.\n");
} finally { prompt.close(); }
