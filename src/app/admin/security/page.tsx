import { MfaSettings } from "@/components/admin/MfaSettings";
import { readAuth, requireAdminPage } from "@/lib/security/session";

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  await requireAdminPage();
  const auth = await readAuth();
  return <MfaSettings enabled={Boolean(auth.mfa)} recoveryCount={auth.mfa?.recoveryHashes.length ?? 0} />;
}
