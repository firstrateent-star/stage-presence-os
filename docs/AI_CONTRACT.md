# Engagement / Capture Interpreter Contract

## Purpose
Translate natural Stage Presence source evidence into **reviewable candidate structure** that reduces reconstruction and decision friction.

The Interpreter is an interpreter/advisor, not business authority.

Its success metric is not maximum field extraction. It is:

> **How much useful business structure can be proposed while preserving what is actually known, minimizing human re-entry, and asking only questions that can change the next decision?**

## Inputs
Potential inputs include:
- typed natural language
- photographed Quick Lead Sheet / image contents
- future voice transcript
- future email or website inquiry
- source artifact reference/provenance
- the minimum existing Party/Engagement/resource context necessary for matching or interpretation

Do not send unrelated Stage Presence records merely because they are available.

## Candidate outputs
The Interpreter may propose:
- Engagement name/type
- event/project date or timing precision
- venue/location
- candidate Party identity and role
- possible existing Party/Engagement matches
- literal customer request, preserved as literal when the source supports it
- inferred desired outcome, clearly distinguished from literal request
- candidate facts with category/kind/certainty/confidence/source
- capability/resource mentions and candidate resource matches
- material unknowns or conflicts
- suggested next movement / decision
- contradictions or warnings

## Trust membrane
1. **Source first.** Preserve the original source independently of interpretation.
2. **Candidate by default.** AI output does not silently become verified truth.
3. **Literal vs inferred.** Customer statements and model interpretation remain distinguishable.
4. **Unknown remains valid.** Missing or ambiguous information is not completed by plausible guessing.
5. **Ambiguous matches do not merge.** A possible customer/job match must remain a candidate until deterministic evidence or authorized review resolves it.
6. **Commitments remain governed.** AI may not independently create contractual, pricing, payment, capacity, hold/reservation, safety, or availability commitments.
7. **Decision leverage governs interruption.** Ask a human only when ambiguity can materially change the next responsible decision.
8. **Minimum necessary context.** External model calls should receive only the source and context needed for the interpretation task.
9. **Provenance survives promotion.** Any candidate later promoted into Shared Reality should retain enough source/reference context to reconstruct why it exists.

## Promotion model
A future Interpreter should support different promotion paths rather than one `AI accepted` state.

### Safe candidate presentation
Low-consequence structure can be shown as a suggested interpretation without changing canonical truth.

### Deterministic / strongly supported promotion
Where a value is directly and unambiguously supported by source evidence and the product authority contract allows it, the system may offer quick confirmation or narrowly scoped promotion.

### Material review
Commercial, technical, capacity, identity-matching, payment, contractual, or other consequential interpretations require the appropriate human/rule authority.

### Rejection / unresolved
Low-confidence or conflicting material remains unresolved. Do not invent a value to make the Engagement look complete.

## Fast path / deep path
Unknowns do not automatically block progress.

Routine opportunities should remain fast when the unresolved information cannot change the next decision. Complex, scarce-capacity, high-value, technically unusual, or risk-sensitive work can invoke deeper clarification.

## Server boundary
When activated:
- AI secrets must live server-side only;
- the browser must never receive provider secret keys;
- model calls should pass through a tightly scoped server/function boundary;
- provider response/request metadata necessary for audit should be recorded without duplicating source content unnecessarily.

## Activation gate
No paid/external Capture Interpreter is enabled until `docs/PERMISSION_GATES.md` current AI gate is explicitly approved.
