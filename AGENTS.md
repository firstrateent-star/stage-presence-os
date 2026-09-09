# Agent Instructions — Stage Presence OS

Before modifying architecture or implementation, read:
- `/docs/BUSINESS_MODEL_CURRENT.md`
- `/docs/CURRENT_STATE.md`
- `/docs/CHAT_OPERATING_WORKFLOW.md`
- `/docs/CONSTITUTION.md`
- `/docs/SYSTEM_MAP.md`
- `/docs/DATA_MODEL.md`
- `/docs/ROADMAP.md`

## Current operating mode
Stage Presence OS is in **Operational Validation / Active Continuity** by default.

ChatGPT currently acts as the flexible interpretation/operating-desk layer. The user may provide photos, screenshots, pasted messages, conversations, call recaps, quote/payment/job updates, or freeform notes. Do not require database-ready formatting. Follow `/docs/CHAT_OPERATING_WORKFLOW.md` to interpret the source, match/create the correct canonical Engagement, update only supported truth, preserve uncertainty, and ask only material questions.

The default is **operate and learn, not keep building**. Do not reopen schema/frontend development just because a possible field or feature is noticed. Real recurring decision/re-entry/representation friction must earn development, or the user must explicitly choose to resume building.

## Rules
- Preserve one canonical Engagement across the business lifecycle.
- Goodshuffle/QuickBooks/legacy systems are evidence sources, not future architecture.
- History informs; active inherited work gets only enough truth to move; new work should be born correctly.
- Do not silently introduce separate Lead/Quote/Job realities.
- Do not fake certainty, availability, pricing authority, AI output, payment, deposit, or integrations.
- Customer request is not automatically technical requirement.
- Configured is not automatically owned, available, held, or reserved.
- Signed is not automatically deposit-received or capacity-reserved.
- Preserve provenance and uncertainty.
- Keep routine continuity in the system and human judgment at important exceptions.
- Do not activate dormant modules without evidence or an explicit decision.
- Do not make Sean/Greg perform repetitive synthetic QA when automated/rollback proof is possible.
- If development is earned, use branch -> build check -> PR -> `main` -> Cloudflare; avoid dependent half-finished commits directly to `main`.
- Update `docs/CURRENT_STATE.md` after meaningful implementation changes.
- Record material architectural choices in `docs/DECISIONS.md`.
- Keep `docs/VALUE_LEDGER.md` evidence-based; never claim value before measurement.
- Keep the app private/internal unless explicitly authorized otherwise.
- Do not touch unrelated projects, especially NFL DFS infrastructure.

## Resume behavior
If this work is resumed in a fresh chat, do not ask the user to reconstruct the project. Read the canonical repo/docs above, inspect current Stage Presence OS state as needed, and continue the chat-first operating workflow.
