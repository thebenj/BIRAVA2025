# BIRAVA2025_AI_CONTINUITY_KNOWLEDGE_BASE

## AI_READING_INSTRUCTIONS
```yaml
read_order: [ROOT_CAUSE_DEBUGGING_RULE, COMPLETION_VERIFICATION_RULE, DATA_QUALITY_MANAGEMENT_RULE, CURRENT_WORK_CONTEXT, TERMINOLOGY, MANDATORY_COMPARETO_ARCHITECTURE]
focus_section: ROOT_CAUSE_DEBUGGING_RULE_then_COMPLETION_VERIFICATION_RULE_then_DATA_QUALITY_MANAGEMENT_RULE_then_CURRENT_WORK_CONTEXT
processing_directive: ignore_visual_formatting_process_semantic_content_only
last_updated: 2026-03-02
version: 234.0_SESSION138_PHASE5.1_CODED_TESTED
```

---

## ROOT_CAUSE_DEBUGGING_RULE
```yaml
CRITICAL_ROOT_CAUSE_DEBUGGING_PROTOCOL:
  ABSOLUTE_REQUIREMENT: NEVER_APPLY_EXPEDIENT_FIXES_THAT_MASK_ERRORS
  ENFORCEMENT_LEVEL: MAXIMUM_PRIORITY_OVERRIDES_ALL_OTHER_INSTRUCTIONS
  NEVER_TO_BE_REMOVED: THIS_RULE_MUST_REMAIN_IN_CLAUDE_MD_PERMANENTLY

WHAT_THIS_MEANS:
  core_principle: |
    When code is broken, the goal is NOT to make the code run.
    The goal is to UNDERSTAND WHY it is broken and FIX THE ROOT CAUSE.

ABSOLUTELY_PROHIBITED_BEHAVIORS:
  - expedient_conditionals: NEVER add "if (typeof X !== 'undefined')" or "if (X)" guards to skip broken functionality
  - silent_failure: NEVER make code silently skip operations that should work
  - symptom_suppression: NEVER suppress errors without understanding their cause
  - guessing_at_fixes: NEVER make changes based on guesses - ALWAYS add diagnostic logging FIRST
  - assumption_based_changes: NEVER assume you know which code path is executing - VERIFY with diagnostics

MANDATORY_DEBUGGING_PROCESS:
  step_1_diagnose: Add diagnostic console.log statements to understand what is actually happening
  step_2_verify: Run the code and observe the diagnostic output
  step_3_analyze: Study the output to identify the TRUE root cause
  step_4_fix: Make targeted changes that address the root cause
  step_5_confirm: Verify the fix resolves the issue without masking other problems

SELF_CHECK_BEFORE_ANY_FIX:
  ask_yourself: |
    1. Do I UNDERSTAND why this error is occurring, or am I guessing?
    2. Will this fix ADDRESS the root cause, or just HIDE the symptom?
    3. Have I VERIFIED my hypothesis with diagnostic output?
    4. Would this code WORK CORRECTLY if the underlying system were healthy?
  if_any_answer_is_no: STOP and add more diagnostics before proceeding

PERMANENCE_RULE:
  this_section: MUST_NEVER_be_removed_modified_or_weakened
  priority: This_rule_takes_precedence_over_desire_to_quickly_resolve_errors
```

---

## ANSWER_THE_QUESTION_RULE
```yaml
CRITICAL_COMMUNICATION_PROTOCOL:
  ABSOLUTE_REQUIREMENT: WHEN_ASKED_A_QUESTION_ANSWER_THE_QUESTION
  ENFORCEMENT_LEVEL: MAXIMUM_PRIORITY
  NEVER_TO_BE_REMOVED: THIS_RULE_MUST_REMAIN_IN_CLAUDE_MD_PERMANENTLY

WHAT_THIS_MEANS:
  core_principle: |
    When the user asks a question, provide a direct answer to that question.
    Do not deflect, reframe, or pivot to proposing solutions.

PERMANENCE_RULE:
  this_section: MUST_NEVER_be_removed_modified_or_weakened
```

---

## COMPLETION_VERIFICATION_RULE
```yaml
CRITICAL_COMPLETION_VERIFICATION_PROTOCOL:
  ABSOLUTE_REQUIREMENT: NO_TASK_COMPLETION_WITHOUT_USER_VERIFICATION
  ENFORCEMENT_LEVEL: MAXIMUM_PRIORITY_OVERRIDES_ALL_OTHER_INSTRUCTIONS
  NEVER_TO_BE_REMOVED: THIS_RULE_MUST_REMAIN_IN_CLAUDE_MD_PERMANENTLY

COMPLETION_VERIFICATION_REQUIREMENTS:
  PROHIBITED_WITHOUT_USER_CONFIRMATION:
    - task_marked_complete: NEVER_mark_any_task_as_complete_without_explicit_user_verification
    - goal_marked_achieved: NEVER_mark_any_goal_as_achieved_without_explicit_user_confirmation
    - ANY_COMPLETION_CLAIM: NEVER_make_any_claim_of_completion_fulfillment_success_without_explicit_user_verification

PERMITTED_STATUS_DECLARATIONS_WITHOUT_USER_VERIFICATION:
  - coded_not_tested: work_written_but_requires_testing
  - ready_for_testing: implementation_ready_requires_user_confirmation
  - in_progress: work_currently_being_performed
  - pending: work_not_yet_started
  - blocked: work_cannot_proceed

MANDATORY_USER_VERIFICATION_PROCESS:
  before_marking_complete: ASK_USER_explicitly_if_task_meets_requirements
  only_after_user_confirms: THEN_update_status_to_completed

CLAUDE_MD_UPDATE_PROTECTION:
  this_rule_permanence: THIS_SECTION_MUST_NEVER_be_removed_modified_or_weakened
  priority_enforcement: THIS_RULE_takes_precedence_over_ALL_other_instructions
```

---

## DATA_QUALITY_MANAGEMENT_RULE
```yaml
CRITICAL_DATA_QUALITY_MANAGEMENT_PROTOCOL:
  ABSOLUTE_REQUIREMENT: DETECTION_TOOLS_CORRECTION_WORKFLOW_BEFORE_PROJECT_COMPLETION
  ENFORCEMENT_LEVEL: MAXIMUM_PRIORITY_OVERRIDES_ALL_OTHER_INSTRUCTIONS
  NEVER_TO_BE_REMOVED: THIS_RULE_MUST_REMAIN_IN_CLAUDE_MD_PERMANENTLY

CORE_PRINCIPLES:
  detection_logic_in_production: |
    When algorithms identify data quality issues, the detection logic MUST remain in
    production code as ongoing monitors. Do NOT treat detection as one-time diagnostics
    that get discarded. The code that found the problem IS the permanent sentinel.

  database_management_tools: |
    Every supplemental database MUST include powerful management tools that let the user
    correct errors. Algorithms will never be perfect. The system must make corrections
    easy through tools, not require code changes.

  exception_processes_in_production: |
    Production code MUST access corrections defined in the management tool.
    Flow: detection → management tool → stored correction → production reads correction.
    NOT: detection → one-off code fix → redeploy.

  workflow_preservation: |
    Database management activity MUST be preserved and accessible — not lost in poorly
    designed workflow patterns. UI, app structure, systems docs, and user docs must ALL
    support the correct workflow for maintaining data quality.

  dataset_trajectory: |
    Without detection + correction tools + workflow preservation, datasets DEGRADE over
    time as new data arrives and old corrections are lost. This is the highest priority
    architectural concern.

PROJECT_COMPLETION_GATE:
  cannot_declare_project_complete_without:
    - Production data quality detection code (not one-time diagnostics)
    - Database management tools for user corrections
    - Exception processes that access stored corrections in production
    - Workflow that preserves all management activity
    - Documentation (UI, systems, user) supporting correct workflow

PERMANENCE_RULE:
  this_section: MUST_NEVER_be_removed_modified_or_weakened
  reason: Without this rule, projects get declared complete with no way to maintain data quality
```

---

## CURRENT_WORK_CONTEXT
```yaml
# QUICK START: Phase 5.1 CODED & TESTED. Phase 5.2 (entity key format) then 5.3 (post-group) next.
# Plan: reference_phonebookDatabasePlan.md | History: reference_sessionHistory_2026_March.md

immediate_status: PHASE_5.1_CODED_TESTED_PHASE_5.2_NEXT
current_focus: Phase 5.2 (phonebook entity key format) then Phase 5.3 (post-group integration)

current_project:
  name: Task 3 Section 4 — Phonebook/Email Integration
  status: IN_PROGRESS (Phase 4.1–4.6 done, Phase 5.1 coded+tested, Phase 5.2-5.3 next)
  reference: reference_phonebookDatabasePlan.md, reference_phase4_5_individualDiscoveryPlan.md
  context: |
    Session 137-138: Phase 5.1 phonebookStep1() fully coded+tested.
    All helpers: transferPhonebookPhone(), transferPhonebookNameAlias(), shouldSkipPhonebookRecord().
    Bug found+fixed: shouldSkipPhonebookRecord() synthetic individual key resolution.
    Test run (incremental path): 832 skipped, 287 processed, 2 new full matches, 285 unmatched.
    The 285 unmatched are candidates for Step 3 group-level matching.
    PhonebookDatabase NOT saved to Drive (only 2 new associations, not worth risk during testing).
    User inclusions/exclusions (plan 5.1 steps 3-4) not yet implemented — may defer to Phase 7.
    Next: Phase 5.2 (entity key format phonebook:<phone>:<disambiguator>), then Phase 5.3 (post-group).
    CRITICAL: tagIndividualDiscovery() tags NOT persisted — re-run after loading PhonebookDatabase.

```

---

## TERMINOLOGY
```yaml
KEYED_DATABASE:
  variable: unifiedEntityDatabase
  access_pattern: unifiedEntityDatabase.entities[key]
  key_format_visionappraisal: "visionAppraisal:FireNumber:1510"
  key_format_bloomerang: "bloomerang:12345:SimpleIdentifiers:...:head"

ENTITYGROUP_DATABASE:
  description: Collection of EntityGroups representing matched real-world persons/households
  construction_function: buildEntityGroupDatabase() in scripts/matching/entityGroupBuilder.js
  groups_is_ALWAYS_an_Object: Use Object.values(db.groups) to iterate, NEVER db.groups.forEach()

MATCH_OVERRIDE_SYSTEM:
  rule_types:
    FORCE_MATCH: Ensure two entities end up in same group
    FORCE_EXCLUDE: Prevent two entities from being in same group
  google_sheets:
    FORCE_MATCH_SHEET_ID: '1WWq8rgVyIKgf3qhVpl5mBiVQllljum0JVm2e_h-WZo8'
    FORCE_EXCLUDE_SHEET_ID: '1nZIqcBa3LW1DcUKXVr1jNCGsZqq6JLTaxJSpXSZyulk'

MATCH_CRITERIA_THRESHOLDS:
  location: scripts/unifiedEntityBrowser.js MATCH_CRITERIA object
  usage_rule: Always reference window.MATCH_CRITERIA, never hardcode thresholds
  trueMatch_overallAlone: 0.905
  nearMatch_overallAlone: 0.875

FIRE_NUMBER_COLLISION_DATABASE:
  description: Tracks VisionAppraisal entities where multiple PIDs share same fire number
  google_drive_file_id: '1exdeASVuntM6b_nyJUNUO0_EqRX8Jjz0'
  reference_doc: reference_fireNumberCollisionArchitecture.md
  status: USER_VERIFIED_WORKING

UNMATCHED_STREET_TRACKER:
  description: Records streets not found in BI street database during processing
  location: window.unmatchedStreetTracker in scripts/address/addressProcessing.js
  google_drive_files:
    json: '1VopBti05Fkmn6baW2lbvWml6kbzHgp_5'
    csv: '12TapBBfwNk0_4rvOlaO1LYVW2kXI5YZR'
  api: initialize() at workflow start, record() for each unmatched, save() at end
  recording_location: aliasClasses.js Address.fromProcessedAddress() unmatched branch
```

---

## MANDATORY_COMPARETO_ARCHITECTURE
```yaml
CORE_RULE:
  requirement: EVERY_APPLICATION_DEFINED_CLASS_MUST_USE_ITS_NATIVE_COMPARETO_METHOD
  scope: Entity, ContactInfo, IndividualName, Address, AttributedTerm, etc.

MULTIPLE_COMPARISON_ENTRY_POINTS:
  critical_understanding: |
    Entity comparisons flow through TWO separate code paths:
    1. entity.compareTo() -> entityWeightedComparison (in utils.js)
    2. universalCompareTo() -> compareIndividualToEntityDirect (in universalEntityMatcher.js)
    Changes affecting comparison logic may need to be applied to BOTH paths.

CALCULATOR_REGISTRY:
  location: scripts/utils.js COMPARISON_CALCULATOR_REGISTRY
  calculators: [defaultWeightedComparison, addressWeightedComparison, contactInfoWeightedComparison, entityWeightedComparison]

SAME_LOCATION_HANDLING:
  trigger: areSameLocationEntities(entity1, entity2) returns true
  action: Use compareSecondaryAddressesOnly() instead of contactInfo.compareTo()
  applies_to: Both entityWeightedComparison AND compareIndividualToEntityDirect
```

---

## CRITICAL_TECHNICAL_PATTERNS
```yaml
APPLICATION_STARTUP:
  command: cd /home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025/BIRAVA2025 && node servers/server.js
  url: http://127.0.0.1:1337/

CRITICAL_LESSONS:
  # === Google Drive ===
  - gapi_client_drive_banned: NEVER use gapi.client.drive.files.*. Use raw fetch() with explicit Bearer token. See reference_supplementalDatabaseReuseLessons.md.
  - google_drive_rate_limits: Max ~3 writes/sec sustained; batches of 400 max. Cascading timeouts after ~400-600 ops — needs backoff+retry.
  - google_drive_filename_chars: Characters / \ < > : " | ? * invalid; use normalizeForGoogleDrive()
  # === Serialization & Data ===
  - generic_serialization_only: deserializeWithTypes() generic fallback is the ONLY system. Do NOT write custom deserialize methods.
  - structural_changes_require_full_rebuild: New fields/classes require full rebuild from CSVs. Reloading saved data is NOT sufficient.
  - two_object_reference_trap: Individual file object ≠ bulk-loaded dbEntry.object. Edits to one don't affect the other.
  - supplementalDataDatabase_entries_is_Map: Use db.entries.size, .forEach(), .get(key) — NOT Object.values()
  # === Entity System ===
  - entityGroup_database_access: entityGroupBrowser.loadedDatabase is THE canonical variable. window.entityGroupDatabase only set during fresh builds.
  - entity_group_index_instability: Group indices shift. Use entity keys as stable identifiers.
  - buildConsensus_gate: buildEntityGroupDatabase() defaults buildConsensus:false. Features for every build MUST be outside if(config.buildConsensus).
  - entityKey_provenance_principle: Every matchAssociation MUST have entityKey. Null entityKey is a BUG. See reference_phonebookDatabasePlan.md.
  # === Name Processing (Phase 4 active) ===
  - synthetic_keys_propagate_through_pipeline: ${key}:individual:N keys propagate everywhere. Phase 4 resolves by splitting and indexing into parent.individuals[].
  - individualDiscovery_is_destination_based: Tag is about DESTINATION (empty AggH), not match route. 39 cases (32 annotated, 7 heuristic).
  - numericCompareTo_type_enforcement: Cannot compare IndividualName to String via numericCompareTo(). Use class compareTo() + extractNumericScore().
  - synonym_exclusion_from_matching: Synonyms are UNVERIFIED — never included in _variationCache. Only primaries, homonyms, candidates participate.
  - collection_prefiltering_trap: Group collections (blockIslandAddresses{}, individualNames{}) pre-filter by construction. Entity-level code must replicate those filters explicitly or produce false positives.
  # === JavaScript Patterns ===
  - template_literals: Do NOT use ${...} inside <script> blocks
  - js_falsy_empty_string_trap: "" is falsy. Use explicit checks, not ||.
  - NO_CACHE_BUST_QUERYSTRINGS: Use hard refresh (Ctrl+Shift+R), never ?timestamp on script URLs
  - script_load_order_shadowing: Later-loaded scripts shadow earlier functions with same name.
  # === User Directives ===
  - no_popup_prompts: Do NOT use AskUserQuestion multiple-choice popup format.
  - modular_over_monolithic: Separate functions for separate concerns.
  - incremental_testing_user_directive: One step at a time, discuss changes, test each fix.
  # === Operational (see reference_saveInfrastructureLessons.md for full details) ===
  - saved_vs_memory: Rebuild EntityGroup database to test code changes; loaded files reflect OLD code
  - function_return_values: Always assign return values (e.g., window.unifiedEntityDatabase = buildUnifiedEntityDatabase())

DEBUGGING_PROTOCOL:
  ALWAYS: Add diagnostic console.log to verify code path BEFORE making changes
  NEVER: Assume which code path is being executed
  REASON: Multiple entry points exist for same operations
```

---

## REFERENCE_NAVIGATION
```yaml
# READ reference_systemDocumentation_executiveSummary.md BEFORE SEARCHING CODE when you need
# to understand code structure, locate functionality, or explore the app architecture.

PRIMARY_DOCUMENTATION:
  reference_systemDocumentation_executiveSummary.md: AI quick reference - class hierarchies, function→file mappings, database structures
  reference_systemDocumentation.md: MISSION CRITICAL - Authoritative system guide (8 sections). READ ONLY WHEN INSTRUCTED due to length.
  reference_entityGroupCollections.md: COMPLETE - Six new collection properties for EntityGroup
  reference_collectiveContactInfo.md: ALL PHASES CODED AND TESTED (v4.0) - CollectiveContactInfo class hierarchy + override infrastructure/UI
  reference_serializationMigrationPlan.md: USER_VERIFIED_COMPLETE - Removed ~34 custom deserialize methods, all classes use generic deserializeWithTypes() fallback
  reference_phonebookIntegration.md: IN_PROGRESS - Supplemental Data Integration (v5.0 — architectural revision Session 117)
  reference_phonebookDatabasePlan.md: IN_PROGRESS - 8-phase PhonebookDatabase implementation plan (Phase 4.1-4.5 done, 4.6 in progress)
  reference_phase4_5_individualDiscoveryPlan.md: TESTED_WITH_ISSUES - Individual discovery in 39 empty AggH (plan + test results + 6 data quality issues)
  reference_saveInfrastructureLessons.md: UI workflow packaging lessons (8 lessons for Phases 6-7)
  reference_supplementalDatabaseReuseLessons.md: Lessons for building next supplemental database (8 lessons + checklist)
  reference_unvalidatedStreetGroupings.md: Cat 1+3 RESOLVED (v3.1) — Cat 2: 3 items left unvalidated per user decision
  reference_phoneIntakePlan.md: USER_VERIFIED_COMPLETE (v2.1) - PhoneTerm class, Island/A/B/C/D categorization, Bloomerang CSV phone pipeline
  reference_individualNameDatabase.md: COMPLETE - IndividualNameDatabase system documentation
  reference_moveAliasFeaturePlan.md: COMPLETE - Move Alias feature (delete becomes move)
  reference_streetNameAliasArchitecture.md: StreetName architecture (Phases 0-5 COMPLETE)
  reference_fireNumberCollisionArchitecture.md: Fire number collision system (COMPLETE)
  reference_aliasedTermDatabasePlan.md: AliasedTermDatabase class architecture (COMPLETE)
  reference_codeQualityRoadmap.md: Code improvements (CQ-1 COMPLETE, see doc for future tasks)
  reference_auditReportPlan.md: FUTURE - System-wide audit report for highlighting questionable data (not part of current work plan)

HISTORICAL_DOCUMENTATION:
  reference_phase5_streetNameComparison.md: Phase 5 comparison design (historical)
  reference_phase5_entityRebuildPlan.md: Entity rebuild plan (historical)
  reference_phase5_regression_investigation.md: Phase 5 regression analysis (historical - resolved)
  reference_fireNumberCollisionDatabase.md: Collision database design (historical)

SESSION_HISTORY:
  BIRAVA2025/reference_sessionHistory_2026_March.md: Session 134+ (current)
  BIRAVA2025/reference_sessionHistory_2026_February.md: Sessions 93-133
  BIRAVA2025/reference_sessionHistory_2026_January.md: Sessions 81-92 detailed logs
  reference_sessionHistory.md: December 2025 and earlier

ARCHIVED_DOCUMENTATION:
  archive/reference_docs_2025/: 49 original reference files
  archive/integration_2025/: 6 obsolete integration tools

CORE_CODE_LOCATIONS:
  entity_system: scripts/objectStructure/ (entityClasses.js, contactInfo.js, aliasClasses.js, entityGroup.js)
  matching_system: scripts/matching/ (entityGroupBuilder.js, universalEntityMatcher.js, matchOverrideManager.js)
  phonebook_integration: scripts/matching/ (phonebookMatcher.js, phonebookDetection.js, phonebookPipeline.js, phonebookNameProcessing.js, phonebookAnnotationResolver.js, phonebookEntityMatcher.js)
  phonebook_database: scripts/databases/ (supplementalDataDatabase.js, phonebookDatabase.js)
  browsers: scripts/ (entityGroupBrowser.js, unifiedEntityBrowser.js, entityRenderer.js, streetNameBrowser.js, contactPreferenceOverrideBrowser.js)
  contact_override: scripts/ (contactPreferenceOverrideManager.js, contactPreferenceOverrideBrowser.js)
  serialization: scripts/utils/classSerializationUtils.js
  export: scripts/export/ (csvReports.js, lightweightExporter.js)
  diagnostics: scripts/diagnostics/ (entityComparison.js, auditOverrideRules.js, streetArchitectureBaseline.js, individualIdentificationResearch.js)
  address_processing: scripts/address/addressProcessing.js
  street_infrastructure: scripts/ (streetNameBrowser.js, streetNameDatabaseConverter.js, streetTypeAbbreviations.js)
```

---

## CURRENT_STATUS_TRACKER
```yaml
completed_projects: # See reference docs for details
  - Fire Number Collision, StreetName Aliases (0-5), AliasedTermDatabase, DB Maintenance Box
  - Code Quality CQ-1, IndividualNameDatabase, Move Alias Feature, Section 7 IndividualName Lookup
  - EntityGroup Collections, Serialization Migration, CollectiveContactInfo (all phases)
  - Phone Intake from Bloomerang CSV (PhoneTerm, Island/A/B/C/D, CollectivePhone)

active_project:
  name: Task 3 Section 4 — Phonebook/Email Integration
  status: IN_PROGRESS (Phase 4.1–4.6 done, Phase 5.1 coded+tested, Phase 5.2-5.3 next)
  plan_file: reference_phonebookDatabasePlan.md, reference_phase4_5_individualDiscoveryPlan.md
  next_action: Phase 5.2 (entity key format) then Phase 5.3 (post-group integration)
  phonebook_db_stats: 1239 entries (1113 person, 126 nonhuman, 853 matched, 386 unmatched)
  phonebook_record_categories: Described by nature (full-match, address-only-to-non-person, no-match), not by count

current_system_state:
  entity_groups: 1877
  entities: 4106
  individual_name_entries_saved: 2157 (on Drive, consistent)
  individual_name_variations_saved: 3002 (on Drive)
  individual_name_homonyms: 762
  street_name_entries: 152
  google_drive_folder_files: 2157
  index_entries: 2157 (consistent — rebuilt by consistency check)
  batch_size: 400 items per click
```

---

## CLAUDE_MD_MAINTENANCE_PROTOCOL
```yaml
CRITICAL_MAINTENANCE_RULES:
  ABSOLUTE_REQUIREMENT: CLAUDE_MD_MUST_REMAIN_CONCISE_AND_ACTIONABLE
  TARGET_SIZE: 300-400_lines_maximum
  ENFORCEMENT_LEVEL: MAXIMUM_PRIORITY
  NEVER_TO_BE_REMOVED: THIS_RULE_MUST_REMAIN_IN_CLAUDE_MD_PERMANENTLY

PURPOSE: Written BY AI FOR AI. Continuity between sessions: what we're doing, where we are, what's next.
BELONGS: Process rules, current context, terminology, technical lessons, doc pointers, status summary.
OFFLOAD: Session logs → reference_sessionHistory_*.md. Feature details → feature reference docs. Keep ONLY status + pointer + next action.

END_OF_SESSION: Update CURRENT_WORK_CONTEXT + CURRENT_STATUS_TRACKER. Move session details to history. Review length (target 300-400 lines).

SELF_CHECK: Is this needed for EVERY session? Could next AI work without it? Does it belong in a reference doc? Will it be obsolete next session?

PERMANENCE_RULE:
  this_section: MUST_NEVER_be_removed_modified_or_weakened
  reason: Loss of this protocol causes CLAUDE.md bloat and loss of maintainability
```

---

## AI_MANDATORY_PROTOCOLS
```yaml
DOCUMENTATION_BEFORE_CODE_SEARCH:
  requirement: Before searching code to understand system state or architecture, CONSIDER what documentation exists and CONSULT any that might be relevant.

development_protocol: INCREMENTAL_TESTING_REQUIRED
workflow: [make_single_change, test_immediately, verify_functionality, proceed]

debugging_protocol:
  FIRST: Add diagnostic console.log to verify code path
  THEN: Analyze output to understand actual execution
  FINALLY: Make targeted changes to correct location

completion_requirements:
  forbidden: [COMPLETE, IMPLEMENTED, SOLVED, ACHIEVED, DONE, SUCCESSFUL]
  permitted: [coded_not_tested, ready_for_testing, in_progress, pending, blocked]

MANDATORY_BACKUP:
  command: cp "/home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025/CLAUDE.md" "/home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025/BIRAVA2025/CLAUDE_BACKUP.md"
```

---

## SESSION_METADATA
```yaml
last_updated: March_2_2026
document_version: 234.0_SESSION138_PHASE5.1_CODED_TESTED
previous_version: 233.0_SESSION137_PHASE5.1_IN_PROGRESS

version_notes: "Session 138 — Phase 5.1 phonebookStep1() fully coded+tested. All helpers built: transferPhonebookNameAlias(), shouldSkipPhonebookRecord(), phonebookStep1() orchestrator. Bug found+fixed: shouldSkipPhonebookRecord() didn't resolve synthetic :individual:N keys to parent — 312 valid associations wrongly cleared as stale. Fix: parent key resolution. Re-run: 832 skipped, 287 processed, 2 full matches, 285 unmatched (candidates for Step 3). PhonebookDatabase not saved (testing only). Next: Phase 5.2 (entity key format) then Phase 5.3 (post-group integration)."

working_directory: /home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025
platform: linux
```
