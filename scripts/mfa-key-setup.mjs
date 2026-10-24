import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";

// Never rotate an existing key automatically: enrolled authenticators depend on it.
await mkdir(".security", { recursive: true });
await writeFile(".security/mfa-key.env", `MFA_ENCRYPTION_KEY=${randomBytes(32).toString("hex")}\n`, { flag: "wx", mode: 0o600 });
console.log("Created ignored .security/mfa-key.env. Back it up privately and configure the key in the intended environment. No key value was printed.");
