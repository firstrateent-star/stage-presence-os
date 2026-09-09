# Chat-First Operating Workflow

## Purpose
During the current Operational Validation phase, ChatGPT acts as the flexible interpretation and operating-desk layer for Stage Presence while the canonical backend remains Stage Presence OS.

The goal is to run real Stage Presence business activity through the model we have already built before adding more automation.

> **Reality can arrive messily. The backend should stay structured. Humans should not have to translate between the two.**

## Current operating center
**Operational Validation / Active Continuity**

Use real work to test whether Stage Presence OS contains enough trustworthy information to run the business. Do not expand the product merely because a feature is possible.

Governing rule:

> **History informs. Active work gets enough truth to move. New work is born correctly.**

Goodshuffle and other legacy systems are evidence sources, not future architecture.

## Accepted inputs in chat
The user may provide Stage Presence reality in any convenient form, including:
- photo of a Quick Lead Sheet
- photo/screenshot of a note, quote, message, document, or system screen
- pasted email or text message
- copied conversation
- call recap
- voice-transcript text
- quote information
- payment/deposit update
- equipment or sourcing change
- venue/logistics update
- customer change request
- delivery/closeout learning
- freeform statement such as `Greg just talked to...`

Do **not** require the user to format information for the database.

## ChatGPT workflow for each real input
When new Stage Presence information arrives:

1. **Preserve the source meaning**
   - Distinguish what was actually said/shown from interpretation.
   - Preserve literal customer language when material.
   - If the source is a chat-uploaded image, the image itself is not automatically stored in Stage Presence private Storage; preserve a truthful source note/transcription in the backend when appropriate.

2. **Identify the business object**
   - Match to an existing Engagement/Party when supported.
   - Create a new Engagement only when it genuinely represents new business reality.
   - Do not silently merge ambiguous customers or Engagements.

3. **Translate into the canonical model**
   Update only supported truth such as:
   - customer/contact/organization
   - event/project name and type
   - date/time or date-only truth
   - venue/location
   - literal customer request
   - desired outcome when supportable
   - known facts
   - material unknowns/conflicts
   - solution/configured capabilities/resources
   - capacity timing/sourcing when actually known
   - commercial/commitment state
   - payment/deposit evidence
   - real next movement / waiting-on / blocker
   - delivery actuals / learning / recurrence

4. **Keep uncertainty explicit**
   - Customer request is not automatically technical requirement.
   - Configured is not automatically owned, available, held, or reserved.
   - Signed is not automatically deposit-received or capacity-reserved.
   - Absence of evidence in Stage Presence OS is not proof the real-world event did not happen.
   - AI/chat interpretation is not verified fact unless evidence or human authority supports promotion.

5. **Ask only material questions**
   Ask the user only when ambiguity could materially change the next business decision, for example:
   - two plausible customer matches
   - unreadable/ambiguous date
   - conflicting event dates
   - unclear scope that materially changes the solution or price
   - capacity/sourcing uncertainty before a consequential commitment

   Do not interrupt for capitalization, cosmetic completeness, optional metadata, or legacy blanks that do not affect current work.

6. **Update the backend when possible**
   Stage Presence OS/Supabase is the canonical structured business memory. Use it to keep current business reality synchronized when the available tools and permissions allow.

7. **Report back briefly**
   Tell the user what was updated, what meaningful uncertainty remains, and whether any human decision is actually needed.

## Build freeze / evidence gate
The current default is **operate and learn, not keep building**.

Do not modify the schema/app simply because a missing field or possible feature is noticed.

Reopen development only when real usage shows one of the following:
- the backend cannot faithfully represent recurring important business truth;
- Greg/Sean/Nancy/Operations cannot get the information needed to make a real decision;
- the same manual reconstruction/re-entry problem repeats enough to justify a structural fix;
- a real capacity/commercial/execution risk cannot be represented safely;
- a repeated exception earns a policy/default/integration/archetype/automation change;
- the user explicitly chooses to resume product development.

When development is earned, follow the branch -> build check -> PR -> `main` -> Cloudflare discipline. Avoid dependent half-finished commits directly to production `main`.

## Legacy Goodshuffle handling
Goodshuffle seeded starting reality. Do not rebuild its workflow.

Use inherited data in three classes:

### Active reality
Current/future work that affects decisions. Fill only the blanks required to move it responsibly.

### Historical intelligence
Past work useful for relationship history, venue knowledge, pricing reference, recurring configurations, learning, and future archetypes. Do not force retrospective cleanup.

### Legacy noise
Goodshuffle-specific fields/status behavior/taxonomy that does not improve the Stage Presence model. Preserve provenance where useful; do not reproduce it merely for completeness.

## Forward-born truth
New Stage Presence work should be born according to the new model rather than inheriting legacy reconstruction debt.

For new captures:
- freeform notes/photos remain source evidence;
- structured customer request is populated only when explicitly supported;
- unknown time remains unknown rather than becoming a fake timestamp;
- unknown customer/resource/sourcing/payment remains unknown until evidence supports it;
- one canonical Engagement continues through the lifecycle.

## Chat-uploaded photos and text
For now, the preferred AI interpretation workflow is intentionally manual-through-ChatGPT rather than an external paid API integration.

Typical path:

**Photo/text/conversation in ChatGPT -> interpretation -> Stage Presence OS update -> concise user confirmation**

This is an intentional validation phase. It lets real inputs teach us what future automated ingestion should do before we pay for or authorize a model integration.

The actual chat-uploaded image is not automatically copied into the private `source-artifacts` bucket. If permanent original-file retention becomes necessary, build/authorize that seam separately rather than implying it already exists.

## What success looks like
For an active Engagement, the system should progressively make it possible to answer:
- Who is this for?
- What are they trying to accomplish / what did they ask for?
- When and where is it happening?
- What solution is currently represented?
- What is the commercial/commitment position?
- Is capacity/sourcing a real concern?
- What happens next?
- Who owns that movement?
- Does Greg actually need to intervene?
- What did we learn after delivery?

For the company overall, Greg should be able to open the app briefly and understand what needs him, what is moving, what the team is handling, and what deserves attention.

## Resume instructions for a future chat
If a chat reaches its context limit or a new Stage Presence conversation is started:

1. Open/use the private repo `firstrateent-star/stage-presence-os`.
2. Read, at minimum:
   - `docs/BUSINESS_MODEL_CURRENT.md`
   - `docs/CURRENT_STATE.md`
   - `docs/CHAT_OPERATING_WORKFLOW.md`
   - `docs/CONSTITUTION.md`
   - `docs/ROADMAP.md`
3. Treat Supabase Stage Presence OS as canonical current structured truth.
4. Continue the chat-first operating workflow instead of asking the user to restate the project.
5. Do not touch unrelated projects (especially NFL DFS infrastructure).
6. Keep the build frozen unless real evidence earns development.

A user should be able to resume with a simple instruction such as:

> **Continue Stage Presence OS using the canonical repo and chat operating workflow.**

Then accept the next real Stage Presence input in whatever form it arrives.
