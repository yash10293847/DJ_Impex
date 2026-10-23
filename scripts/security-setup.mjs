import { randomBytes, scryptSync } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Windows uses its native secure console prompt rather than a silent readline
// output stream, which can leave embedded terminals unable to accept input.
if (process.platform === "win32" && !process.argv.includes("--windows-input")) {
  if (!process.stdin.isTTY) throw new Error("Run setup in an interactive terminal.");
  const result = spawnSync(
    path.join(process.env.SystemRoot || "C:\\Windows", "System32/WindowsPowerShell/v1.0/powershell.exe"),
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      fileURLToPath(new URL("./security-setup.ps1", import.meta.url)),
      "-NodeExecutable",
      process.execPath,
    ],
    { stdio: "inherit", windowsHide: true },
  );
  if (result.error) console.error("Could not open the Windows password prompt.");
  process.exit(result.status ?? 1);
}

let password;
let confirmation;
if (process.argv.includes("--windows-input")) {
  if (process.stdin.isTTY) throw new Error("Use npm run security:setup for interactive input.");
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    input += chunk;
    if (Buffer.byteLength(input) > 8192) throw new Error("Password input is too long.");
  }
  try {
    ({ password, confirmation } = JSON.parse(input.replace(/^\uFEFF/, "")));
  } catch {
    throw new Error("Could not read password input. Run setup again.");
  }
} else {
  if (!process.stdin.isTTY) throw new Error("Run setup in an interactive terminal.");
  const silent = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const prompt = createInterface({ input: process.stdin, output: silent, terminal: true });
  try {
    process.stdout.write("New administrator password (12-256 characters; hidden): ");
    password = await prompt.question("");
    process.stdout.write("\nConfirm password (hidden): ");
    confirmation = await prompt.question("");
    process.stdout.write("\n");
  } finally {
    prompt.close();
  }
}

if (
  typeof password !== "string" ||
  typeof confirmation !== "string" ||
  password.length < 12 ||
  password.length > 256 ||
  password !== confirmation
)
  throw new Error("Passwords must match and contain 12-256 characters.");
const salt = randomBytes(16).toString("hex");
const hash = scryptSync(password, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }).toString(
  "hex",
);
await mkdir(".security", { recursive: true });
// Exclusive creation prevents replacing an existing bootstrap/recovery file.
await writeFile(
  ".security/bootstrap.env",
  `ADMIN_PASSWORD_HASH=scrypt-v1:${salt}:${hash}\nSECURITY_SECRET=${randomBytes(32).toString("hex")}\n`,
  { flag: "wx", mode: 0o600 },
);
process.stdout.write(
  "Created ignored .security/bootstrap.env. Values were not printed. Follow SECURITY_SETUP.md; do not commit this file.\n",
);
