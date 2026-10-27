"use client";

import { useEffect } from "react";
import { ErrorScreen } from "@/components/ui/ErrorScreen";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error({ event: "public_page_render_failed", reference: error.digest });
  }, [error]);
  return <ErrorScreen retry={reset} reference={error.digest} />;
}
