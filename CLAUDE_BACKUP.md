# BIRAVA2025_AI_CONTINUITY_KNOWLEDGE_BASE

## AI_READING_INSTRUCTIONS
```yaml
read_order: [ROOT_CAUSE_DEBUGGING_RULE, COMPLETION_VERIFICATION_RULE, CURRENT_WORK_CONTEXT, TERMINOLOGY, MANDATORY_COMPARETO_ARCHITECTURE]
focus_section: ROOT_CAUSE_DEBUGGING_RULE_then_COMPLETION_VERIFICATION_RULE_then_CURRENT_WORK_CONTEXT
processing_directive: ignore_visual_formatting_process_semantic_content_only
last_updated: 2026-02-03
version: 189.0_SESSION94_SECTION4_PLAN_REVISED
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

## CURRENT_WORK_CONTEXT
```yaml
# QUICK START - READ THIS FIRST
#
# ROADMAP (in order):
#   1. Task 1 (Database Maintenance Box): USER_VERIFIED_COMPLETE
#   2. Task 2 (AliasedTermDatabase): USER_VERIFIED_COMPLETE
#   3. Code Quality CQ-1: USER_VERIFIED_COMPLETE
#   4. IndividualNameDatabase System: USER_VERIFIED_COMPLETE
#   5. Task 3 (Supplemental Data Integration): IN_PROGRESS
#      - Section 7 (IndividualName lookup): USER_VERIFIED_COMPLETE
#      - EntityGroup Collections: USER_VERIFIED_COMPLETE (6/6 collections + CSV report)
#      - Section 4 (Phonebook/Email Integration): PENDING - PLAN REVISED Feb 3 (26 tasks)
#
# NEXT ACTION: Section 4 Phase A - Foundation (see reference_phonebookIntegration.md)

immediate_status: SECTION_4_PLAN_REVISED_READY_TO_BEGIN
current_focus: Task 3 Section 4 - Supplemental Data Integration (Phonebook/Email)

current_project:
  name: Task 3 - Supplemental Data Integration
  status: IN_PROGRESS
  reference: reference_phonebookIntegration.md (v3.0)
  next_section: Section 4 Phase A (Foundation - tasks 4.1-4.4)

completed_tasks:
  task_1: USER_VERIFIED_COMPLETE (Database Maintenance Box)
  task_2: USER_VERIFIED_COMPLETE (reference_aliasedTermDatabasePlan.md)
  cq_1: USER_VERIFIED_COMPLETE (reference_codeQualityRoadmap.md)
  individualNameDatabase: USER_VERIFIED_COMPLETE (reference_individualNameDatabase.md)
  move_alias: USER_VERIFIED_COMPLETE (reference_moveAliasFeaturePlan.md)
  compareTo_implementation: USER_VERIFIED_COMPLETE (Option D - four-score return)
  section_7_lookup: USER_VERIFIED_COMPLETE (IndividualName database lookup)
  entityGroup_collections: USER_VERIFIED_COMPLETE (reference_entityGroupCollections.md)
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
  - fetch_Results_files: fetch('http://127.0.0.99:3000/api/load-progress?filename=../Results/path/to/file.json')
  - template_literals: Do NOT use ${...} interpolations inside <script> blocks
  - multiple_comparison_paths: Both entityWeightedComparison AND compareIndividualToEntityDirect are active
  - code_path_verification: Use diagnostic console.logs before making changes
  - oauth_token_expiration: Tokens expire after 1 hour - long operations must save promptly
  - function_return_values: Always assign return values (e.g., window.unifiedEntityDatabase = buildUnifiedEntityDatabase())
  - saved_vs_memory: Always rebuild EntityGroup database to test code changes; loaded files reflect OLD code
  - database_key_generation: NEVER generate keys twice - use keys that already exist in database
  - regex_metacharacters: In JavaScript regex, ^ is a metacharacter - escape as \^ for literal match
  - NO_CACHE_BUST_QUERYSTRINGS: NEVER add ?timestamp to script URLs - use hard refresh (Ctrl+Shift+R) instead
  - google_drive_rate_limits: Max ~3 writes/sec sustained; process in batches of 400 max; save index incrementally
  - two_object_reference_trap: When loading individual file on selection creates DIFFERENT object than bulk-loaded dbEntry.object; edits to one don't affect the other
  - index_corruption_risk: Edit operations that save index may overwrite valid fileIds with nulls if index not properly loaded first
  - google_drive_filename_chars: Characters / \ < > : " | ? * are invalid in filenames; use normalizeForGoogleDrive() when comparing bulk keys to folder names
  - _saveIndex_corruption: db.saveObject/add/changePrimaryAlias call _saveIndex() which overwrites Drive index with db.entries (bulk-loaded with fileId:null). IndividualNameBrowser emulates these operations with direct _updateObjectFile/_createObjectFile calls, bypassing _saveIndex(). New items use addEntryToGoogleDriveIndex() for targeted updates.

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
  reference_phonebookIntegration.md: IN_PROGRESS - Supplemental Data Integration (v3.0 - Section 4 revised Feb 3)
  reference_individualNameDatabase.md: COMPLETE - IndividualNameDatabase system documentation
  reference_moveAliasFeaturePlan.md: COMPLETE - Move Alias feature (delete becomes move)
  reference_streetNameAliasArchitecture.md: StreetName architecture (Phases 0-5 COMPLETE)
  reference_fireNumberCollisionArchitecture.md: Fire number collision system (COMPLETE)
  reference_aliasedTermDatabasePlan.md: AliasedTermDatabase class architecture (COMPLETE)
  reference_codeQualityRoadmap.md: Code improvements (CQ-1 COMPLETE, see doc for future tasks)

HISTORICAL_DOCUMENTATION:
  reference_phase5_streetNameComparison.md: Phase 5 comparison design (historical)
  reference_phase5_entityRebuildPlan.md: Entity rebuild plan (historical)
  reference_phase5_regression_investigation.md: Phase 5 regression analysis (historical - resolved)
  reference_fireNumberCollisionDatabase.md: Collision database design (historical)

SESSION_HISTORY:
  BIRAVA2025/reference_sessionHistory_2026_February.md: Session 93+ (current)
  BIRAVA2025/reference_sessionHistory_2026_January.md: Sessions 81-92 detailed logs
  reference_sessionHistory.md: December 2025 and earlier

ARCHIVED_DOCUMENTATION:
  archive/reference_docs_2025/: 49 original reference files
  archive/integration_2025/: 6 obsolete integration tools

CORE_CODE_LOCATIONS:
  entity_system: scripts/objectStructure/ (entityClasses.js, contactInfo.js, aliasClasses.js, entityGroup.js)
  matching_system: scripts/matching/ (entityGroupBuilder.js, universalEntityMatcher.js, matchOverrideManager.js)
  browsers: scripts/ (entityGroupBrowser.js, unifiedEntityBrowser.js, entityRenderer.js, streetNameBrowser.js)
  serialization: scripts/utils/classSerializationUtils.js
  export: scripts/export/ (csvReports.js, lightweightExporter.js)
  diagnostics: scripts/diagnostics/ (entityComparison.js, auditOverrideRules.js, streetArchitectureBaseline.js, individualIdentificationResearch.js)
  address_processing: scripts/address/addressProcessing.js
  street_infrastructure: scripts/ (streetNameBrowser.js, streetNameDatabaseConverter.js, streetTypeAbbreviations.js)
```

---

## CURRENT_STATUS_TRACKER
```yaml
completed_projects:
  - Fire Number Collision Integration: reference_fireNumberCollisionArchitecture.md
  - StreetName Alias Architecture (Phases 0-5): reference_streetNameAliasArchitecture.md
  - AliasedTermDatabase Class (Task 2): reference_aliasedTermDatabasePlan.md
  - Database Maintenance Collapsible Box (Task 1): (no reference doc)
  - Code Quality CQ-1: reference_codeQualityRoadmap.md
  - IndividualNameDatabase System: reference_individualNameDatabase.md
  - Move Alias Feature: reference_moveAliasFeaturePlan.md
  - Section 7 IndividualName Lookup: reference_phonebookIntegration.md
  - EntityGroup Member Collections: reference_entityGroupCollections.md (includes Collections Report)

active_project:
  name: Task 3 - Supplemental Data Integration
  status: IN_PROGRESS - Section 4 plan revised, ready to begin
  reference: reference_phonebookIntegration.md (v3.0)
  next_action: Begin Section 4 Phase A (Foundation)

current_system_state:
  entity_groups: 1875
  entities: 4104
  individual_name_entries: 2108
  google_drive_folder_files: 2108
  index_entries: 2108
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

PURPOSE_OF_CLAUDE_MD:
  primary_purpose: |
    CLAUDE.md is written BY an AI FOR an AI to read at the start of each session.
    It provides continuity between sessions - the next Claude instance needs to
    quickly understand: what we're doing, where we are, and what to do next.

  what_belongs_here:
    - Process rules that apply to ALL sessions (ROOT_CAUSE_DEBUGGING, COMPLETION_VERIFICATION)
    - Current work context (WHAT we're doing, WHERE we are, WHAT'S next)
    - Terminology definitions for quick lookup
    - Critical technical patterns and lessons learned
    - Pointers to reference documents (not the content itself)
    - Current status summary (not detailed history)

  what_does_NOT_belong_here:
    - Detailed session-by-session work logs (offload to reference_sessionHistory_*.md)
    - Implementation details for completed features (offload to feature reference docs)
    - Code snippets longer than 5 lines (use file:line references instead)
    - Version notes history beyond the current version
    - Any content that is "nice to have" but not needed for session continuity

MANDATORY_OFFLOADING_RULES:
  session_history:
    rule: Session details become OBSOLETE once the next session reads and uses them
    action: After each session, move detailed session logs to reference_sessionHistory_*.md
    keep_in_claude_md: Only current status and immediate next action

  feature_documentation:
    rule: Completed features should have their own reference documents
    action: Create reference_<featureName>.md for any feature requiring >50 lines of documentation
    keep_in_claude_md: Only status (USER_VERIFIED_WORKING) and pointer to reference doc

  implementation_details:
    rule: Details about HOW something was implemented belong in reference docs, not here
    action: Offload to the relevant reference document
    keep_in_claude_md: Only WHAT was done and WHERE to find details

END_OF_SESSION_CHECKLIST:
  before_ending_session:
    1: Review CLAUDE.md length - if approaching 400 lines, offload content
    2: Move completed session details to appropriate reference document
    3: Update CURRENT_WORK_CONTEXT to reflect where we stopped
    4: Update CURRENT_STATUS_TRACKER with any status changes
    5: Ensure next session can start with just CLAUDE.md (no hunting for context)

  reference_document_updates:
    - Update the relevant reference doc with current status
    - Add session details to reference_sessionHistory_*.md
    - Keep reference docs current - they are the authoritative source for details

SELF_CHECK_BEFORE_UPDATING_CLAUDE_MD:
  ask_yourself:
    1: Is this information needed for EVERY future session, or just context for what we did?
    2: Could the next AI instance function without this specific detail?
    3: Does this belong in a reference document instead?
    4: Am I adding detail that will be obsolete after the next session reads it?
  if_any_answer_suggests_offload: Move to appropriate reference document

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
last_updated: February_3_2026
document_version: 189.0_SESSION94_SECTION4_PLAN_REVISED
previous_version: 188.0_SESSION93_COLLECTIONS_REPORT_AND_DELETE_BUTTON

version_notes: |
  Version 189.0 - Session 94: Section 4 Plan Completely Revised
  - Section 4 goal changed: was StreetName enrichment, now EntityGroup augmentation
  - reference_phonebookIntegration.md rewritten to v3.0 with full specifications
  - 26 tasks across 5 phases (A-E) with integrated incremental testing
  - Documented: match types, priority rules, phone Aliased structure, household propagation
  - Architecture designed for reuse (phonebook + email use same pattern)
  - Next: Begin Section 4 Phase A (Foundation)

working_directory: /home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025
platform: linux
```
