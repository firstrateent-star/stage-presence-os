# Data Model — v0.1 Kernel

## 1. profiles
Authenticated internal users.
Roles: `ADMIN`, `COMMERCIAL`, `OPERATIONS`, `VIEWER`.

## 2. parties
Represents a `PERSON` or `ORGANIZATION`.
Core: id, party_type, name, organization_name, email, phone, notes, created_at, updated_at, archived_at.

## 3. engagements
The canonical commercial/operational object.

Core:
- id
- engagement_number (`SP-000001` pattern)
- name
- engagement_type: `EVENT`, `LONG_TERM_RENTAL`, `INSTALLATION`, `EQUIPMENT_SALE`, `SERVICE`, `OTHER`
- customer_request
- desired_outcome
- internal_summary
- event_start / event_end
- venue_name / venue_address
- estimated_value
- commercial_state: `NEW`, `DISCOVERY`, `DESIGNING`, `PROPOSED`, `NEGOTIATING`, `WON`, `LOST`
- commitment_state: `UNCOMMITTED`, `VERBAL_YES`, `SIGNED`, `DEPOSIT_PENDING`, `CONFIRMED`, `CANCELLED`
- operational_state: `NOT_STARTED`, `PLANNING`, `READY`, `ACTIVE`, `COMPLETE`, `CLOSED`
- attention_state: `NORMAL`, `NEEDS_ATTENTION`, `WAITING`, `BLOCKED`
- next_action
- next_action_at
- next_action_owner_id
- waiting_on
- blocked_reason
- created_by / created_at / updated_at / archived_at

## 4. engagement_parties
Many-to-many link between parties and engagements.
Roles: `CUSTOMER`, `PRIMARY_CONTACT`, `PLANNER`, `REFERRER`, `VENUE_CONTACT`, `OTHER`.

## 5. engagement_facts
Flexible structured business facts.

Categories: `EVENT`, `VISUAL`, `AUDIO`, `LIGHTING`, `STAGING`, `POWER`, `NETWORK`, `VENUE`, `LOGISTICS`, `LABOR`, `CONTENT`, `CUSTOMER`, `OTHER`.
Kinds: `REQUIREMENT`, `CONSTRAINT`, `CUSTOMER_REQUEST`, `OBSERVATION`, `ASSUMPTION`, `PREFERENCE`, `OTHER`.
Certainty: `VERIFIED`, `KNOWN`, `ESTIMATED`, `ASSUMED`, `UNKNOWN`, `REQUESTED`, `CONFLICTING`, `OBSOLETE`, `NOT_APPLICABLE`.
Source types: `MANUAL`, `AI_EXTRACTION`, `PHOTO`, `VOICE`, `TEXT`, `IMPORT`, `EMAIL_REFERENCE`, `DOCUMENT`, `SYSTEM`, `CUSTOMER`, `OTHER`.

Fields include label, value_text, confidence, source_artifact_id, notes, created_by, created_at, updated_at.

## 6. source_artifacts
Evidence/provenance layer.
Types: `PHOTO`, `VOICE`, `TEXT`, `IMPORT`, `EMAIL_REFERENCE`, `DOCUMENT`, `OTHER`.
Processing: `RECEIVED`, `PENDING_ANALYSIS`, `ANALYZED`, `FAILED`, `NOT_REQUIRED`.
Preserve storage/reference, filename, MIME type, raw text when appropriate, metadata, creator/time.

## 7. resources
Partial capability/resource library.
Categories: `VIDEO`, `AUDIO`, `LIGHTING`, `STAGING`, `RIGGING`, `POWER`, `NETWORKING`, `TRANSPORT`, `OTHER`.
Quantity state: `VERIFIED`, `UNVERIFIED`, `ESTIMATED`, `UNKNOWN`.
Condition state may include `VERIFIED_GOOD`, `GOOD`, `FAIR`, `NEEDS_SERVICE`, `OUT_OF_SERVICE`, `UNKNOWN`.
Price state: `VERIFIED_CURRENT`, `LEGACY_REFERENCE`, `ESTIMATED`, `UNKNOWN`.
Sourcing model: `OWNED`, `SUBCONTRACTED`, `PARTNER`, `VENUE`, `UNKNOWN`.
Resources may also carry a stable `source_key` and `source_artifact_id` for provenance/import idempotence.
Do not equate existence with availability.

## 8. engagement_resources
Initial relationships: `CUSTOMER_REQUESTED`, `CONSIDERING`, `RECOMMENDED`.
Later may add `PROPOSED`, `COMMITTED`, `TENTATIVE_HOLD`, `RESERVED`, `USED`, `RETURNED` without replacing the root.

## 9. events
Append-oriented ledger.
Core: engagement_id optional, entity_type/id, event_type, actor_user_id/label, summary, metadata, created_at.

Initial taxonomy:
- ENGAGEMENT_CREATED / UPDATED / ARCHIVED
- COMMERCIAL_STATE_CHANGED
- COMMITMENT_STATE_CHANGED
- OPERATIONAL_STATE_CHANGED
- ATTENTION_STATE_CHANGED
- NEXT_ACTION_SET / COMPLETED
- PARTY_LINKED
- FACT_ADDED / UPDATED / VERIFIED / MARKED_UNKNOWN
- RESOURCE_LINKED / UNLINKED
- SOURCE_ADDED
- NOTE_ADDED
- AI_ANALYSIS_COMPLETED
- AI_SUGGESTION_ACCEPTED / REJECTED
