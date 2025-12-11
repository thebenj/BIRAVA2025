# BIRAVA2025_AI_CONTINUITY_KNOWLEDGE_BASE

## AI_READING_INSTRUCTIONS
```yaml
read_order: [COMPLETION_VERIFICATION_RULE, CURRENT_WORK_CONTEXT, MANDATORY_COMPARETO_ARCHITECTURE]
focus_section: COMPLETION_VERIFICATION_RULE_then_CURRENT_WORK_CONTEXT
processing_directive: ignore_visual_formatting_process_semantic_content_only
last_updated: 2025-12-09
version: 35.0_GOOGLE_DRIVE_ANALYSIS_WITH_RESUME
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
# December 9, 2025 - GOOGLE DRIVE ANALYSIS WITH RESUME CAPABILITY

immediate_status: GOOGLE_DRIVE_ANALYSIS_READY_FOR_TESTING
current_focus: Entity analysis to Google Drive with resume capability
no_blockers: true

# GOOGLE DRIVE ANALYSIS SYSTEM
google_drive_analysis:
  status: CODED_READY_FOR_TESTING
  features:
    - Uploads entity match CSV files directly to Google Drive (memory efficient)
    - Token refresh on 401 errors (window.tokenClient exposed globally)
    - Resume capability: Button now prompts for starting entity index
    - Browser download for summary CSV
  key_files:
    - scripts/matching/entityAnalysisToGoogleDrive.js: Main analysis and upload logic
    - scripts/googleLinks.js: Added window.tokenClient = tokenClient (line 85)
    - index.html: runGoogleDriveAnalysis() now prompts for startIndex (lines 988-1014)
  google_drive_folder_id: "1f1b7MHXsNKr3qXmqOAcLdzQVZ3sZD2tL"

# PERMUTATION MEMORY FIX (Dec 9)
permutation_fix:
  issue: Memory crash at generatePermutations() for names with many words
  root_cause: n!/(n-k)! permutations explodes exponentially (10 words = 3.6M permutations)
  fix_location: scripts/utils.js lines 422-431
  solution: MAX_WORDS_FOR_PERMUTATION = 7 (skip permutation for 8+ word names, return 0)
  safe_counts: "7! = 5,040 (acceptable), 8! = 40,320 (too many)"

# FIRE NUMBER COLLISION HANDLER - USER VERIFIED WORKING (Dec 8)
fire_number_handler_results:
  status: USER_VERIFIED_WORKING
  test_run_stats:
    registered_first_use: 1622
    merged_same_owner: 8
    suffixed_different_owner: 59
    no_fire_number: 628
    unique_entities_in_output: 2309
    fire_numbers_with_multiple_owners: 17
  verified_behaviors:
    - Merges correctly store in otherInfo.subdivision with PID as key
    - Suffixes correctly applied (72A, 72B, etc.) to both locationIdentifier.primaryAlias.term and entity.fireNumber
    - Serialization works properly (no double-encoding)
    - Entities with suffixes appear correctly in saved file

# BUGS FIXED THIS SESSION
bugs_fixed:
  1_extractPidFromEntity:
    issue: Was looking for entity.locationIdentifier.pid but VisionAppraisal stores at entity.pid
    fix: Now checks entity.pid first, then falls back to locationIdentifier structures
  2_addSubdivisionEntry:
    issue: Was calling serializeWithTypes() creating double-serialized JSON string
    fix: Now stores entity object directly (serialized properly when parent is serialized)
  3_modifyEntityFireNumberDisplay:
    issue: Was looking for entity.locationIdentifier.fireNumber but locationIdentifier IS a FireNumber object
    fix: Now correctly modifies entity.locationIdentifier.primaryAlias.term AND entity.fireNumber
  4_otherInfo_null:
    issue: Code didn't create otherInfo when null before adding subdivision entry
    fix: Now creates new OtherInfo() if matchedEntity.otherInfo is null
  5_diagnostic_console_logs:
    issue: Old diagnostic output cluttering console during entity creation
    fix: Removed 6 console.log statements from visionAppraisalNameParser.js createAggregateHousehold method

# EXAMPLE MERGED ENTITIES VERIFIED
verified_merges:
  fire_number_100:
    surviving_entity: PID 1994, BLOCK ISLAND UTILITY DISTRICT
    merged_entity: PID 1989, BLOCK ISLAND UTILITY DISTRICT
    stored_in: otherInfo.subdivision["1989"]
  fire_number_1740:
    surviving_entity: PID 273, JOSEPHINE MERCK
    merged_entity: PID 277, JOSEPHINE MERCK
    stored_in: otherInfo.subdivision["277"]

# PROJECT STACK (outermost to innermost)
project_layers:
  layer_1_analyze_matches_ui:
    status: USER_VERIFIED_WORKING
    features_verified:
      - View Details button in reconciliation modal: WORKING
      - Top Matches summary section: WORKING (sorted by score descending)
      - Reconcile button: WORKING
    features_coded_not_tested:
      - CSV export
      - True Match checkbox
    detail_reference: reference_analyzeMatchesUI.md

  layer_2_reconcile_feature:
    status: USER_VERIFIED_WORKING
    purpose: Display detailed breakdown of similarity calculation
    verified: Name Component Breakdown table displays correctly
    view_details_buttons: Added to both Base Entity and Target Entity cards in reconciliation modal
    detail_reference: reference_reconcileFeatureSpec.md
    CRITICAL_LESSON: Do NOT use ${...} interpolations inside <script> blocks in template literals

  layer_3_entity_key_uniqueness:
    status: USER_VERIFIED_WORKING
    bloomerang_format: "bloomerang:<accountNumber>:<locationType>:<locationValue>:<headStatus>"
    visionappraisal_format: "visionAppraisal:<locationType>:<locationValue>"
    note: Remaining DUPLICATE errors are from PID/FireNumber issue (separate concern, not blocking)

  layer_4_detailed_compareto:
    status: STEPS_1_5_USER_VERIFIED_WORKING
    purpose: compareTo(other, true) returns breakdown objects
    remaining: Step 6 (CSS styling) - minor polish

  layer_5_compareto_architecture:
    status: ALL_4_PHASES_TESTED_WORKING
    phases: IndividualName, Address, ContactInfo, Entity
    detail_reference: reference_compareToDirectImplementationPlan.md

  layer_6_fire_number_handler:
    status: USER_VERIFIED_WORKING
    disable_flag: COLLISION_HANDLER_DISABLED = false (ENABLED)
    implementation:
      - Uses crossTypeNameComparison from utils.js (handles IndividualName vs HouseholdName vs SimpleIdentifiers)
      - Uses compareSecondaryAddressesOnly (excludes primary Block Island addresses)
      - Address preservation logic (preserves owner address when name-only match)
      - Merges store entity in otherInfo.subdivision[pid]
      - Suffixes modify both locationIdentifier.primaryAlias.term and entity.fireNumber
    thresholds:
      overall: 0.75
      name: 0.95
      contactInfo: 0.95
    weights:
      name: 0.7
      contactInfo: 0.3
    shared_functions_in_utils_js:
      - extractNameString: line 244
      - crossTypeNameComparison: line 286

# MATCH CONFIGURATION (CURRENT)
match_config:
  percentileThreshold: 98
  minimumGroupSize: 10
  minimumScoreDefault: 0.31
  nameScoreOverride: 0.985
  individualToIndividual_minimumCutoff: 0.75  # Changed from 0.65 this session
  selection_rule: "98th percentile OR top 10; include all 100% matches beyond that count"

# CRITICAL LESSONS PRESERVED
critical_lessons:
  template_literals: Do NOT use ${...} interpolations inside <script> blocks in template literals
  key_changes: When adding new key components, ADD to existing format, do NOT replace elements
  source_identification: Use sourceMap-based test (locationIdentifier.primaryAlias.sourceMap contains 'bloomerang'), NOT accountNumber property
  autocompact_recovery: Consult reference docs before code analysis after autocompact
  fire_number_collision: Cannot use full universalCompareTo - entities have same primary address; must use NAME ONLY + SECONDARY ADDRESS ONLY comparison

# FULL PROJECT CONTEXT
full_context_reference: reference_currentWorkInProgress.md
```

---

## MANDATORY_COMPARETO_ARCHITECTURE
```yaml
# THESE REQUIREMENTS MUST BE FOLLOWED FOR ALL COMPARISON OPERATIONS

CORE_RULE:
  requirement: EVERY_APPLICATION_DEFINED_CLASS_MUST_USE_ITS_NATIVE_COMPARETO_METHOD
  scope: Entity, ContactInfo, IndividualName, Address, AttributedTerm, etc.
  not_applicable_to: JavaScript primitives (strings, numbers)
  correct_pattern: |
    // Application class - use native compareTo
    let similarity = name.compareTo(otherName);
    // String at leaf node - use levenshteinSimilarity
    let similarity = levenshteinSimilarity(firstName, otherFirstName);
  wrong_pattern: |
    // WRONG: Extracting value from application class
    let similarity = levenshteinSimilarity(attributedTerm.term, other.term);

CALL_CHAIN:
  Entity.compareTo: calls contactInfo.compareTo, otherInfo.compareTo
  ContactInfo.compareTo: calls primaryAddress.compareTo, name.compareTo
  IndividualName.compareTo: uses levenshteinSimilarity on strings
  Address.compareTo: uses levenshteinSimilarity on strings
  leaf_nodes: Classes whose weighted properties are strings

CALCULATOR_REGISTRY:
  location: scripts/utils.js COMPARISON_CALCULATOR_REGISTRY
  calculators:
    - defaultWeightedComparison: Vowel-weighted Levenshtein for names
    - addressWeightedComparison: PO Box vs General, Block Island detection
    - contactInfoWeightedComparison: Sophisticated address matching
    - entityWeightedComparison: Full entity with weight boost

SERIALIZATION_PATTERN:
  problem: Functions cannot survive JSON serialization
  solution: Store calculator NAME as string, resolve at runtime
  class_properties: [comparisonWeights, comparisonCalculatorName, comparisonCalculator]

DETAILED_PARAMETER:
  signature: compareTo(other, detailed = false)
  detailed_false: Returns number (0-1 similarity)
  detailed_true: Returns {overallSimilarity, components, method, ...}
  status: STEPS_1_4_TESTED_WORKING

WEIGHT_BOOST:
  applies_to: NAME_ONLY (never contactInfo)
  perfect_match: +12% weight if name is 100%
  high_match: +6% weight if name is >95%
```

---

## CRITICAL_TECHNICAL_PATTERNS
```yaml
APPLICATION_STARTUP:
  command: cd /home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025/BIRAVA2025 && node servers/server.js
  url: http://127.0.0.1:1337/
  api: http://127.0.0.99:3000/csv-file?file=filename.json

ENTITY_MEMORY_ACCESS:
  load_first: Click "Load All Entities Into Memory" button
  global_object: workingLoadedEntities
  bloomerang: workingLoadedEntities.bloomerang.individuals.entities[key]
  visionappraisal: workingLoadedEntities.visionAppraisal.entities[key]
  count_check: Object.keys(workingLoadedEntities.bloomerang.individuals.entities).length

BROWSER_FILE_DOWNLOAD:
  pattern: |
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "file.csv";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);

STANDARD_BROWSER_TEST_PROTOCOL:
  AI_MUST_PROVIDE:
    1_browser_refresh: YES_or_NO
    2_entity_regeneration: YES_or_NO
    3_entity_loading: YES_or_NO
    4_console_command: Exact command
  SCRIPT_PATTERN: fetch('./scripts/testing/testName.js').then(r => r.text()).then(eval)

ENTITY_TESTING_SEQUENCE:
  step_1: readBloomerangWithEntities(true, 'BATCH_ID') with SAVE=true
  step_2: Capture new config file ID from console
  step_3: User enters file ID in input box
  step_4: Click Load button
  step_5: Verify loaded entities

CRITICAL_LESSONS:
  template_literals: Do NOT use ${...} interpolations inside <script> blocks
  key_changes: When adding key components, ADD don't replace
  autocompact: Consult reference docs before code analysis after autocompact
  server_routes: Specific routes before catch-all
  household_processing: Never return null (causes data loss)
```

---

## DATA_CONTEXT
```yaml
entities_in_memory: 4105
visionappraisal: 2317 entities
bloomerang_individuals: 1792

entity_types:
  Individual: 363
  AggregateHousehold: 931
  Business: 211
  LegalConstruct: 812

multi_pid_fire_numbers: 17
```

---

## REFERENCE_NAVIGATION
```yaml
# WHEN TO READ WHICH REFERENCE DOCUMENT

CURRENT_WORK:
  reference_currentWorkInProgress.md: Full nested project context, all 6 layers detailed
  READ_WHEN: Starting session, need complete context on current work

RECONCILE_FEATURE:
  reference_reconcileFeatureSpec.md: Architecture, functions to implement, critical lessons
  READ_WHEN: Working on Reconcile button or detailed comparison display

ENTITY_KEYS:
  reference_entityKeyUniqueness.md: Key format evolution, collision fixes
  READ_WHEN: Working on entity lookup or index building

COMPARETO:
  reference_compareToDirectImplementationPlan.md: All 4 phases, calculators, test results
  READ_WHEN: Working on any compareTo or weighted comparison

ANALYZE_MATCHES:
  reference_analyzeMatchesUI.md: 6 features, CSS, data flow
  READ_WHEN: Working on match analysis window

PROJECT_OVERVIEW:
  reference_projectOverview.md: Business goals, multi-level plan, blocking chain
  READ_WHEN: Need high-level project understanding

SERIALIZATION:
  reference_serializationArchitecture.md: CLASS_REGISTRY, fromSerializedData pattern
  READ_WHEN: Working with entity serialization

SESSION_HISTORY:
  reference_sessionHistory.md: Resolved issues, completed verifications
  READ_WHEN: Checking what was already tried/fixed
```

---

## ALGORITHMIC_RESOURCES
```yaml
vowel_weighted_levenshtein:
  location: scripts/matchingTools.js levenshteinDistance()
  vowel_vowel_penalty: ~0.079 (low)
  consonant_consonant_penalty: 1.0
  status: INTEGRATED_INTO_COMPARETO

permutation_name_comparison:
  location: scripts/utils.js permutationBasedNameComparison()
  integration: defaultWeightedComparison returns MAX(weighted, permutation)
  test_file: scripts/testing/testPermutationNameComparison.js (28 tests passing)
  haircut_formula: "(1 - (1 - smaller/larger)^2.5)"  # Changed from ^3 to ^2.5 this session
  final_adjustment: -0.01 from permutation score  # Changed from -0.04 this session

component_weights:
  lastName: 0.5
  firstName: 0.4
  otherNames: 0.1

phase_weights:
  individual: {name: 0.5, contactInfo: 0.3, otherInfo: 0.15, legacyInfo: 0.05}
  household: {name: 0.4, contactInfo: 0.4, otherInfo: 0.15, legacyInfo: 0.05}

address_weights_pobox: {secUnitNum: 0.4, city: 0.25, state: 0.15, zipCode: 0.2}
address_weights_general: {streetNumber: 0.3, streetName: 0.2, zipCode: 0.4, state: 0.1}
contactinfo_weights: {primaryAddress: 0.6, secondaryAddress: 0.2, email: 0.2}
```

---

## BLOCKING_STATUS_TRACKER
```yaml
# NO ACTIVE BLOCKERS

# RESOLVED (moved to reference_sessionHistory.md for details)
resolved_items:
  - Fire number collision handler (Dec 8) - USER_VERIFIED_WORKING
  - Entity key uniqueness (Dec 7) - USER_VERIFIED_WORKING
  - View button entity lookup (Dec 6) - RESOLVED with storage key architecture
  - Cross-type name comparison (Dec 5) - RESOLVED in universalEntityMatcher
  - HouseholdInformation (Dec 3) - USER_VERIFIED_WORKING
  - All 4 phases compareTo (Dec 1) - ALL_TESTED_WORKING
  - Serialization (Nov 30) - RESOLVED
  - Empty name records (Nov 30) - RESOLVED

# PENDING WORK (not blocking)
pending_work:
  - CSV export testing
  - True Match checkbox testing
```

---

## AI_MANDATORY_PROTOCOLS
```yaml
development_protocol: INCREMENTAL_TESTING_REQUIRED
workflow: [make_single_change, test_immediately, verify_functionality, proceed]

testing_preferences:
  PREFERRED: Write test code to app files (regression value) OR display for console copy-paste
  AVOID: Full HTML test page without justification

completion_requirements:
  forbidden: [COMPLETE, IMPLEMENTED, SOLVED, ACHIEVED, DONE, SUCCESSFUL]
  permitted: [coded_not_tested, ready_for_testing, in_progress, pending, blocked]

MANDATORY_BACKUP:
  command: cp "/home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025/CLAUDE.md" "/home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025/BIRAVA2025/CLAUDE_BACKUP.md"
```

---

## SESSION_METADATA
```yaml
last_updated: December_9_2025
document_version: 35.0_GOOGLE_DRIVE_ANALYSIS_WITH_RESUME
previous_version: 34.0_DOUBLE_LETTER_SUFFIX_BUG_IN_PROGRESS

session_progress:
  dec9_session:
    - Fixed permutation memory explosion in utils.js (MAX_WORDS_FOR_PERMUTATION = 7)
    - Added window.tokenClient = tokenClient in googleLinks.js for token refresh
    - Added resume capability: runGoogleDriveAnalysis() now prompts for startIndex
    - Token refresh logic in entityAnalysisToGoogleDrive.js with 401 retry
    - Analysis ran to entity 541 before first auth failure (token refresh now available)
  dec8_early_session:
    - Source identification fix (sourceMap-based test in universalEntityMatcher.js)
    - View Details button fix (complete entityWrapper for renderEntityDetailsWindow)
    - Top Matches section added (sorted by score descending)
  dec8_mid_session:
    - Individual minimumCutoff changed from 0.65 to 0.75
    - Permutation adjustment changed from -0.04 to -0.01
    - Permutation haircut exponent changed from ^3 to ^2.5
  dec8_late_session:
    - Added extractNameString to utils.js (line 244) - extracts comparable string from any name type
    - Added crossTypeNameComparison to utils.js (line 286) - compares names using levenshteinSimilarity
    - Updated universalEntityMatcher.js - removed local functions, uses utils.js (tested: 4103 comparisons in 198ms)
    - Updated fireNumberCollisionHandler.js - uses crossTypeNameComparison from utils.js
    - Changed SAME_OWNER_THRESHOLDS.overall from 0.92 to 0.75
    - Added address preservation logic (when name match but low contactInfo, preserve owner address as secondary)
  dec8_final_session:
    - Created comprehensive test file: scripts/testing/testAllFireNumberCollisions.js
    - Tests ALL 20 fire numbers with collisions (67 duplicate entries total)
    - Key insight: locationIdentifier.primaryAlias.term is a NUMBER (e.g., 631), NOT a string
    - The "FireNumber:" prefix in keys comes from class name (locationType), not the term value
    - Test file loads fireNumberCollisionHandler.js via fetch().then(eval) before running comparisons
    - Found interesting collision groups (Fire Number 72 has 35 entities!)
  verified_working:
    - View Details buttons in reconciliation modal
    - Top Matches summary section
    - Reconcile button functionality
    - Source identification (VisionAppraisal vs Bloomerang)
    - extractNameString handles all 4 name types
    - crossTypeNameComparison works for cross-type comparisons
    - universalEntityMatcher with shared utils.js functions
    - Fire number collision handler (8 merges, 59 suffixes, entities saved correctly)

session_state:
  no_blockers: true
  current_focus: Google Drive analysis with resume capability
  pending_work_deferred: CSV export testing, True Match checkbox testing
  ready_for_testing: Entity analysis to Google Drive (user can resume from any index)

# KEY ARCHITECTURAL DECISIONS THIS SESSION
architectural_decisions:
  code_sharing:
    issue: Fire number collision handler was duplicating cross-type comparison code
    solution: Moved extractNameString and crossTypeNameComparison to utils.js for shared use
    files_using: universalEntityMatcher.js, fireNumberCollisionHandler.js

  address_preservation:
    issue: When merging entities based on name match, might lose valid owner address
    solution: If name>95% but contactInfo<95%, add discarded entity's owner address to surviving entity's secondary addresses
    location: fireNumberCollisionHandler.js lines 494-516

  fire_number_lookup:
    issue: Fire number extraction was failing with str.match errors
    wrong_approaches_tried:
      - locId.toString() - returns [object Object]
      - String matching "FireNumber:631" - term doesn't include prefix
    correct_approach: Number(locId.primaryAlias.term) - term is already the numeric fire number
    explanation: The "FireNumber:" prefix comes from locationType class name, not the term value

# POTENTIAL SAME_OWNER CASES IDENTIFIED
potential_same_owner_cases:
  - Fire Number 1740: Two "JOSEPHINE MERCK" entities (definite same person)
  - Fire Number 351: "HAYDE EDWARD F & DIANE L" vs "HAYDE HOUSEHOLD" (likely same)
  - Fire Number 472: "ERIN O;NEIL" vs "ERIN O'NEIL" (same person with typo)
  - Fire Number 27: Multiple "WOHL, BENNET I & KENNETH" entries

working_directory: /home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025
platform: linux
```
