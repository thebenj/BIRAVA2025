# BIRAVA2025_AI_CONTINUITY_KNOWLEDGE_BASE

## AI_READING_INSTRUCTIONS
```yaml
read_order: [ROOT_CAUSE_DEBUGGING_RULE, COMPLETION_VERIFICATION_RULE, CURRENT_WORK_CONTEXT, TERMINOLOGY, MANDATORY_COMPARETO_ARCHITECTURE]
focus_section: ROOT_CAUSE_DEBUGGING_RULE_then_COMPLETION_VERIFICATION_RULE_then_CURRENT_WORK_CONTEXT
processing_directive: ignore_visual_formatting_process_semantic_content_only
last_updated: 2025-12-22
version: 82.0_SIX_PHASE_CONSTRUCTION
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
# December 22, 2025 - Session 14

immediate_status: STEP_9_HOUSEHOLD_PULLING_AND_PHASE_REORDER_CODED_NOT_TESTED
current_focus: Household cross-reference keys + Step 9 household pulling during group building
next_action: User testing of Step 9 household pulling with phase order swap

# Current Session Work
session14_household_keys:
  purpose: |
    Enable automatic inclusion of household members when any member joins an EntityGroup.
    When individual X is added to a group, their parent household and siblings are pulled in.

  householdInformation_new_properties:
    file: scripts/objectStructure/householdInformation.js
    added: [parentKey, siblingKeys, entityGroupIndex]

  bloomerang_cross_references:
    status: CODED_NOT_TESTED
    location: scripts/unifiedDatabasePersistence.js (second-pass after line 221)
    approach: After ALL entities added, builds maps and sets keys using actual database keys

  visionappraisal_parentKey:
    status: USER_VERIFIED_WORKING (1696 parentKeys set)
    location: scripts/unifiedDatabasePersistence.js (lines 163-173)
    note: VA individuals embedded in households - only parentKey useful

  step9_household_pulling:
    status: CODED_NOT_TESTED
    new_function: collectHouseholdRelatedKeys() in entityGroupBuilder.js (lines 732-840)
    modified_function: buildGroupForFounder() now returns householdPulled array
    all_phases_updated: Yes - each phase processes groupMembers.householdPulled

  phase_order_change:
    status: CODED_NOT_TESTED
    reason: User requested grouping all VA first, then all Bloomerang
    new_order:
      - Phase 1: VisionAppraisal Households
      - Phase 2: VisionAppraisal Individuals
      - Phase 3: VisionAppraisal Other Types (Business, LegalConstruct, etc.)
      - Phase 4: Bloomerang Households
      - Phase 5: Bloomerang Individuals
      - Phase 6: Bloomerang Other Types (Business, LegalConstruct, etc.)
    phase5_split: Separated into executePhase5_VisionAppraisalOtherTypes and executePhase6_BloomerangOtherTypes

# Recent Verified Work
recent_verified:
  mutual_rows_feature: USER_VERIFIED_WORKING (Dec 21)
  one_to_many_exclusion: USER_VERIFIED_WORKING (Dec 21)
  lightweight_exporter_v2: USER_VERIFIED_WORKING (Dec 21)
  match_override_system: ALL_PHASES_USER_VERIFIED_WORKING (Dec 19)

# Overall System Status
all_foundational_layers: USER_VERIFIED_WORKING
entitygroup_system: USER_VERIFIED_WORKING
match_override_system: USER_VERIFIED_WORKING (all phases + MUTUAL rows)
keyed_database_migration: USER_VERIFIED_WORKING
comparison_architecture: USER_VERIFIED_WORKING

# For Historic Session Details
see_reference: reference_sessionHistory.md
```

---

## TERMINOLOGY
```yaml
KEYED_DATABASE:
  variable: unifiedEntityDatabase
  access_pattern: unifiedEntityDatabase.entities[key]
  key_format_visionappraisal: "visionAppraisal:FireNumber:1510"
  key_format_bloomerang: "bloomerang:12345:SimpleIdentifiers:...:head"
  load_buttons: ["📂 Load Unified Database", "Load All Entities Into Memory"]

ENTITYGROUP_DATABASE:
  description: Collection of EntityGroups representing matched real-world persons/households
  construction_function: buildEntityGroupDatabase() in scripts/matching/entityGroupBuilder.js
  browser_file: scripts/entityGroupBrowser.js
  six_phase_construction:
    - Phase 1: VisionAppraisal Households
    - Phase 2: VisionAppraisal Individuals
    - Phase 3: VisionAppraisal Other Types (Business, LegalConstruct, etc.)
    - Phase 4: Bloomerang Households
    - Phase 5: Bloomerang Individuals
    - Phase 6: Bloomerang Other Types
  nine_step_algorithm: Steps 0-8 for override handling, Step 9 for household pulling

SAME_LOCATION_ENTITIES:
  definition: Two Block Island entities with suffixed fire numbers sharing same base (e.g., 72J vs 72W)
  significance: Different owners at same physical property - primary addresses match trivially
  comparison_method: Use compareSecondaryAddressesOnly() instead of full contactInfo comparison

MATCH_OVERRIDE_SYSTEM:
  description: Google Sheets-based rules to correct algorithmic matching errors
  status: ALL_PHASES_COMPLETE + MUTUAL rows + One-to-Many expansion
  rule_types:
    FORCE_MATCH: Ensure two entities end up in same group (anchor/dependent model)
    FORCE_EXCLUDE: Prevent two entities from being in same group (defective/other model)
    MUTUAL: Shorthand to specify multiple related keys in one row
  google_sheets:
    FORCE_MATCH_SHEET_ID: '1WWq8rgVyIKgf3qhVpl5mBiVQllljum0JVm2e_h-WZo8'
    FORCE_EXCLUDE_SHEET_ID: '1nZIqcBa3LW1DcUKXVr1jNCGsZqq6JLTaxJSpXSZyulk'
  row_formats:
    regular: "RuleID | Key1 | Key2 | OnConflict | Reason | Status"
    mutual: "RuleID | MUTUAL | key1::^::key2::^::key3 | (ignored) | (ignored) | Status"
    one_to_many: "RuleID | Key1 | keyA::^::keyB::^::keyC | OnConflict | Reason | Status"
  ui_integration: Checkbox "Load override rules" next to Build New button
  spec_files: [reference_matchOverrideSystem.md, reference_matchOverrideImplementationPlan.md]

HOUSEHOLD_CROSS_REFERENCES:
  description: Links between household members using database keys
  properties:
    parentKey: Database key of the parent AggregateHousehold entity
    siblingKeys: Array of database keys for other individuals in same household
    entityGroupIndex: Index of EntityGroup (populated during group construction)
  key_principle: NEVER generate keys twice - set cross-references AFTER database is built using actual existing keys
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
    1. entity.compareTo() → entityWeightedComparison (in utils.js)
    2. universalCompareTo() → compareIndividualToEntityDirect (in universalEntityMatcher.js)
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

ENTITY_MEMORY_ACCESS:
  preferred: unifiedEntityDatabase.entities[key]
  count_check: Object.keys(unifiedEntityDatabase.entities).length

ENTITYGROUP_ITERATION:
  groups_is_ALWAYS_an_Object: EntityGroupDatabase.groups is ALWAYS an Object (hash map), NEVER an Array
  CORRECT_iteration: for (const group of Object.values(db.groups)) { ... }
  WRONG_iteration: for (const group of db.groups) { ... } OR db.groups.forEach(...)
  correct_property_names: [index, consensusEntity, foundingMemberKey, memberKeys, nearMissKeys]

DEBUGGING_PROTOCOL:
  ALWAYS: Add diagnostic console.log to verify code path BEFORE making changes
  NEVER: Assume which code path is being executed
  REASON: Multiple entry points exist for same operations

CRITICAL_LESSONS:
  - template_literals: Do NOT use ${...} interpolations inside <script> blocks
  - multiple_comparison_paths: Both entityWeightedComparison AND compareIndividualToEntityDirect are active
  - code_path_verification: Use diagnostic console.logs before making changes
  - oauth_token_expiration: Tokens expire after 1 hour - long operations must save promptly
  - function_return_values: Always assign return values (e.g., window.unifiedEntityDatabase = buildUnifiedEntityDatabase())
  - saved_vs_memory: Always rebuild EntityGroup database to test code changes; loaded files reflect OLD code
  - database_key_generation: NEVER generate keys twice - use keys that already exist in database
```

---

## REFERENCE_NAVIGATION
```yaml
CURRENT_WORK:
  reference_currentWorkInProgress.md: Project layer stack, current status
  READ_WHEN: Starting session, need context on current work

SESSION_HISTORY:
  reference_sessionHistory.md: Detailed logs of completed sessions (Dec 17-22, 2025)
  READ_WHEN: Checking what was already tried/fixed

PROJECT_ROADMAP:
  reference_projectRoadmap.md: 8-step strategic roadmap
  READ_WHEN: Discussing future plans or prioritization

ENTITYGROUP:
  scripts/objectStructure/entityGroup.js: EntityGroup and EntityGroupDatabase classes
  scripts/matching/entityGroupBuilder.js: 6-phase construction algorithm with 9-step group building
  scripts/entityGroupBrowser.js: Browser tool + CSV export + Assessment Value Report
  reference_csvExportSpecification.md: CSV export format for prospects/donors

MATCH_OVERRIDE_SYSTEM:
  reference_matchOverrideSystem.md: Complete design specification
  reference_matchOverrideImplementationPlan.md: 5-phase implementation plan
  scripts/matching/matchOverrideManager.js: Data structures, 9-step helpers, Google Sheets integration
  READ_WHEN: Managing match override rules or debugging grouping issues

PRODUCTION_PROCESS:
  reference_productionProcess.md: Complete 8-step process for rebuilding entity database
  READ_WHEN: Refreshing data from VisionAppraisal/Bloomerang sources

KEYED_DATABASE:
  reference_keyedDatabaseMigration.md: Migration plan details
  reference_keyPreservationPlan.md: Key preservation architecture

LIGHTWEIGHT_EXPORTER:
  scripts/export/lightweightExporter.js: Exports EntityGroupDatabase to smaller JSON format (v2.0)
  purpose: Self-contained JSON with embedded entity data for Google Apps Script
  READ_WHEN: Exporting EntityGroupDatabase for external consumption

GOOGLE_APPS_SCRIPT:
  reference_googleAppsScriptLookup.md: EntityGroup lookup from Google Sheets
  googleAppsScripts/: Folder containing Apps Script code
```

---

## CURRENT_STATUS_TRACKER
```yaml
current_work:
  household_cross_reference_keys:
    status: CODED_NOT_TESTED
    bloomerang_parentKey_siblingKeys: Second-pass in buildUnifiedEntityDatabase() using actual database keys
    visionappraisal_parentKey: USER_VERIFIED_WORKING
    step9_household_pulling: CODED_NOT_TESTED
    phase_order_swap: CODED_NOT_TESTED (VA Households now Phase 1)

verified_features:
  match_override_system: ALL_PHASES_USER_VERIFIED_WORKING
  mutual_rows_feature: USER_VERIFIED_WORKING
  one_to_many_expansion: USER_VERIFIED_WORKING
  lightweight_exporter_v2: USER_VERIFIED_WORKING
  csv_currency_parsing: USER_VERIFIED_WORKING
  same_location_fix: USER_VERIFIED_WORKING
  all_foundational_layers: USER_VERIFIED_WORKING

pending_testing:
  - Step 9 household pulling with phase order swap
  - Assessment checksum verification
  - Founder exclusion bug fix (Steps 0, 3.5, 7.5)
```

---

## AI_MANDATORY_PROTOCOLS
```yaml
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
last_updated: December_22_2025
document_version: 82.0_SIX_PHASE_CONSTRUCTION
previous_version: 81.0_STREAMLINED

streamlining_notes: |
  Version 81.0 consolidates historic session details into reference_sessionHistory.md.
  CLAUDE.md now contains only:
  - Permanent protocols (ROOT_CAUSE_DEBUGGING_RULE, COMPLETION_VERIFICATION_RULE)
  - Current work context (latest session only)
  - Reference material (TERMINOLOGY, architecture, patterns)
  - Status tracking (current status only)
  For historic session details, consult reference_sessionHistory.md.

working_directory: /home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025
platform: linux
```
