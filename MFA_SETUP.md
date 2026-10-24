# Administrator MFA

This application currently has one administrator identity, configured with `ADMIN_EMAIL`. Authenticator MFA belongs to that identity. Deploying this feature does not enable MFA or enroll an operator's phone automatically.

## Configure the encryption key

Generate a dedicated key with `npm run security:mfa-key`. This exclusively creates the Git-ignored `.security/mfa-key.env` and refuses to overwrite it. Set its `MFA_ENCRYPTION_KEY` privately in the intended Vercel environment, and in `.env.local` for local enrollment. Never use a `NEXT_PUBLIC_` variable. Redeploy after changing environment configuration.

Back up this key privately with the private Blob data. The key encrypts authenticator seeds using AES-256-GCM. Do not replace it during routine deployment. Recovery codes remain usable if the encryption key becomes unavailable, but authenticator codes cannot be verified until the correct key is restored. The key is separate from `SECURITY_SECRET` and the administrator password hash.

Do not connect test or preview instances to production storage. Use separate synthetic credentials, storage, and encryption keys. No production user should enroll through a preview deployment.

## Enroll the client

1. Confirm password-only login works before enrollment. Open **Account security** in the admin sidebar.
2. Re-enter the existing administrator password. The application creates a ten-minute setup bound to that authenticated browser session.
3. Scan the QR code using the client's authenticator app, or enter the private setup key manually. It is a time-based, SHA-1, six-digit code with a 30-second period. The QR code is generated locally by the server, not by an external QR service.
4. Download the ten recovery codes and save them privately in a password manager or another secure location. They are displayed only during setup or regeneration. Each recovery code contains 128 bits of randomness and only its SHA-256 hash is stored.
5. Enter a fresh authenticator code and confirm the recovery codes are saved. Only then is MFA enabled. Old sessions are revoked; the enrolling browser receives a new MFA-authenticated session. An incomplete setup does not change login requirements.

The setup code has already been consumed. Wait for the next code before trying a new sign-in. Each accepted TOTP time step can be used once, including concurrent attempts from separate server instances.

## Sign in and recover

After MFA is enabled, the email/password step creates only a five-minute opaque challenge cookie. It grants no access to admin pages, APIs, or server actions. A valid authenticator or recovery code atomically consumes the challenge, consumes the factor, and creates the real session. Five failed attempts exhaust the challenge; shared IP/global limits also apply across new challenges. Remember-me is applied only after both factors succeed.

If the client loses their phone, choose **Use a recovery code instead** after entering email/password. Then open **Account security**, use a second unused recovery code plus the password to disable MFA, and immediately enroll the replacement authenticator. Disabling or regenerating codes revokes other sessions and outstanding challenges. Generating new recovery codes invalidates all previous codes.

Changing the password while MFA is enabled requires both the current password and a fresh authenticator/recovery code. It preserves MFA, invalidates pending enrollment and login challenges, revokes old sessions, and issues a new session. A password reset must never silently remove MFA.

If both authenticator access and all recovery codes are lost, there is no public MFA-bypass endpoint. Recovery requires a separately authorized operator process with identity verification, a private record backup, and session/challenge revocation. Do not delete the authentication record or merely change the bootstrap hash to bypass enrollment.

## Validation and deployment

Run `npm run test:security`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run security:scan`, and `npm run test:production`.

On Windows, if Turbopack's CSS worker exits before connecting, use `npm run build -- --webpack`. This produces a production build using Next.js's supported Webpack mode. The Google font still requires network access at build time.

Verified on 24 October 2026: all 45 security tests, TypeScript, lint (existing warnings only), the secret scan, and the Webpack production build passed. An isolated browser run with synthetic credentials also passed password login, QR enrollment, recovery-code download, session rotation, denial of admin pages/APIs before the second factor, mobile login layout, authenticator sign-in, and recovery sign-in with single-use code consumption.

The MFA tests use synthetic keys and isolated storage. They cover RFC vectors, encryption integrity, setup authorization/expiry/browser binding, old-session revocation, one-factor and challenge-cookie denial, replay races, challenge expiry/limits, recovery-code regeneration, factor-protected password changes, and recovery without the encryption key. Production HTTP checks verify that security settings and other admin routes reject anonymous requests.

After deployment, let the client perform enrollment themselves. Never enroll a developer's phone on behalf of the client. Verify a fresh two-step sign-in and recovery-code sign-in before considering the client rollout complete. Rollback code must preserve MFA enforcement and the current authentication document schema; rolling back to pre-MFA code after enrollment can remove MFA protections.
