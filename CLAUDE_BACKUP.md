# BIRAVA2025_AI_CONTINUITY_KNOWLEDGE_BASE

## AI_READING_INSTRUCTIONS
```yaml
read_order: [ROOT_CAUSE_DEBUGGING_RULE, COMPLETION_VERIFICATION_RULE, CURRENT_WORK_CONTEXT, TERMINOLOGY, MANDATORY_COMPARETO_ARCHITECTURE]
focus_section: ROOT_CAUSE_DEBUGGING_RULE_then_COMPLETION_VERIFICATION_RULE_then_CURRENT_WORK_CONTEXT
processing_directive: ignore_visual_formatting_process_semantic_content_only
last_updated: 2025-12-24
version: 85.0_REGRESSION_TEST_IN_PROGRESS
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
# December 27, 2025 - Session 20

immediate_status: ALL_CLEANUP_PHASES_COMPLETE
current_focus: Code cleanup plan fully executed
next_action: User to decide next priorities

# Session 20 Summary
session20_work:
  task_2.3_entity_label_number:
    action: Removed entity.label and entity.number from Entity constructor
    file_modified: scripts/objectStructure/entityClasses.js
    lines_removed: 3 (comment + two property initializations)
    rationale: |
      - Properties were never part of documented architecture
      - Only initialized to null, never populated with data
      - Only consumer was archived visionAppraisalBrowser.js
      - No replacement needed - they served no functional purpose
    status: USER_VERIFIED_WORKING

  phase4_browser_consolidation:
    task_4.1_entityBrowser: Archived to archive/browser_2025/ - USER_VERIFIED_WORKING
    task_4.1_dataSourceManager: Archived to archive/browser_2025/ (unused abstraction layer) - USER_VERIFIED_WORKING
    task_4.2_visionAppraisalBrowser: Archived to archive/browser_2025/ - USER_VERIFIED_WORKING
    task_4.3_extractNameFromEntity: Already archived with nameAnalysisForMatching.js in Phase 3

  archive_browser_2025_contents:
    - entityBrowser.js: Legacy Bloomerang-only browser, superseded by unifiedEntityBrowser.js
    - dataSourceManager.js: Unused abstraction layer, never integrated into production workflow
    - visionAppraisalBrowser.js: Legacy VA browser, confirmed dead code via diagnostic testing

# Session 19 Summary (Dec 26)
session19_work:
  phase2_session19_additions:
    task_2.1_sampleDataLoader: Archived to archive/deprecated_2025/ - USER_VERIFIED_WORKING
    task_2.2_deprecated_lookups: Deleted getEntityBySourceTypeAndValue and getEntityBySourceAndLocationId - USER_VERIFIED_WORKING

  phase3_completed:
    task_3.1_legacySerialize: Removed 25+ methods from 4 files (householdInformation.js, contactInfo.js, entityClasses.js, aliasClasses.js) - USER_VERIFIED_WORKING
    task_3.2_legacyInfo: KEEP - speculative structure for future legacy source data (user decision)
    task_3.3_nameAnalysisForMatching: Archived to archive/deprecated_2025/ - USER_VERIFIED_WORKING

# Key Generation Architecture (RESOLVED Dec 26)
key_generation_resolution:
  status: RESOLVED_BY_USER_DECISION
  decision: Option 3 - Keep intentional separation, no changes needed
  rationale: |
    Two key formats serve different purposes:
    - generateEntityKey() → internal/transient keys for intermediate processing
    - generateUnifiedEntityKey() → final unified keys for production database
    Production workflow always regenerates unified keys, so no functional risk exists.

# Session 18 Summary
session18_work:
  serialize_bug_fixed:
    symptom: "Save as New Files" threw "groupDb.serialize is not a function"
    root_cause: |
      ContactInfo.deserializeBase() hardcoded Address class for primaryAddress,
      but serialized data has type 'Aliased' (wrapper class). Address.deserialize()
      threw "Invalid Address serialization format" because data.type !== 'Address'.
    fix_applied:
      - Added Info.deserializeByType() in contactInfo.js - dynamic dispatch using CLASS_REGISTRY
      - Updated primaryAddress/secondaryAddress deserialization to use deserializeByType()
      - Updated loadEntityGroupDatabase() to deserialize JSON into EntityGroupDatabase instance
    files_modified: [scripts/objectStructure/contactInfo.js, scripts/entityGroupBrowser.js]
    status: USER_TESTED_WORKING

  baseline_regression_test: ALL_12_TESTS_PASSED

  phase1_file_cleanup:
    task_1.1_claude_backups: COMPLETE (19 files deleted, kept CLAUDE.md and CLAUDE_BACKUP.md)
    task_1.2_obsolete_folder: COMPLETE (archived to archive/obsolete_2024/ with README)
    task_1.3_serverW_stub: COMPLETE (deleted)
    task_1.4_test_files: COMPLETE (7 files moved to scripts/testing/)
    task_1.5_documentation: COMPLETE (consolidated to reference_systemDocumentation.md, 49 files archived to archive/reference_docs_2025/)
    task_1.6_integration_folder: COMPLETE (6 files archived to archive/integration_2025/, 4 script tags removed from index.html, folder deleted)
    post_phase_regression: USER_VERIFIED_WORKING

  documentation_consolidation:
    new_file: reference_systemDocumentation.md
    content: 8-section comprehensive guide (927 lines)
    sections: [Project Overview, Architecture, Core Algorithms, Data Specs, Production Ops, Dev Principles, Apps Script, Critical Files]
    archived: 49 reference files to archive/reference_docs_2025/

  integration_folder_cleanup:
    archived_files: [matchingEngine.js, contactDiscovery.js, nameAnalysis.js, testPlugin.js, dualSourceEntityCapacityAssessment.js, visionAppraisalFieldAudit.js]
    reason: Early-stage tools superseded by current entityGroupBuilder/universalEntityMatcher architecture
    index_html_updated: Removed 4 script tags

  phase2_completed:
    task_2.1_readBloomerang: sampleDataLoader.js archived to archive/deprecated_2025/ - USER_VERIFIED_WORKING
    task_2.2_deprecated_lookups: getEntityBySourceTypeAndValue and getEntityBySourceAndLocationId deleted - USER_VERIFIED_WORKING
    task_2.3_entity_label_number: Deferred to Phase 4 (used in legacy visionAppraisalBrowser.js)
    task_2.4_key_generation: RESOLVED - keep intentional separation (user decision)

# Session 17 Summary (Dec 24)
session17_work:
  baseline_regression_test:
    test_script_created: reference_baselineRegressionTestScript.md
    quick_tests_1_to_3: ALL_PASSED
    standard_tests_4_to_7: ALL_PASSED
    full_test_8: PASSED (unified database save/load with test file)
    full_test_9: BLOCKED_BY_BUG (fixed in Session 18)
    full_tests_10_to_12: PENDING

  baseline_values_recorded:
    unified_entity_count: 4099
    entitygroup_count_full: 1972
    force_match_rules: 5
    force_exclude_rules: 53
    mutual_exclusion_sets: 2

  sample_size_feature_added:
    purpose: Enable faster testing (200 sample = ~2 min vs 25 min full build)
    files_modified: [index.html, scripts/entityGroupBrowser.js]
    status: USER_TESTED_WORKING

  production_file_ids:
    unified_database: "1Z2V4Pi8KoxUR9B47KffEQI6gCs7rOS2Y"
    entitygroup_database: "120z4Q_JVWjSij2BOyv93s_XnJ-SLqR1N"
    entitygroup_reference: "10LPpCPBWkc8ZQDqCake-0QenVWjCRpdd"

  test_file_ids:
    unified_database_test: "1a1pTRw7AXK_QPU26AsGPcb3UG2BskP8c"

# Session 16 Summary (earlier Dec 24)
session16_work:
  phase0_tasks_completed: [0.1, 0.2, 0.3, 0.4, 0.5]
  browser_ui_reorganization: USER_TESTED_WORKING
  reference_productionProcess_updated: Phase A/B structure documented

# Session 15 Summary (Dec 23)
session15_work:
  git_milestone_created:
    tag: v1.0.0-stable-dec-23-2025
    purpose: Safe rollback point before code cleanup
  cleanup_plan_created: reference_codeCleanupPlan.md

# Resolved Features
resolved_features:
  step9_household_pulling: RESOLVED
  phase_order_swap: RESOLVED (VA phases 1-3, Bloomerang phases 4-6)

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
PRIMARY_DOCUMENTATION:
  reference_systemDocumentation.md: Consolidated system guide (8 sections, 927 lines)
  contents: [Architecture, Algorithms, Data Specs, Production Ops, Dev Principles, Apps Script, Critical Files]
  READ_WHEN: Need any system documentation - this is the single authoritative source

ARCHIVED_DOCUMENTATION:
  archive/reference_docs_2025/: 49 original reference files (preserved for historical detail)
  archive/integration_2025/: 6 obsolete integration tools
  archive/obsolete_2024/: Old obsolete folder contents

CODE_CLEANUP:
  archive/reference_docs_2025/reference_codeCleanupPlan.md: 5-phase cleanup plan
  phases: [Phase 0 COMPLETE, Phase 1 COMPLETE, Phase 2 Deprecated Functions, Phase 3 Orphaned Code, Phase 4 Browser Consolidation]
  rollback_tag: v1.0.0-stable-dec-23-2025

CORE_CODE_LOCATIONS:
  entity_system: scripts/objectStructure/ (entityClasses.js, contactInfo.js, aliasClasses.js, entityGroup.js)
  matching_system: scripts/matching/ (entityGroupBuilder.js, universalEntityMatcher.js, matchOverrideManager.js)
  browsers: scripts/ (entityGroupBrowser.js, unifiedEntityBrowser.js, entityRenderer.js)
  serialization: scripts/utils/classSerializationUtils.js
  export: scripts/export/lightweightExporter.js

GOOGLE_APPS_SCRIPT:
  googleAppsScripts/: Folder containing Apps Script code for Sheets integration
```

---

## CURRENT_STATUS_TRACKER
```yaml
current_work:
  phase0_status: COMPLETE
  phase1_status: COMPLETE (all 6 tasks done, post-phase regression passed)
  phase2_status: COMPLETE (all 4 tasks done - 2.1 archived, 2.2 deleted, 2.3 removed, 2.4 resolved)
  phase3_status: COMPLETE (3.1 legacySerialize removed, 3.2 legacyInfo KEEP, 3.3 nameAnalysis archived)
  phase4_status: COMPLETE (all 3 browser files archived to archive/browser_2025/, USER_VERIFIED_WORKING)
  ALL_PHASES: COMPLETE - Code cleanup plan fully executed
  code_cleanup_plan: archive/reference_docs_2025/reference_codeCleanupPlan.md

regression_test_status:
  test_1_server_start: PASSED
  test_2_ui_structure: PASSED
  test_3_load_unified_db: PASSED (4099 entities)
  test_4_entitygroup_build: PASSED (sample mode working)
  test_5_unified_entity_browser: PASSED
  test_6_entitygroup_browser: PASSED
  test_7_match_override_verification: PASSED (5/53/2 rules)
  test_8_unified_db_save_load: PASSED (using test file)
  test_9_entitygroup_save_load: PASSED (bug fixed Dec 26)
  test_10_csv_export: PASSED
  test_11_lightweight_export: PASSED
  test_12_assessment_report: PASSED
  ALL_TESTS: PASSED (Dec 26, 2025)

verified_features:
  browser_ui_reorganization: USER_TESTED_WORKING (Dec 24)
  sample_size_feature: USER_TESTED_WORKING (Dec 24)
  entitygroup_save_load_roundtrip: USER_TESTED_WORKING (Dec 26)
  csv_export: USER_TESTED_WORKING (Dec 26)
  lightweight_export: USER_TESTED_WORKING (Dec 26)
  assessment_report: USER_TESTED_WORKING (Dec 26)
  step9_household_pulling: RESOLVED
  phase_order_swap: RESOLVED (VA phases 1-3, Bloomerang phases 4-6)
  household_cross_reference_keys: RESOLVED (informally verified Dec 22)
  match_override_system: ALL_PHASES_USER_VERIFIED_WORKING
  mutual_rows_feature: USER_VERIFIED_WORKING
  one_to_many_expansion: USER_VERIFIED_WORKING
  lightweight_exporter_v2: USER_VERIFIED_WORKING
  csv_currency_parsing: USER_VERIFIED_WORKING
  same_location_fix: USER_VERIFIED_WORKING
  all_foundational_layers: USER_VERIFIED_WORKING

pending_execution:
  - None - all cleanup tasks complete
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
last_updated: December_27_2025
document_version: 93.0_ALL_CLEANUP_COMPLETE
previous_version: 92.0_PHASE4_COMPLETE

version_notes: |
  Version 93.0 - Session 20 Task 2.3 complete, ALL CLEANUP DONE:
  - Removed entity.label and entity.number from Entity constructor (entityClasses.js)
  - Properties were never populated, only consumer was archived visionAppraisalBrowser.js
  - USER_VERIFIED_WORKING
  - ALL code cleanup phases (0-4) and all tasks now complete
  - Code cleanup plan from Dec 23 fully executed

working_directory: /home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025
platform: linux
```
