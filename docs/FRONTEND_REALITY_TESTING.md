# Frontend Reality Testing

Stage Presence OS should expose new backend intelligence incrementally so real use can validate the model before broader automation.

## First live slice

Commercial/pricing intelligence belongs inside the Engagement workspace first, not on Today or Work by default.

Reason:
- it is useful when someone is actively evaluating an Engagement;
- it is richer than summary-card information;
- it contains uncertainty and historical context that should not compete with immediate operating attention;
- real use will show which commercial signals deserve promotion into higher-level surfaces later.

## Testing loop

1. Backend captures and derives structured truth.
2. Presentation model translates that truth into human language.
3. Engagement workspace reveals the smallest useful commercial summary first.
4. Deeper line-level context remains collapsible.
5. Users compare the surface against actual business reality.
6. Corrections update backend rules/read contracts rather than adding ad-hoc UI exceptions.
7. Repeatedly valuable signals may graduate upward into Work or Today.

## Promotion rule

A datum graduates upward only when it repeatedly changes a decision at that level.

- Today: what needs attention now.
- Work: what is this Engagement and where is it moving.
- Engagement: what do I need to understand and operate this piece of business.
- Reference: what reusable knowledge supports the decision.
- Evidence: why does the system believe this.

This keeps backend information growth compatible with a calm frontend while giving Stage Presence a practical way to test the system alongside reality.
