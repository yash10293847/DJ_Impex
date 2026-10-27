import "server-only";

export class SecurityError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "SecurityError";
  }
}

/** Never serialize provider errors, credentials, request bodies, or customer data. */
export function securityEvent(event: string, error?: unknown): string {
  const id = crypto.randomUUID();
  const candidate = error && typeof error === "object" && "code" in error ? error.code : undefined;
  const code =
    typeof candidate === "string" &&
    [
      "ENOENT",
      "EACCES",
      "EPERM",
      "ETIMEDOUT",
      "ECONNRESET",
      "ECONNREFUSED",
      "ENOTFOUND",
      "EAUTH",
      "EENVELOPE",
    ].includes(candidate)
      ? candidate
      : undefined;
  console.error(JSON.stringify({ event, id, code }));
  return id;
}
