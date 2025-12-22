# BIRAVA2025_AI_CONTINUITY_KNOWLEDGE_BASE

## AI_READING_INSTRUCTIONS
```yaml
read_order: [ROOT_CAUSE_DEBUGGING_RULE, COMPLETION_VERIFICATION_RULE, CURRENT_WORK_CONTEXT, TERMINOLOGY, MANDATORY_COMPARETO_ARCHITECTURE]
focus_section: ROOT_CAUSE_DEBUGGING_RULE_then_COMPLETION_VERIFICATION_RULE_then_CURRENT_WORK_CONTEXT
processing_directive: ignore_visual_formatting_process_semantic_content_only
last_updated: 2025-12-20
version: 76.0_LIGHTWEIGHT_EXPORTER_COMPLETE
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

EXAMPLE_OF_WRONG_APPROACH:
  scenario: "window.resolveComparisonCalculator is not a function"
  WRONG_fix: "Add 'if (typeof window.resolveComparisonCalculator === 'function')' to skip the call"
  why_wrong: "This masks the real problem (utils.js syntax error preventing function export)"

EXAMPLE_OF_CORRECT_APPROACH:
  scenario: "window.resolveComparisonCalculator is not a function"
  CORRECT_step_1: "Add diagnostic log to check if function exists at script load time"
  CORRECT_step_2: "Add diagnostic log to check if function exists at call time"
  CORRECT_step_3: "Discover utils.js has syntax error preventing complete load"
  CORRECT_step_4: "Fix the syntax error in utils.js"
  why_correct: "Addresses actual root cause - nested comment syntax error"

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
# December 20, 2025 - Session 11

immediate_status: LIGHTWEIGHT_EXPORTER_READY_FOR_USER_VERIFICATION
current_focus: Lightweight EntityGroupDatabase exporter for Google Apps Script
next_action: User verify lightweight export output is acceptable

# Session 11 - Lightweight EntityGroupDatabase Exporter
session11_work:
  lightweight_exporter:
    status: READY_FOR_USER_VERIFICATION
    purpose: |
      Export EntityGroupDatabase to a smaller JSON format suitable for Google Apps Script.
      Strips unnecessary data (alternatives, sourceMaps, comparisonWeights, etc.)
      while preserving essential data for lookups.

    file_created: scripts/export/lightweightExporter.js
    html_updated: index.html (added script tag after entityGroupBrowser.js)

    size_reduction_achieved:
      full_database: 16.55 MB
      lightweight_export: 5.62 MB
      reduction_percent: 66.0%

    transformations:
      AttributedTerm: Reduced to just the term value (string/number)
      Aliased_and_subclasses: Reduced to primaryAlias.term value
      IndividualName: Preserved as structured object with name components
      HouseholdName: Preserved as structured object
      Address: Preserved as structured object with address components
      alternatives_homonyms_synonyms_candidates: Stripped entirely
      sourceMap: Stripped entirely
      comparisonWeights: Stripped entirely
      comparisonCalculatorName: Stripped entirely

    functions_exposed:
      - exportLightweightEntityGroupDatabase(db): Returns lightweight plain object
      - exportLightweightJSON(db): Returns JSON string
      - downloadLightweightExport(db, filename): Downloads as file
      - compareSizes(db): Compares full vs lightweight sizes

    usage:
      console: |
        downloadLightweightExport(entityGroupBrowser.loadedDatabase, 'myExport.json');
        compareSizes(entityGroupBrowser.loadedDatabase);

    key_fixes_during_development:
      fix_1_type_detection: |
        Initial version failed to strip Aliased objects because loaded JSON data has
        obj.type property (e.g., "type":"Aliased") rather than constructor.name.
        Fixed by adding structural detection shortcuts that check for characteristic
        properties (primaryAlias.term, term, identifier, alternatives) rather than
        relying solely on type name matching.
      fix_2_assessment_appraisal: |
        Added assessmentValue and appraisalValue to transformOtherInfo() to capture
        the assessment/appraisal data added in Session 10.
      fix_3_aliased_addresses: |
        primaryAddress in consensus entities is Aliased-wrapped. Changed
        transformContactInfo to use transformToLightweight for addresses.
        Updated term extraction shortcuts to recursively transform object terms
        (like Address objects) instead of returning them raw.

# Session 10 - Issues Resolved (previous session)
session10_work:
  csv_currency_parsing_fix:
    status: USER_VERIFIED_WORKING
    problem: |
      Assessment/appraisal values like "$454,500" were being truncated to 3-digit numbers
      because visionAppraisal.js used naive record.split(',') which broke on commas in currency values.
    root_cause: |
      User correctly identified the issue by browsing entities in Unified Entity Browser.
    fix_implemented:
      file: scripts/dataSources/visionAppraisal.js
      changes:
        - Added parseCSVWithCurrencyValues() method (lines 142-224)
        - Method separates quoted CSV content from trailing googleFileId
        - Scans backwards to find $-prefixed currency values
        - Recombines comma-split currency parts into complete values
        - Returns properly structured fields array with assessment[11] and appraisal[12]
    verification: User confirmed assessment/appraisal values now display correctly in Unified Entity Browser

  otherinfo_display_issue:
    status: USER_VERIFIED_WORKING
    problem: |
      When viewing VisionAppraisal member details from EntityGroup browser, otherInfo was null.
      User reported entities in Unified Entity Browser had otherInfo, but EntityGroup member
      view showed null.
    diagnosis_process: |
      1. Added diagnostic logging to viewMemberEntityDetails() and Entity.deserialize()
      2. Discovered unifiedEntityDatabase.entities had otherInfo: null after loading
      3. User confirmed the saved JSON file DID contain otherInfo with assessmentValue
      4. Traced to wrong file ID in input field
    root_cause: |
      The "Load Unified Database" button was loading an OLD file ID (1Z2V4Pi8KoxUR9B47KffEQI6gCs7rOS2Y)
      instead of the current file with otherInfo data (19cgccMYNBboL07CmMP-5hNNGwEUBXgCI).
      The input field had stale file ID, possibly from localStorage persistence.
    resolution: User changed input field to correct file ID, otherInfo now displays correctly
    lesson_learned: |
      When data appears missing after deserialization, verify the correct file is being loaded.
      Multiple unified database files may exist - check timestamps and file IDs.

# Session 10 - Production Process Documentation (earlier in session)
session10_earlier:
  production_process_documented:
    status: CODED_NOT_TESTED
    file_created: reference_productionProcess.md
    content: Complete 8-step process (Steps 0-7) for rebuilding entity database

  pid_folder_consolidation:
    status: CODED_NOT_TESTED
    problem: verification.js had hardcoded wrong folder ID
    fix: Changed to getter referencing parameters.pidFilesParents as single source of truth
    files_modified:
      - verification.js: PIDS_FOLDER now uses getter
      - cleanup.js: PIDS_FOLDER now uses getter
      - verification_es5.js: Added getPidsFolderId() function

  duplicate_analysis_buttons:
    status: CODED_NOT_TESTED
    added_to: index.html
    buttons:
      - "Analyze PID Duplicates" (analyzePIDFolder)
      - "Run PID Deduplication" (runPIDDeduplication)

  diagnostic_logging_removed:
    status: CODED_NOT_TESTED
    file: scripts/dataSources/visionAppraisalNameParser.js
    removed: "[OTHERINFO] Preserved assessment/appraisal values" console.log

  data_pipeline_verification:
    stage_2_everyThingWithPid: WORKING (has "$454,500,$454,500" values)
    stage_3_va_entities: WORKING (otherInfo has assessment/appraisal)
    stage_4_unified_database: WORKING
    stage_5_consensus: IN_PROGRESS_DIAGNOSIS

# Session 9 - Founder Exclusion Bug Fix (December 19)
session9_work:
  founder_exclusion_bug_fix:
    status: CODED_NOT_TESTED
    problem: |
      Exclusion rules involving the founder (F) were not being enforced because F is not
      included in the naturalMatches array. When Step 2 checked exclusions among natural
      matches, the founder wasn't there to trigger the exclusion check.
    solution: |
      Added three new steps to the algorithm that explicitly check exclusions against the founder:
      - Step 0: Remove natural matches that have exclusion with founder (founder always wins)
      - Step 3.5: Check founder-forced for contradictions (both force-match AND exclude with F)
      - Step 7.5: Check forcedFromNaturals for exclusions with founder
    files_modified:
      - scripts/matching/matchOverrideManager.js: Added 3 new helper methods
      - scripts/matching/entityGroupBuilder.js: Added Steps 0, 3.5, 7.5 to buildGroupForFounder()
      - reference_matchOverrideSystem.md: Updated algorithm docs to v3.0
    new_helper_methods:
      - removeExcludedWithFounder(entities, founderKey): Step 0 - filter entity objects
      - removeExcludedKeysWithFounder(keys, founderKey): Step 7.5 - filter key strings
      - removeContradictoryFounderForced(keys, founderKey): Step 3.5 - filter with warning
    key_insight: |
      Founder exclusions are ABSOLUTE - OnConflict value is ignored. The founder owns
      the group and any entity excluded with the founder cannot join that group.

# Session 8 - Phases B, C, D, E Completed (previous session)
session8_work:
  match_override_system_completion:
    status: ALL_PHASES_USER_VERIFIED_WORKING
    summary: Complete Match Override System with Google Sheets integration and UI

  phase_b_exclusions:
    status: USER_VERIFIED_WORKING
    test_performed: |
      Loaded exclusion rule FE-TEST-001 between visionAppraisal:FireNumber:1658 and
      bloomerang:439:SimpleIdentifiers:140 Foxcroft Drive, Doylestown, PA, 18901:na
    evidence:
      - Console log: "[OVERRIDE] Step 2 exclusion FE-TEST-001: visionAppraisal:FireNumber:1658 removed (DEFECTIVE_YIELDS)"
      - Phase 1 natural matches decreased from 988 to 987
      - Total groups increased from 2114 to 2115 (excluded entity formed own group)

  phase_c_force_matches:
    status: USER_VERIFIED_WORKING
    test_performed: |
      Force-matched two singleton entities: visionAppraisal:PID:278 and visionAppraisal:FireNumber:1429
    evidence:
      - Phase 2 shows "1 forced" in output
      - Both entities ended up in same group (group 421, 2 members)
      - Total groups decreased from 2114 to 2113 (two singletons merged)

  phase_d_google_sheets:
    status: USER_VERIFIED_WORKING
    sheet_ids:
      FORCE_MATCH: '1WWq8rgVyIKgf3qhVpl5mBiVQllljum0JVm2e_h-WZo8'
      FORCE_EXCLUDE: '1nZIqcBa3LW1DcUKXVr1jNCGsZqq6JLTaxJSpXSZyulk'
    test_performed: |
      Loaded 3 FORCE_MATCH and 2 FORCE_EXCLUDE rules from Google Sheets
    evidence:
      - Console: "[OVERRIDE] Loaded 3 FORCE_MATCH rules from sheet"
      - Console: "[OVERRIDE] Loaded 2 FORCE_EXCLUDE rules from sheet"
      - Phase 2 shows "3 forced" (the 3 rules connecting to FireNumber:995)
    functions_added:
      - loadRulesFromGoogleSheets() in matchOverrideManager.js
      - fetchSheetData() in matchOverrideManager.js
      - MatchOverrideManager.prototype.loadFromGoogleSheets()

  phase_e_ui_integration:
    status: CODED_READY_FOR_TESTING
    changes:
      - index.html: Added checkbox "Load override rules" next to Build New button (line 721-724)
      - entityGroupBrowser.js: Modified buildNewEntityGroupDatabase() to check checkbox (lines 373-429)
    behavior:
      - Checkbox checked (default): Loads rules from Google Sheets before building
      - Checkbox unchecked: Clears rules and builds without overrides
      - Success message shows rule counts: "(Override rules: X FM, Y FE)"

# Previous Session Work (Session 7)
session7_work:
  phase_b_implementation:
    status: USER_VERIFIED_WORKING
    file_modified: scripts/matching/entityGroupBuilder.js
    changes:
      - Added buildGroupForFounder() function implementing 8-step algorithm
      - Modified all 5 phase execution functions to use buildGroupForFounder()
      - All phases track forcedAdded count and handle founderForced + forcedFromNaturals arrays
    backward_compatible: Yes - when no rules loaded, hasOverrides=false skips Steps 2-8

# Session 6 - Phase A Implementation Complete
session6_work:
  phase_a_implementation:
    status: USER_VERIFIED_WORKING
    file_created: scripts/matching/matchOverrideManager.js
    html_updated: index.html (added script tag before entityGroupBuilder.js)
    test_results:
      all_classes_exist: PASS (ForceMatchRule, ForceExcludeRule, MatchOverrideManager, window.matchOverrideManager)
      rule_creation_validation: PASS (8 tests)
      manager_rule_loading: PASS (2 tests)
      lookup_methods: PASS (5 tests)
      eight_step_helpers: PASS (6 tests - all exclusion resolution functions working)
    override_logs_verified:
      - "Step 2 exclusion FE-CD: D removed (DEFECTIVE_YIELDS)"
      - "Step 4 OnConflict exclusion FE-HI: I removed (DEFECTIVE_YIELDS)"
      - "Step 7 Priority exclusion FE-EJ: J removed (priority E wins)"
      - "Step 8 OnConflict exclusion FE-KM: M removed (DEFECTIVE_YIELDS)"

  algorithm_refinement:
    status: DESIGN_FINALIZED
    spec_file: reference_matchOverrideSystem.md (v2.0)
    key_insight: Sequence matters - 8 steps with priority hierarchy

  group_building_algorithm:
    step_0: Remove natural matches excluded with founder (founder always wins) [NEW]
    step_1: Find natural matches from algorithmic comparison
    step_2: Resolve exclusions among natural matches (founder-forced in list wins, else OnConflict)
    step_3: Generate founder forced matches (not already in naturals)
    step_3_5: Check for contradictions - entity both forced AND excluded with founder (warn) [NEW]
    step_4: Resolve exclusions among founder forced (stupid case - OnConflict)
    step_5: Check founder forced vs natural matches (founder forced wins)
    step_6: Generate forced matches from surviving natural matches
    step_7: Check forced-from-naturals vs founder forced (founder wins)
    step_7_5: Check forcedFromNaturals for exclusions with founder [NEW]
    step_8: Resolve exclusions among forced-from-naturals (OnConflict)

  priority_hierarchy:
    tier_0: Founder (F) - ABSOLUTE (cannot be excluded, owns the group)
    tier_1: Founder-forced (F→X) - highest priority among non-founders
    tier_2: Natural match - middle priority
    tier_3: Forced-from-natural (A→X where A is natural match) - lowest priority
    same_tier_resolution: OnConflict rules (DEFECTIVE_YIELDS, OTHER_YIELDS, USE_SIMILARITY)
    founder_exclusion_rule: Any entity excluded with founder F is blocked from joining F's group (OnConflict ignored)

  key_behaviors:
    - Losers stay in pool for future groups (not permanently excluded)
    - Lineage is lost when natural match is booted (their force-matches never collected)
    - Founding member F cannot yield (owns the group)

# Session 5 - Match Override System Design (Initial)
session5_work:
  match_override_system:
    status: DESIGN_REFINED_IN_SESSION_6
    spec_file: reference_matchOverrideSystem.md
    implementation_plan: reference_matchOverrideImplementationPlan.md
    purpose: Correct algorithmic matching errors via Google Sheets rules

    force_match_design:
      sheet_columns: [RuleID, RuleType, EntityKey1, EntityKey2, AnchorOverride, Reason, Status]

    force_exclude_design:
      sheet_columns: [RuleID, RuleType, DefectiveKey, OtherKey, OnConflict, Reason, Status]
      on_conflict_options: [DEFECTIVE_YIELDS (default), OTHER_YIELDS, USE_SIMILARITY]

    implementation_phases:
      phase_a: Foundation - data structures, hardcoded test rules
      phase_b: Exclusion integration - wire into buildGroupForFounder()
      phase_c: Force-match integration - collect and resolve in 8-step algorithm
      phase_d: Google Sheets integration - load rules from actual sheets
      phase_e: UI integration - browser controls, status updates

  csv_export:
    status: CODED_IN_ENTITYGROUPBROWSER
    location: scripts/entityGroupBrowser.js (lines 1356-1912)
    functions: [exportEntityGroupsToCSV, downloadCSVExport]
    format: 54-column per reference_csvExportSpecification.md

# Session 4 - Name Comparison Rule and Diagnostic Cleanup
session4_work:
  name_comparison_rule:
    status: USER_VERIFIED_WORKING
    location: scripts/utils.js defaultWeightedComparison() (lines 623-651)
    rule: |
      When comparing IndividualName objects where both names have exactly 2 of 3 fields
      (firstName, lastName, otherNames) but are missing DIFFERENT fields, do NOT normalize
      the weights. Use full weight sum (1.0) to properly penalize the mismatch.
    example: |
      Name A: firstName="John", lastName="Smith", otherNames="" (missing otherNames)
      Name B: firstName="", lastName="Smith", otherNames="John" (missing firstName)
      Before: Only lastName compared, normalized to 0.5 weight → inflated score
      After: All three weights active (0.5+0.4+0.1=1.0), mismatches properly reduce score

  diagnostic_cleanup:
    status: CLEANED
    removed_from:
      - universalEntityMatcher.js: Same-location VA diagnostic logs (lines 387-395)
      - entityGroupBuilder.js: SAME-LOCATION BUG diagnostic logs (lines 588-599)
      - unifiedEntityBrowser.js: Orphaned END DIAGNOSTIC log (line 1627)

# Session 3 - Same-Location Entity Grouping Bug FIX
same_location_fix:
  status: USER_VERIFIED_WORKING

  fix_implemented:
    location: scripts/matching/universalEntityMatcher.js
    changes:
      - Added extractNameFromEntity() helper (lines 268-277)
      - Added extractContactInfoFromEntity() helper (lines 284-293)
      - Added compareSameLocationEntities() function (lines 303-366)
      - Modified universalCompareTo() to check same-location FIRST, before routing (lines 378-390)
    key_insight: Check for same-location at TOP of universalCompareTo() before fire number context is lost

  sampled_test_results:
    test_type: Sampled database build (~1500 entities)
    fire_72_groups_found: 13
    problem_groups_found: 0
    summary: "✓ SUCCESS: No VisionAppraisal same-location grouping bugs detected!"

# EntityGroup Database Property Names (IMPORTANT)
entitygroup_structure:
  correct_property_names:
    - index: (not groupIndex)
    - consensusEntity: (not consensus)
    - foundingMemberKey: (not foundingMember)
    - memberKeys: array of member database keys
    - nearMissKeys: array of near miss database keys
  access_pattern: window.entityGroupDatabase.groups[index]

# EARLIER VERIFIED WORK (retained for context)
deep_consensus_building:
  status: USER_VERIFIED_WORKING
  location: scripts/objectStructure/entityGroup.js

contactinfo_comparison_fixes:
  status: USER_VERIFIED_WORKING
  summary: Threshold-based secondary exclusion, dynamic weighting, phase order swap

extractFireNumberFromEntity_fix:
  status: USER_VERIFIED_WORKING

same_location_comparison:
  status: USER_VERIFIED_WORKING
  note: universalCompareTo() now checks same-location FIRST before routing; full database build verified

# OVERALL PROJECT STATUS
all_foundational_layers: USER_VERIFIED_WORKING
entitygroup_system: USER_VERIFIED_WORKING (same-location fix verified)
keyed_database_migration: USER_VERIFIED_WORKING
key_preservation: USER_VERIFIED_WORKING
comparison_architecture: USER_VERIFIED_WORKING
deep_consensus_building: USER_VERIFIED_WORKING

# PENDING WORK (order updated)
pending:
  - Match Override System Phase B: Wire 8-step algorithm into entityGroupBuilder.js (NEXT)
  - Match Override System Phases C-E: See reference_matchOverrideImplementationPlan.md
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
  split_button: "✂️ Split Database for Apps Script" (creates 3 files under 50MB for Google Apps Script)
  split_details: See reference_googleAppsScriptLookup.md

ENTITYGROUP_DATABASE:
  description: Collection of EntityGroups representing matched real-world persons/households
  construction_function: buildEntityGroupDatabase() in scripts/matching/entityGroupBuilder.js
  browser_file: scripts/entityGroupBrowser.js
  five_phase_construction: [Bloomerang Households, VisionAppraisal Households, VisionAppraisal Individuals, Bloomerang Individuals, Remaining]

SAME_LOCATION_ENTITIES:
  definition: Two Block Island entities with suffixed fire numbers sharing same base (e.g., 72J vs 72W)
  significance: Different owners at same physical property - primary addresses match trivially
  comparison_method: Use compareSecondaryAddressesOnly() instead of full contactInfo comparison

CONTACTINFO_WEIGHTING:
  best_address_match: Single best score across all address comparisons (primary and secondary)
  primary_involved_weights: address 0.75, email 0.25 (when primary-to-primary or primary-to-secondary)
  secondary_only_weights: address 0.65, email 0.35 (when secondary-to-secondary is best)
  exclusion_threshold: 0.87 (MATCH_CRITERIA.trueMatch.contactInfoAlone)

MATCH_OVERRIDE_SYSTEM:
  description: Google Sheets-based rules to correct algorithmic matching errors
  status: ALL_PHASES_COMPLETE (A-E)
  rule_types:
    FORCE_MATCH: Ensure two entities end up in same group (anchor/dependent model)
    FORCE_EXCLUDE: Prevent two entities from being in same group (defective/other model)
  google_sheets:
    FORCE_MATCH_SHEET_ID: '1WWq8rgVyIKgf3qhVpl5mBiVQllljum0JVm2e_h-WZo8'
    FORCE_EXCLUDE_SHEET_ID: '1nZIqcBa3LW1DcUKXVr1jNCGsZqq6JLTaxJSpXSZyulk'
    force_match_columns: [RuleID, EntityKey1, EntityKey2, AnchorOverride, Reason, Status]
    force_exclude_columns: [RuleID, DefectiveKey, OtherKey, OnConflict, Reason, Status]
  anchor_determination: Earlier phase entity is anchor (unless AnchorOverride specified)
  on_conflict_options: DEFECTIVE_YIELDS (default), OTHER_YIELDS, USE_SIMILARITY
  ui_integration: Checkbox "Load override rules" next to Build New button (checked by default)
  usage: |
    1. Add rules to Google Sheets (FORCE_MATCH and/or FORCE_EXCLUDE)
    2. Click "Build New" with checkbox checked
    3. Rules automatically load from sheets and apply during build
  console_command: await window.matchOverrideManager.loadFromGoogleSheets()
  spec_files: [reference_matchOverrideSystem.md, reference_matchOverrideImplementationPlan.md]
  implementation_files:
    - scripts/matching/matchOverrideManager.js (Phase A + D)
    - scripts/matching/entityGroupBuilder.js (Phase B + C - buildGroupForFounder)
    - scripts/entityGroupBrowser.js (Phase E - UI checkbox)
    - index.html (Phase E - checkbox HTML)
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
```

---

## REFERENCE_NAVIGATION
```yaml
CURRENT_WORK:
  reference_currentWorkInProgress.md: Project layer stack, current status
  READ_WHEN: Starting session, need context on current work

SESSION_HISTORY:
  reference_sessionHistory.md: Detailed logs of completed sessions
  READ_WHEN: Checking what was already tried/fixed

PROJECT_ROADMAP:
  reference_projectRoadmap.md: 8-step strategic roadmap
  READ_WHEN: Discussing future plans or prioritization

ENTITYGROUP:
  scripts/objectStructure/entityGroup.js: EntityGroup and EntityGroupDatabase classes
  scripts/matching/entityGroupBuilder.js: 5-phase construction algorithm
  scripts/entityGroupBrowser.js: Browser tool + CSV export
  reference_csvExportSpecification.md: CSV export format for prospects/donors

MATCH_OVERRIDE_SYSTEM:
  reference_matchOverrideSystem.md: Complete design specification (AGREED)
  reference_matchOverrideImplementationPlan.md: 5-phase incremental implementation plan
  scripts/matching/matchOverrideManager.js: ALL PHASES COMPLETE - data structures, 8-step helpers, Google Sheets
  scripts/matching/entityGroupBuilder.js: buildGroupForFounder() implements 8-step algorithm
  scripts/entityGroupBrowser.js: UI checkbox integration for loading override rules
  google_sheets:
    FORCE_MATCH: '1WWq8rgVyIKgf3qhVpl5mBiVQllljum0JVm2e_h-WZo8'
    FORCE_EXCLUDE: '1nZIqcBa3LW1DcUKXVr1jNCGsZqq6JLTaxJSpXSZyulk'
  READ_WHEN: Managing match override rules or debugging grouping issues

COMPARISON_ARCHITECTURE:
  reference_compareToDirectImplementationPlan.md: compareTo implementation details
  READ_WHEN: Working on comparison logic

KEYED_DATABASE:
  reference_keyedDatabaseMigration.md: Migration plan details
  reference_keyPreservationPlan.md: Key preservation architecture

GOOGLE_APPS_SCRIPT_TOOLS:
  reference_googleAppsScriptLookup.md: EntityGroup lookup from Google Sheets
  googleAppsScripts/: Folder containing Apps Script code (not part of browser app)
  READ_WHEN: Need to look up entities from Google Sheets without browser app

LIGHTWEIGHT_EXPORTER:
  scripts/export/lightweightExporter.js: Exports EntityGroupDatabase to smaller JSON format
  purpose: Create Google Apps Script-readable JSON without class overhead
  size_reduction: ~66% smaller than full serialization
  READ_WHEN: Need to export EntityGroupDatabase for external consumption

UI_AND_DISPLAY:
  reference_displayImprovements.md: Entity detail popups, CSV export panel, excluded properties
  READ_WHEN: Revisiting HTML display design or adding new display features
```

---

## BLOCKING_STATUS_TRACKER
```yaml
current_work:
  lightweight_exporter:
    status: READY_FOR_USER_VERIFICATION
    description: |
      New file scripts/export/lightweightExporter.js created to export EntityGroupDatabase
      to a smaller JSON format (66% reduction) suitable for Google Apps Script.
      Strips alternatives, sourceMaps, comparisonWeights while preserving essential data.
    files_created:
      - scripts/export/lightweightExporter.js
    files_modified:
      - index.html (added script tag)

  csv_currency_parsing:
    status: USER_VERIFIED_WORKING
    description: Fixed visionAppraisal.js to handle comma-containing currency values like "$454,500"

  otherinfo_display:
    status: USER_VERIFIED_WORKING
    description: |
      Issue was wrong file ID in input field. User was loading old unified database file
      that lacked otherInfo. Correct file ID resolved the issue.

  founder_exclusion_bug_fix:
    status: CODED_NOT_TESTED
    description: |
      Bug fix: Exclusions with founder were not enforced because founder is not in naturalMatches.
      Added Steps 0, 3.5, 7.5 to check exclusions against founder at all entry points.
    files_modified:
      - matchOverrideManager.js (3 new methods)
      - entityGroupBuilder.js (3 new steps in buildGroupForFounder)
      - reference_matchOverrideSystem.md (v3.0)

  match_override_system:
    status: ALL_PHASES_COMPLETE_WITH_BUG_FIX
    phases_completed:
      phase_a: USER_VERIFIED_WORKING (data structures, 8-step helpers)
      phase_b: USER_VERIFIED_WORKING (exclusion integration)
      phase_c: USER_VERIFIED_WORKING (force-match integration)
      phase_d: USER_VERIFIED_WORKING (Google Sheets loading)
      phase_e: CODED_READY_FOR_TESTING (UI checkbox integration)
    bug_fix: CODED_NOT_TESTED (founder exclusion - Steps 0, 3.5, 7.5)
    spec_file: reference_matchOverrideSystem.md (v3.0)
    implementation_plan: reference_matchOverrideImplementationPlan.md

  same_location_fix:
    status: USER_VERIFIED_WORKING
    description: Fix implemented in universalCompareTo() - checks same-location BEFORE routing

  csv_export:
    status: CODED_IN_ENTITYGROUPBROWSER
    location: scripts/entityGroupBrowser.js (lines 1356-1912)

completed_work:
  csv_currency_parsing_fix: USER_VERIFIED_WORKING (Dec 20 session 10)
  otherinfo_display_fix: USER_VERIFIED_WORKING (Dec 20 session 10 - wrong file ID issue)
  founder_exclusion_bug_fix: CODED_NOT_TESTED (Dec 19 session 9)
  match_override_system_complete: USER_VERIFIED_WORKING (Dec 19 session 8 - all 5 phases)
  match_override_phase_a: USER_VERIFIED_WORKING (Dec 18 session 6)
  match_override_phase_b: USER_VERIFIED_WORKING (Dec 19 session 8)
  match_override_phase_c: USER_VERIFIED_WORKING (Dec 19 session 8)
  match_override_phase_d: USER_VERIFIED_WORKING (Dec 19 session 8)
  match_override_phase_e: CODED_READY_FOR_TESTING (Dec 19 session 8)
  same_location_fix: USER_VERIFIED_WORKING (Dec 18 session 6)
  name_comparison_different_missing_fields: USER_VERIFIED_WORKING (Dec 18 session 4)
  diagnostic_log_cleanup: CLEANED (Dec 18 session 4)
  alternatives_deduplication: USER_VERIFIED_WORKING (Dec 18 session 2)
  utils_syntax_fix: USER_VERIFIED_WORKING (Dec 18 session 2)
  deep_consensus_building: USER_VERIFIED_WORKING (Dec 18)
  contactinfo_comparison_fixes: USER_VERIFIED_WORKING (Dec 17 evening)
  entitygroup_browser: USER_VERIFIED_WORKING
  entitygroup_persistence: USER_VERIFIED_WORKING
  keyed_database_migration: USER_VERIFIED_WORKING
  key_preservation: USER_VERIFIED_WORKING
  all_foundational_layers: USER_VERIFIED_WORKING
  extractFireNumberFromEntity_fix: USER_VERIFIED_WORKING

known_issues:
  none_currently_open: All known issues resolved

pending_work:
  - Phase E UI testing: Test checkbox integration via browser (optional - console works)
  - Production data review: Build with real override rules and verify results
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
last_updated: December_20_2025
document_version: 76.0_LIGHTWEIGHT_EXPORTER_COMPLETE
previous_version: 75.0_OTHERINFO_DIAGNOSIS_COMPLETE

session_summary:
  dec20_session11:
    status: READY_FOR_USER_VERIFICATION
    focus: Lightweight EntityGroupDatabase exporter for Google Apps Script
    deliverables:
      - scripts/export/lightweightExporter.js: Complete lightweight exporter implementation
      - index.html: Added script tag to load lightweightExporter.js
    size_reduction: 16.55 MB → 5.62 MB (66% reduction)
    key_functions:
      - exportLightweightEntityGroupDatabase(db)
      - downloadLightweightExport(db, filename)
      - compareSizes(db)
    bugs_fixed:
      - Type detection for loaded JSON (structural shortcuts for primaryAlias.term, term, identifier)
      - Added assessmentValue/appraisalValue to transformOtherInfo
      - Fixed Aliased-wrapped Address handling (primaryAddress was returning empty object)
      - Term extraction now recursively transforms object terms (like Address)
    also_in_session:
      - Changed PID folder ID in baseCode.js to new folder: 1qgnE1FW3F6UG7YS4vfGBm9KzX8TDuBCl
      - Discussed OAuth token refresh strategy for long-running VisionAppraisal downloads

  dec20_session10:
    status: IN_PROGRESS
    focus: Assessment/appraisal value flow to consensus entities + production process docs
    earlier_work:
      - Created reference_productionProcess.md (8-step production rebuild process)
      - Fixed PID folder ID to use single source of truth (parameters.pidFilesParents)
      - Added PID duplicate analysis buttons to index.html
      - Removed diagnostic logging from visionAppraisalNameParser.js
      - Verified data pipeline stages 2-4 working correctly
    current_issue:
      problem: User reported consensus entities have null assessment values
      initial_wrong_assumption: AI assumed "old database" - user corrected this
      code_review: |
        - entityGroup.js lines 122-125: Singleton groups have consensusEntity=null BY DESIGN
        - entityGroup.js lines 447-461: Assessment copying code EXISTS and appears correct
      diagnosis_needed: |
        Need to verify if MULTI-MEMBER groups with VA members also show null values.
        If so, need to trace why member entities' otherInfo isn't being read.
    key_learning: |
      Groups without VisionAppraisal members will NEVER have assessment data (expected).
      Singleton groups will NEVER have a consensusEntity (by design).

  dec19_session9:
    status: CODED_NOT_TESTED
    focus: Founder exclusion bug fix
    problem: |
      Exclusions with founder F were not being enforced because F is not in naturalMatches.
      Step 2 only checked exclusions among natural matches, missing founder-entity exclusions.
    solution: |
      Added 3 new steps to check exclusions against founder at all entry points:
      - Step 0: naturalMatches vs founder
      - Step 3.5: founderForced vs founder (contradiction check with warning)
      - Step 7.5: forcedFromNaturals vs founder
    files_modified:
      - scripts/matching/matchOverrideManager.js (3 new helper methods)
      - scripts/matching/entityGroupBuilder.js (Steps 0, 3.5, 7.5)
      - reference_matchOverrideSystem.md (v3.0)
    new_methods_in_matchOverrideManager:
      - removeExcludedWithFounder(entities, founderKey)
      - removeExcludedKeysWithFounder(keys, founderKey)
      - removeContradictoryFounderForced(keys, founderKey)

  dec19_session8:
    status: MATCH_OVERRIDE_SYSTEM_ALL_PHASES_COMPLETE
    focus: Complete Match Override System - Phases B, C, D, E
    deliverables:
      - Phase B: Exclusion rules tested and verified working
      - Phase C: Force-match rules tested and verified working
      - Phase D: Google Sheets integration (loadRulesFromGoogleSheets, loadFromGoogleSheets)
      - Phase E: UI checkbox in entityGroupBrowser.js and index.html
    test_evidence:
      phase_b: "[OVERRIDE] Step 2 exclusion FE-TEST-001: visionAppraisal:FireNumber:1658 removed"
      phase_c: "Phase 2 complete: 511 groups, 409 natural matches, 1 forced"
      phase_d: "[OVERRIDE] Loaded 3 FORCE_MATCH rules from sheet, Loaded 2 FORCE_EXCLUDE rules"
    files_modified:
      - scripts/matching/matchOverrideManager.js (added Google Sheets functions)
      - scripts/entityGroupBrowser.js (added checkbox handling in buildNewEntityGroupDatabase)
      - index.html (added loadOverrideRulesCheckbox)

  dec18_session6:
    status: PHASE_A_USER_VERIFIED_WORKING
    focus: Phase A implementation and testing
    deliverables:
      - scripts/matching/matchOverrideManager.js: Complete Phase A implementation
      - index.html: Added script tag to load matchOverrideManager.js
    implementation_details:
      - ForceMatchRule class with validate(), involvesKey(), getPartnerKey()
      - ForceExcludeRule class with validate(), matchesPair(), determineLoser()
      - MatchOverrideManager class with 8-step algorithm helper methods
      - resolveExclusionsWithPriority() for Step 2
      - resolveExclusionsOnConflict() for Steps 4 and 8
      - removeExcludedByPriority() and removeExcludedKeysByPriority() for Steps 5 and 7
    test_results: All 24 tests passed in browser console

  dec18_session5:
    status: DESIGN_AGREED
    focus: Manual Match Override System design
    deliverables:
      - reference_matchOverrideSystem.md: Complete design specification
      - reference_matchOverrideImplementationPlan.md: 5-phase implementation plan
    key_decisions:
      - FORCE_MATCH: Anchor/dependent model with phase-based anchor determination
      - FORCE_EXCLUDE: Defective/other model with OnConflict options
      - OnConflict values: DEFECTIVE_YIELDS, OTHER_YIELDS, USE_SIMILARITY
      - Founding member exception: Cannot yield if founding member (owns group)
      - BATCH CONFLICT RESOLUTION: Exclusions resolved during findMatchesForEntity() batch,
        not incrementally. Loser stays in pool for future groups.
    implementation_location:
      - scripts/matching/matchOverrideManager.js (to be created)
      - findMatchesForEntity() in entityGroupBuilder.js (exclusion checks)
      - Phase execution functions (force-match application)

  dec18_session4:
    status: USER_VERIFIED_WORKING
    focus: Name comparison rule for different missing fields + diagnostic cleanup
    changes:
      - Added rule in defaultWeightedComparison(): when both IndividualNames have 2 of 3 fields
        but are missing DIFFERENT fields, do not normalize weights (use full 1.0 weight sum)
      - Removed diagnostic logs from universalEntityMatcher.js, entityGroupBuilder.js,
        and unifiedEntityBrowser.js that were added during same-location debugging

  dec18_session3:
    status: USER_VERIFIED_WORKING
    focus: Same-location entity grouping bug FIX
    problem_solved: |
      VisionAppraisal entities at same physical location (72A, 72B, 72C at 72 West Side Road)
      were incorrectly grouped together because household comparison functions lost fire number context.

    fix_implemented:
      file: scripts/matching/universalEntityMatcher.js
      key_change: Added same-location check at TOP of universalCompareTo() BEFORE routing
      new_functions:
        - extractNameFromEntity() (lines 268-277)
        - extractContactInfoFromEntity() (lines 284-293)
        - compareSameLocationEntities() (lines 303-366)
      modified_function: universalCompareTo() (lines 378-400)

    test_results:
      sampled_build: ~1500 entities
      fire_72_groups: 13 groups found
      problem_groups: 0 (all suffixed fire#s now in separate groups)
      diagnostic_output: "✓ SUCCESS: No VisionAppraisal same-location grouping bugs detected!"

    next_step: Run full database build for final verification, then proceed to CSV export

  dec18_session2:
    - Added Alternatives.deduplicate() method in aliasClasses.js (lines 378-395)
    - Fixed utils.js syntax error (nested block comment with JSDoc)
    - Added ROOT_CAUSE_DEBUGGING_RULE to CLAUDE.md

  dec18_session1:
    - Implemented deep consensus building for EntityGroup consensus entities
    - Removed minimum threshold for candidate category
    - Full database test passed (The Nature Conservancy 116 members)

  dec17_evening:
    - Implemented threshold-based secondary address exclusion
    - Implemented new contactInfo weighting logic
    - Swapped phase 3 and 4 (VisionAppraisal Individuals before Bloomerang)

  dec17_earlier:
    - Implemented same-location entity comparison (secondary addresses only)
    - Fixed extractFireNumberFromEntity to check constructor.name === 'FireNumber'

working_directory: /home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025
platform: linux
```
