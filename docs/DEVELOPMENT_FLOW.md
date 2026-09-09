# Development Flow

Stage Presence OS production is deployed by Cloudflare from `main`.

## Rule

Substantial multi-file Flowers should not be assembled as dependent intermediate commits directly on `main`.

Preferred flow:

1. branch from current clean `main`;
2. make the complete logical change on the branch;
3. run the repository build check;
4. review the change as one coherent deployment boundary;
5. promote the branch to `main` only after the build is green;
6. Cloudflare then builds the coherent `main` state.

Small isolated fixes may still go directly to `main` when their build impact is obvious and bounded.

## Why

On 2026-09-09, several Cloudflare builds failed because TypeScript saw intermediate states while related model/UI/demo updates were still being committed sequentially. The eventual `1237490…` commit built successfully and production displayed the new Decision Flow correctly.

Failed builds are retained as useful engineering history. The goal is not a cosmetically perfect deployment list; the goal is to stop avoidable half-state production builds.

## Build check

`.github/workflows/build-check.yml` runs the same core application build contract:

`npm run build`

which executes:

`tsc -b && vite build`

The build check does not deploy and has no Supabase mutation authority.
