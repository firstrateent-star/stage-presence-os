# Security Model — v0.1

## Boundary
Stage Presence OS is an internal business application. Authentication alone must not grant company-data access.

## Authorization
`public.app_members` is the explicit allowlist and carries one role: ADMIN, COMMERCIAL, OPERATIONS, or VIEWER. The frontend never makes authorization decisions based on `user_metadata`; RLS is final authority.

The frontend performs an explicit post-login membership check before loading Shared Reality data. An authenticated account without an active `app_members` row receives an access-not-enabled state rather than the application shell.

## RLS
Every application table in `public` has RLS enabled. Policies require `private.is_app_member()` for shared business data. The helper is a `SECURITY DEFINER` function in a non-exposed `private` schema, has an explicit `auth.uid()` check, fully qualified references, and PUBLIC execute privilege revoked.

## Verification — 2026-09-08
The authorization boundary was tested directly under simulated `authenticated` Postgres/JWT contexts:
- first active ADMIN member: 67/67 provisional resources visible
- simulated authenticated non-member: 0 memberships visible, 0 resources visible

This confirms that login alone does not expose Stage Presence business data. Browser/runtime verification is still required after the first Cloudflare deployment.

## API grants
Grants are explicit. Authenticated users do not receive DELETE grants on core business records. Archive semantics are used instead.

## History
`events` is append-oriented. Authenticated clients can SELECT and INSERT but not UPDATE or DELETE. Shared Reality mutations are increasingly logged at the database boundary so event history does not depend on a second browser write succeeding.

## Keys
The browser receives only the project URL and Supabase publishable key. Never commit or expose service-role keys, secret API keys, or database passwords.

## Account provisioning
The app has a login screen, not self-service signup. Creating an auth user does not automatically create an `app_members` row. Membership must be deliberately granted.

The first real internal account has now been bootstrapped as active `ADMIN`. Additional users should not be added until their actual Stage Presence role and need for access are explicit.
