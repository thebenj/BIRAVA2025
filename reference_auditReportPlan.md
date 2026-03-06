# Audit Report System — Future Plan

## Status: FUTURE (not part of current work plan)

## Concept

A systematic audit capability that runs across all application data, highlighting questionable values for optional human review. Not tied to any single pipeline or database — runs over the full dataset.

Findings are suggestions, not errors — many flagged items will be appropriately placed, but the report helps spot things that need attention.

## Audit Categories Identified So Far

### 1. Low-Correlation Candidates in Aliases
Review all candidate values in aliases across different data types. Highlight those with the lowest correlation scores. Many are correctly placed, but outliers may reveal misclassifications worth reviewing.

### 2. ERRONEOUS-Tagged First Names
Flag all records where the first name holds the ERRONEOUS tag (from Phase 4.5 individual discovery). These represent names that couldn't be parsed and need human review.

### 3. Same-Phone Entities in Different Entity Groups
When both members of a phonebook couple are matched to existing entities in Step 1 (both consumed, no new entity creation), check whether those entities ended up in different entity groups. Entities sharing the same phonebook phone number in different groups may indicate a grouping problem or may be legitimate (e.g., divorced couple). Analysis flag for human review. (Session 139 specification, see also reference_phonebookDatabasePlan.md Phase 5.3-audit.)

### 4. *(More categories to be added as we identify them during development)*

## Design Principles

- **System-wide scope**: Not limited to phonebook data — audits entity groups, IndividualNameDatabase, aliases, all supplemental databases.
- **Suggestions, not mandates**: The audit highlights; the user decides what to act on.
- **Cumulative discovery**: As we build remaining phases, when we encounter something "auditable," note it here as a future audit category. The design should be informed by real discoveries.
- **Fits the maintenance workflow**: The audit feeds into the same review/correct/accept workflow described in the DATA_QUALITY_MANAGEMENT_RULE. Audit findings become inputs to database management tools.

## Relationship to Completion Gates

Extends Gate 1 (Production Data Quality Detection) beyond pipeline-run anomalies to a broader sweep of stored data. The audit UI (whether part of an existing browser or standalone) would surface findings for review/correction/acceptance per Gates 2–4.
