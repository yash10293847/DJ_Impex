import "server-only";

export class SecurityError extends Error {
  constructor(public readonly status: number, message: string, public readonly retryAfter?: number) {
    super(message);
    this.name = "SecurityError";
  }
}

/** Never serialize provider errors, credentials, request bodies, or customer data. */
export function securityEvent(event: string): string {
  const id = crypto.randomUUID();
  console.error(JSON.stringify({ event, id }));
  return id;
}
