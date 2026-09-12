# ADR-0002 — Agents operate on truth; agents do not own truth

**Status:** Accepted  
**Date:** 2026-09-12

## Context

Stage Presence is increasingly using derived intelligence: Recovery, movement prioritization, readiness explanations and future AI-assisted workflows. If prompts, model outputs or agent memory become the only place important business knowledge exists, model replacement or prompt changes can erase operational continuity.

## Decision

AI agents and intelligent workflows may read, interpret, recommend and—where explicitly authorized—perform governed actions against canonical systems. They do not become the canonical owner of customers, pricing, commitments, schedules, resources, money or other durable business truth.

Important outputs that affect operations must be promoted into the correct canonical domain through governed commands with provenance and authority checks.

## Consequences

- Models and providers remain replaceable.
- Important business understanding survives prompt/model changes.
- Agent outputs must distinguish evidence, inference, assumptions and unknowns.
- High-impact writes require explicit authorization.
- Chat history is not an acceptable sole source of operational memory.