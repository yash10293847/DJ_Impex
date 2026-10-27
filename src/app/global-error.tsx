"use client";

import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <main>
          <ErrorScreen retry={reset} reference={error.digest} />
        </main>
      </body>
    </html>
  );
}
