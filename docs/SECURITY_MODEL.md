# Security Model — v0.1

## Boundary
Stage Presence OS is an internal business application. Authentication alone must not grant company-data access.

## Authorization
`public.app_members` is the explicit allowlist and carries one role: ADMIN, COMMERCIAL, OPERATIONS, or VIEWER. The frontend never makes authorization decisions based on `user_metadata`; RLS is final authority.

## RLS
Every application table in `public` has RLS enabled. Policies require `private.is_app_member()` for shared business data. The helper is a `SECURITY DEFINER` function in a non-exposed `private` schema, has an explicit `auth.uid()` check, fully qualified references, and PUBLIC execute privilege revoked.

## API grants
Grants are explicit. Authenticated users do not receive DELETE grants on core business records. Archive semantics are used instead.

## History
`events` is append-oriented. Authenticated clients can SELECT and INSERT but not UPDATE or DELETE.

## Keys
The browser receives only the project URL and Supabase publishable key. Never commit or expose service-role keys, secret API keys, or database passwords.

## Account provisioning
The app has a login screen, not self-service signup. Creating an auth user does not automatically create an `app_members` row. Membership must be deliberately granted.
