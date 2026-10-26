"use client";

import { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";

/** Appears immediately while the server/proxy is resolving a clicked link. */
export function AdminNavigationHint() {
  const { pending } = useLinkStatus();
  return (
    <span role="status" className={`ml-auto inline-flex size-4 shrink-0 ${pending ? "opacity-100" : "opacity-0"}`}>
      <LoaderCircle size={16} aria-hidden="true" className="motion-safe:animate-spin" />
      <span className="sr-only">{pending ? "Loading section…" : ""}</span>
    </span>
  );
}
