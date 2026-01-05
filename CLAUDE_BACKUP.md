# BIRAVA2025_AI_CONTINUITY_KNOWLEDGE_BASE

## AI_READING_INSTRUCTIONS
```yaml
read_order: [ROOT_CAUSE_DEBUGGING_RULE, COMPLETION_VERIFICATION_RULE, CURRENT_WORK_CONTEXT, TERMINOLOGY, MANDATORY_COMPARETO_ARCHITECTURE]
focus_section: ROOT_CAUSE_DEBUGGING_RULE_then_COMPLETION_VERIFICATION_RULE_then_CURRENT_WORK_CONTEXT
processing_directive: ignore_visual_formatting_process_semantic_content_only
last_updated: 2026-01-04
version: 101.0_SESSION25_DUAL_CSV_EXPORT
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
# January 4, 2026 - Session 25

immediate_status: SESSION25_DUAL_CSV_EXPORT_COMPLETE
current_focus: Mail merge finalization - dual CSV export with simplified format
next_action: User verification of simplified CSV format

# Session 25 - Mail Merge Enhancements (USER_VERIFIED_WORKING)
session25_work:
  project: Prospect Mail Merge Finalization
  status: USER_VERIFIED_WORKING

  enhancement_3_dual_csv_export:
    problem: |
      User needed a simplified CSV format for actual mail merge address labels,
      with just the essential columns (Name, Address1, Address2, City, State, ZIP).
    solution: |
      Modified exportProspectMailMerge() to generate TWO CSVs in a single pass:
      1. Full 62-column format (prospect_mailmerge_YYYY-MM-DD.csv)
      2. Simplified 6-column format (prospect_mailmerge_simple_YYYY-MM-DD.csv)
      downloadProspectMailMerge() now downloads both files.
    files_modified:
      - scripts/entityGroupBrowser.js:
        - Added SIMPLE_MAIL_MERGE_HEADERS constant
        - Added generateSimpleMailMergeRow() function
        - Modified exportProspectMailMerge() to build both CSVs
        - Modified downloadProspectMailMerge() to download both files
    simplified_csv_columns: [Name, Address1, Address2, City, State, ZIP]
    fixes_applied:
      - PO BOX addresses now go in Address1 (not Address2)
      - 4-digit ZIP codes padded with leading zero (e.g., 2807 → 02807)
    note: CSV leading zeros require user to import ZIP column as text in Excel/Sheets
    status: USER_VERIFIED_WORKING

  enhancement_1_consensus_collapse_fallback:
    problem: |
      Some entity groups weren't collapsing in mail merge even when they should.
      Root cause: address parsing errors (e.g., "VERO BEACH" parsed as streetName="VERO", city="Bch")
      caused contactInfo comparison to fail threshold even for identical addresses.
    solution: |
      Modified generateMailMergeGroupRows() to use CONSENSUS_COLLAPSE as final fallback.
      Multi-member groups that don't pass isGroupContactInfoConnected() now collapse to
      single consensus row instead of outputting multiple rows.
    file_modified: scripts/entityGroupBrowser.js (generateMailMergeGroupRows function, lines 3122-3137)
    behavior:
      - Groups passing contactInfo threshold: Key = "CONSOLIDATED_GROUP"
      - Groups NOT passing threshold: Key = "CONSENSUS_COLLAPSE" (new fallback)
      - Both use consensus entity for address, getCollapsedRowNameEntity() for name
    status: USER_VERIFIED_WORKING

  enhancement_2_one_click_mail_merge_button:
    problem: |
      Running mail merge export required manually loading both Unified Entity Database
      and EntityGroup Database first. User wanted one-click operation.
    solution: |
      Added "Prospect Mail Merge" button to CSV Reports panel in index.html.
      Created runProspectMailMergeExport() wrapper function that:
      1. Checks if Unified Entity Database loaded, loads if not
      2. Checks if EntityGroup Database loaded, loads if not
      3. Runs downloadProspectMailMerge()
      Button shows progress: "Loading Unified DB..." → "Loading EntityGroup DB..." → "Generating..."
    files_modified:
      - index.html: Added button in CSV Reports panel (lines 1131-1139)
      - scripts/entityGroupBrowser.js: Added runProspectMailMergeExport() function (lines 3315-3364)
    status: USER_VERIFIED_WORKING

  cleanup_diagnostic_logging_removed:
    description: Removed all [MAIL MERGE DIAG] console.log statements
    files_cleaned:
      - scripts/entityGroupBrowser.js: getFirstSecondaryAddress(), loadMailMergeExcludedAddresses(), exportProspectMailMerge(), runProspectMailMergeExport()
    status: COMPLETE

# Session 24 - Multiple Enhancements (ALL COMPLETE)
session24_work:
  project: Consensus secondary address sorting + Combined address splitting
  status: USER_VERIFIED_WORKING

  enhancement_1_consensus_secondary_address_sorting:
    problem: |
      Consensus entity secondary addresses had no ordering - they appeared in
      arbitrary order based on which member was processed first.
    solution: |
      Modified _deduplicateAddresses() in entityGroup.js to sort by "popularity".
      After deduplication, each unique address is scored by summing its similarity
      to ALL original addresses (including duplicates). Addresses appearing in
      more members' records score higher and are sorted first.
    file_modified: scripts/objectStructure/entityGroup.js (_deduplicateAddresses method, lines 354-430)
    logic: |
      1. Build deduplicated list (unchanged)
      2. Score each unique address: sum of compareTo() scores vs ALL original addresses
      3. Sort by score descending (most popular first)
    example: |
      If 3 members have "PO BOX 123" and 1 member has "45 MAIN ST":
      - "PO BOX 123" scores ~3.0 (high similarity to 3 addresses)
      - "45 MAIN ST" scores ~1.0 (high similarity to 1 address)
      Result: ["PO BOX 123", "45 MAIN ST"]
    requires_rebuild: EntityGroup database only (not Unified Entity Database)
    status: USER_VERIFIED_WORKING

  enhancement_2_combined_address_splitting:
    problem: |
      Some VisionAppraisal owner addresses contain both a PO Box and a street address
      in a single field, e.g.: "PO BOX 735::#^#::247 MILL POND LANE::#^#::BLOCK ISLAND:^#^: RI 02807"
      The address parser cannot handle this - it needs TWO separate address strings.
    solution: |
      Integrated detection and splitting directly into Entity._processAddressParameters().
      When ownerAddress text is detected as combined (has both PO Box and street):
      1. Split into two versions (PO Box + city/state/zip, street + city/state/zip)
      2. Parse each through _processTextToAddressNew()
      3. Add BOTH as secondary addresses (PO Box first at index 0, street at index 1)
    file_modified: scripts/objectStructure/entityClasses.js
    code_added:
      - Helper functions at top of file (lines 14-137): analyzeCombinedAddress(), isPOBoxLine(), isStreetAddressLine(), cleanupEmptySegments()
      - Modified _processAddressParameters() (lines 209-273): detects combined addresses and creates two Address objects
    diagnostic_script: scripts/diagnostics/combinedAddressDiagnostic.js (v4, used for validation)
    validation_results:
      total_records: 2319
      combined_addresses_detected: 36
      parse_success_rate: 100%
      verified_entity: Fire #841 now has 2 secondary addresses (PO Box first, street second)
    requires_rebuild: Unified Entity Database (affects Entity construction)
    status: USER_VERIFIED_WORKING

# Session 23 Summary - Address Comparison Fixes (VERIFIED WORKING)
session23_work:
  project: Fix secondary address comparison for Mail Merge
  documentation: reference_session23_regexFix.md (detailed change log created)
  status: USER_VERIFIED_WORKING

  fix_1_regex_tag_cleaning:
    problem: |
      VisionAppraisal tag `:^#^:` was not being replaced with comma.
      Regex /:^#^:/g didn't work because ^ is a regex metacharacter.
      The `::#^#::` regex was correctly escaped, but `:^#^:` was not.
    symptom: |
      Secondary addresses like "WASHINGTON DEPOT:^#^: CT 06794" remained unparsed.
      City/state components were undefined, streetName contained garbage.
    fix: Changed /:^#^:/g to /:\^#\^:/g (escaped carets)
    files_modified:
      - scripts/address/addressProcessing.js line 57
      - scripts/nameMatching/namePatternAnalyzer.js lines 103-104
    verified_with_diagnostic: Tags now correctly replaced with commas
    affects: Unified Entity Database creation (must rebuild)
    status: USER_VERIFIED_WORKING

  fix_2_pobox_error_report:
    problem: |
      When two PO Box addresses have identical zip but both have undefined secUnitNum,
      comparison returns 0 silently. This is a data quality issue.
    fix: |
      Added console.error logging in comparePOBoxAddresses() when this condition occurs.
      Reports both address primaryAlias.term values and explains the issue.
    file_modified: scripts/utils.js (comparePOBoxAddresses function)
    affects: Diagnostic visibility only, no behavioral change
    status: USER_VERIFIED_WORKING

  fix_3_isPOBoxAddress_false_positives:
    problem: |
      isPOBoxAddress() used .includes('PO') which matched "POND", "POOL", "PORT", etc.
      Addresses like "SANDS POND ROAD" were incorrectly flagged as PO Box addresses.
    fix: |
      Rewrote checkForPOBox() helper with precise regex patterns:
      - /P\.?O\.?[\sB]/ - matches PO, P.O., P.O, PO. followed by space or B
      - /[O\.\s]BOX/ - matches BOX preceded by O, period, or space
      - /POST\s?OFFICE/ - matches POST OFFICE with or without space
      Now only collapses multiple spaces to single space, doesn't strip periods.
    file_modified: scripts/utils.js (isPOBoxAddress function, lines 708-735)
    affects: EntityGroup building (comparison logic), NOT unified database creation
    status: USER_VERIFIED_WORKING

  fix_4_mail_merge_pobox_fallback:
    problem: |
      When PO Box addresses have badly parsed components (secUnitNum is null for both),
      Address.compareTo() returns 0 even for identical addresses.
      This prevents mail merge groups from collapsing when they should.
    fix: |
      Added fallback in isGroupContactInfoConnected() (MAIL MERGE ONLY, not entity group building).
      Conditions for fallback:
        1. contactInfoScore doesn't pass threshold
        2. BOTH entities have PO Box secondary addresses (via isPOBoxAddress())
        3. BOTH have null/undefined secUnitNum
      When all conditions met: compare primaryAlias.term strings with Levenshtein.
      If similarity > trueMatch.overallAlone (0.905), consider it a match.
    file_modified: scripts/entityGroupBrowser.js (isGroupContactInfoConnected function, lines 2980-3007)
    affects: ONLY mail merge group collapsing, NOT entity group building
    critical_note: |
      INITIAL IMPLEMENTATION WAS WRONG - fallback was placed in addressWeightedComparison()
      which affected ALL comparisons including entity group building. This caused massive
      false positive matching. Correctly reimplemented in mail merge code only.
    status: USER_VERIFIED_WORKING

  diagnostic_logging_removed: true

  rebuild_completed:
    unified_entity_database: Rebuilt with regex fix
    entitygroup_database: Rebuilt with isPOBoxAddress fix

# Session 22 Summary (earlier Jan 4, 2026)
session22_work:
  project: Prospect Mail Merge Spreadsheet
  blocking_issue_discovered: Address.compareTo() returning 0 for identical secondary addresses
  root_cause_identified: Regex bug in VisionAppraisalTagCleaner (Session 23 fixed this)
  code_written:
    - isGroupContactInfoConnected(): Flood-fill connectivity check
    - getCollapsedRowNameEntity(): Name selection logic for consolidated rows
    - extractSecAddr1Components(): Extract secondary address components for CSV
  csv_expanded: 54 to 62 columns (SecAddr1 now 9 component columns)

# Session 21 Summary (December 28, 2025)
session21_work:
  project: Prospect Mail Merge Spreadsheet
  challenge_1_exclusions: USER_VERIFIED_WORKING
  challenge_2_row_source: USER_VERIFIED_WORKING
  functions_created: [downloadProspectMailMerge, exportProspectMailMerge, generateMailMergeGroupRows, loadMailMergeExcludedAddresses, getFirstSecondaryAddress, isAddressExcluded, getFoundingMemberType]

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

MATCH_CRITERIA_THRESHOLDS:
  description: Thresholds used for entity matching decisions
  location: scripts/unifiedEntityBrowser.js MATCH_CRITERIA object
  trueMatch:
    overallAndName: { overall: 0.80, name: 0.83 }
    contactInfoAlone: 0.87
    overallAlone: 0.905
    nameAlone: 0.875
  nearMatch:
    overallAndName: { overall: 0.77, name: 0.80 }
    contactInfoAlone: 0.85
    overallAlone: 0.875
    nameAlone: 0.845
  usage_rule: Always reference window.MATCH_CRITERIA, never hardcode thresholds
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

ADDRESS_COMPARISON_FALLBACK:
  new_in_session_23: |
    addressWeightedComparison() now has primaryAlias.term fallback at start.
    If both addresses have primaryAlias.term with Levenshtein similarity > 0.905,
    returns that score without doing component comparison.
    Handles cases where identical addresses have badly parsed components.

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
  - regex_metacharacters: In JavaScript regex, ^ is a metacharacter - escape as \^ for literal match
  - NO_CACHE_BUST_QUERYSTRINGS: NEVER add ?timestamp or ?Date.now() to script URLs - server checks last 3 chars for extension, querystrings break this. Use hard refresh (Ctrl+Shift+R) instead.
```

---

## REFERENCE_NAVIGATION
```yaml
PRIMARY_DOCUMENTATION:
  reference_systemDocumentation.md: Consolidated system guide (8 sections, 927 lines)
  reference_session23_regexFix.md: Detailed documentation of Session 23 changes
  contents: [Architecture, Algorithms, Data Specs, Production Ops, Dev Principles, Apps Script, Critical Files]
  READ_WHEN: Need any system documentation - this is the single authoritative source

ARCHIVED_DOCUMENTATION:
  archive/reference_docs_2025/: 49 original reference files (preserved for historical detail)
  archive/integration_2025/: 6 obsolete integration tools
  archive/obsolete_2024/: Old obsolete folder contents

CODE_CLEANUP:
  archive/reference_docs_2025/reference_codeCleanupPlan.md: 5-phase cleanup plan
  phases: [Phase 0 COMPLETE, Phase 1 COMPLETE, Phase 2 COMPLETE, Phase 3 COMPLETE, Phase 4 COMPLETE]
  rollback_tag: v1.0.0-stable-dec-23-2025

CORE_CODE_LOCATIONS:
  entity_system: scripts/objectStructure/ (entityClasses.js, contactInfo.js, aliasClasses.js, entityGroup.js)
  matching_system: scripts/matching/ (entityGroupBuilder.js, universalEntityMatcher.js, matchOverrideManager.js)
  browsers: scripts/ (entityGroupBrowser.js, unifiedEntityBrowser.js, entityRenderer.js)
  serialization: scripts/utils/classSerializationUtils.js
  export: scripts/export/lightweightExporter.js
  address_processing: scripts/address/addressProcessing.js
  comparison_calculators: scripts/utils.js (addressWeightedComparison, contactInfoWeightedComparison, etc.)
```

---

## CURRENT_STATUS_TRACKER
```yaml
current_work:
  ALL_CLEANUP_PHASES: COMPLETE
  session25_enhancements: USER_VERIFIED_WORKING

regression_test_status:
  ALL_12_TESTS: PASSED (Dec 26, 2025) - needs re-run after Session 23-25 changes

verified_features:
  all_foundational_layers: USER_VERIFIED_WORKING
  entitygroup_system: USER_VERIFIED_WORKING
  match_override_system: USER_VERIFIED_WORKING
  mail_merge_export: USER_VERIFIED_WORKING
  one_click_mail_merge_button: USER_VERIFIED_WORKING
  dual_csv_export: USER_VERIFIED_WORKING

active_project:
  name: Prospect Mail Merge Export
  spec: reference_prospectMailMerge.md
  status: USER_VERIFIED_WORKING - dual CSV export complete
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
last_updated: January_04_2026
document_version: 100.0_SESSION25_MAIL_MERGE_ENHANCEMENTS
previous_version: 99.0_SESSION24_INTEGRATION_COMPLETE

version_notes: |
  Version 100.0 - Session 25 Mail Merge Enhancements:
  1. CONSENSUS_COLLAPSE FALLBACK: Multi-member groups that fail contactInfo threshold
     now collapse to single consensus row (Key="CONSENSUS_COLLAPSE") instead of
     outputting multiple rows. This handles address parsing errors gracefully.
  2. ONE-CLICK MAIL MERGE BUTTON: Added "Prospect Mail Merge" button to CSV Reports
     panel that auto-loads both databases if needed, then exports.
  3. DIAGNOSTIC CLEANUP: Removed all [MAIL MERGE DIAG] logging from entityGroupBrowser.js
  - Files modified: index.html, scripts/entityGroupBrowser.js
  - STATUS: USER_VERIFIED_WORKING

  Version 99.0 - Session 24 Integration Complete:
  - Integrated combined address splitting into entityClasses.js
  - Added helper functions: analyzeCombinedAddress(), isPOBoxLine(), isStreetAddressLine(), cleanupEmptySegments()
  - Modified Entity._processAddressParameters() to detect combined PO Box + street addresses
  - When detected: creates TWO Address objects (PO Box first, street second)
  - Verified: Fire #841 now has 2 secondary addresses with correct order
  - STATUS: USER_VERIFIED_WORKING

  Version 98.0 - Session 24 Diagnostic Validated:
  - Fixed combinedAddressDiagnostic.js v3→v4: now handles BOTH ::#^#:: and :^#^: delimiters
  - Ran full diagnostic: 36 combined addresses detected out of 2319 records
  - Tested all 36 split addresses through processAddress(): 100% success rate
  - Reviewed 39 "no clear pattern" cases: all are normal addresses, none need splitting

  Version 97.0 - Session 24 Combined Address Diagnostic:
  - Created scripts/diagnostics/combinedAddressDiagnostic.js (v3)
  - Implements user's approach: work with original string, remove unwanted portion, cleanup delimiters

  Version 96.0 - Session 23 Multiple Fixes:
  1. REGEX FIX: VisionAppraisal tag `:^#^:` now correctly replaced (escaped carets in regex)
     - addressProcessing.js line 57
     - namePatternAnalyzer.js lines 103-104
  2. primaryAlias.term FALLBACK: Address comparison now checks raw strings first
     - If Levenshtein > 0.905, bypasses component comparison
     - Handles identical addresses with badly parsed components
  3. PO BOX ERROR REPORT: Logs when both addresses are PO Box with undefined secUnitNum
  4. isPOBoxAddress FIX: No longer matches "POND", "POOL", etc.
     - Precise regex patterns for PO, P.O., POST OFFICE, BOX

  Documentation created: reference_session23_regexFix.md

  REBUILD REQUIRED:
  - Unified Entity Database (regex fix affects parsing)
  - EntityGroup Database (comparison logic changed)

  Diagnostic logging present in isGroupContactInfoConnected() - remove after testing

working_directory: /home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025
platform: linux
```
