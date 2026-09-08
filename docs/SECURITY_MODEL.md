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

The deployed browser login and a real browser Engagement write were subsequently proven with the authorized ADMIN account.

## API grants
Grants are explicit. Authenticated users do not receive DELETE grants on core business records. Archive semantics are used instead.

## History
`events` is append-oriented. Authenticated clients can SELECT and INSERT but not UPDATE or DELETE. Shared Reality mutations are increasingly logged at the database boundary so event history does not depend on a second browser write succeeding.

## Private source evidence storage
Original lead-sheet/source photos use the Supabase Storage bucket `source-artifacts`.

Controls:
- bucket is private (`public = false`);
- maximum object size is 15 MB;
- allowed MIME types are JPEG, PNG, WebP, HEIC and HEIF;
- SELECT is restricted to authenticated users who also pass `private.is_app_member()`;
- INSERT is restricted to authenticated active app members and only when the object's top-level folder equals the uploader's `auth.uid()`;
- browser clients receive no UPDATE or DELETE policy on stored originals;
- uploads use `upsert: false`;
- no public Storage URL is used for source evidence;
- private reads must pass authenticated Storage RLS;
- source metadata is represented separately in `public.source_artifacts` and linked to Engagement history through `SOURCE_ADDED` events.

Original evidence and interpretation are deliberately separate. Future OCR/AI output must not overwrite the original file or silently become verified business truth.

The PHOTO source-artifact -> Engagement -> SOURCE_ADDED relationship has been verified in a rollback-only authenticated test. No fake Storage object was written by that test.

## Keys
The browser receives only the project URL and Supabase publishable key. Never commit or expose service-role keys, secret API keys, database passwords, or privileged Storage credentials.

## Account provisioning
The app has a login screen, not self-service signup. Creating an auth user does not automatically create an `app_members` row. Membership must be deliberately granted.

The first real internal account is active `ADMIN`. Additional users should not be added until their actual Stage Presence role and need for access are explicit.

## Free-plan Auth limitation
The Supabase security advisor currently warns that Leaked Password Protection is disabled. Supabase's current Password Security documentation states that HaveIBeenPwned leaked-password protection is available on the Pro plan and above.

First Breath remains intentionally on the Free plan, so this warning is accepted as a documented plan limitation rather than triggering an unapproved recurring cost. Compensating controls for v0.1:
- every internal account uses a strong, unique password generated/stored by a password manager where possible;
- no self-service signup;
- explicit `app_members` allowlist remains the authorization boundary;
- additional accounts are provisioned deliberately;
- RLS remains final authority for company data;
- paid Auth hardening can be reconsidered when usage/value evidence earns it.

Reference: Supabase Password Security documentation, `Password strength and leaked password protection`.
