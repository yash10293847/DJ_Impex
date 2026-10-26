import { MfaSettings } from "@/components/admin/MfaSettings";
import { requireAdminPageAuth } from "@/lib/security/session";

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const auth = await requireAdminPageAuth();
  return <MfaSettings enabled={Boolean(auth.mfa)} recoveryCount={auth.mfa?.recoveryHashes.length ?? 0} />;
}
