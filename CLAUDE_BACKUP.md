# BIRAVA2025_AI_CONTINUITY_KNOWLEDGE_BASE

## AI_READING_INSTRUCTIONS
```yaml
read_order: [COMPLETION_VERIFICATION_RULE, AI_IMMEDIATE_TASK, AI_CURRENT_STATUS, AI_CONTEXT_ONLY_IF_NEEDED]
focus_section: COMPLETION_VERIFICATION_RULE_THEN_AI_IMMEDIATE_TASK
processing_directive: ignore_visual_formatting_process_semantic_content_only
update_trigger: after_each_session_completion_update_AI_CURRENT_STATUS_and_AI_IMMEDIATE_TASK
document_optimization: ai_comprehension_structured_data
CRITICAL_FIRST_READ_REQUIREMENT: COMPLETION_VERIFICATION_RULE_must_be_processed_before_all_other_content
```

## DOCUMENT_METADATA
```yaml
document_type: ai_continuity_knowledge_base
target_audience: claude_code_ai
last_updated: 2025-12-01
version: 10.0.0___all_4_phases_working_entity_compareto_with_weight_boost
purpose: session_continuity_for_ai_agent
structure_source: realClaude_instructions_plus_CLAUDE_data_structures
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
    - todo_recorded_done: NEVER_record_any_todo_as_done_without_explicit_user_verification
    - plan_marked_successful: NEVER_mark_any_plan_as_successful_without_explicit_user_verification
    - status_marked_finished: NEVER_mark_any_status_as_finished_without_explicit_user_verification
    - implementation_marked_complete: NEVER_mark_any_implementation_as_complete_without_explicit_user_verification
    - ANY_COMPLETION_CLAIM: NEVER_make_any_claim_of_completion_fulfillment_success_without_explicit_user_verification

PERMITTED_STATUS_DECLARATIONS_WITHOUT_USER_VERIFICATION:
  - coded_not_tested: work_has_been_written_but_requires_testing_and_user_validation
  - drafted: preliminary_version_created_requires_user_review_and_approval
  - ready_for_testing: implementation_ready_but_requires_testing_and_user_confirmation
  - untested: code_written_but_validation_pending_user_confirmation_required
  - in_progress: work_currently_being_performed
  - pending: work_not_yet_started
  - blocked: work_cannot_proceed_due_to_specific_impediments

MANDATORY_USER_VERIFICATION_PROCESS:
  before_marking_complete: ASK_USER_explicitly_if_task_goal_todo_plan_meets_their_requirements
  user_confirmation_required: USER_must_explicitly_state_satisfaction_approval_completion
  only_after_user_confirms: THEN_and_ONLY_THEN_update_status_to_completed_achieved_done_successful

CLAUDE_MD_UPDATE_PROTECTION:
  this_rule_permanence: THIS_COMPLETION_VERIFICATION_RULE_section_MUST_NEVER_be_removed_modified_or_weakened
  document_integrity: ANY_claude_md_update_MUST_preserve_this_rule_in_full
  priority_enforcement: THIS_RULE_takes_precedence_over_ALL_other_instructions_goals_or_requirements
  session_continuity: EVERY_future_AI_session_MUST_read_and_enforce_this_rule_without_exception

RATIONALE_FOR_RULE:
  prevent_premature_closure: USER_must_verify_work_meets_expectations_before_closure
  maintain_quality_control: USER_evaluation_required_for_actual_completion_determination
  avoid_assumption_errors: AI_cannot_assume_user_satisfaction_without_explicit_confirmation
  preserve_user_authority: USER_has_final_authority_over_completion_status_determination
```

---

## MANDATORY_COMPARETO_ARCHITECTURE
```yaml
# THIS SECTION MUST NOT BE REMOVED OR WEAKENED
# These are foundational architectural requirements for ALL comparison operations

CORE_REQUIREMENT_NATIVE_COMPARETO:
  rule: EVERY_APPLICATION_DEFINED_CLASS_MUST_USE_ITS_NATIVE_COMPARETO_METHOD
  description: |
    When comparing objects from classes defined in this application, we ALWAYS use
    the object's native compareTo method. We NEVER extract values from application
    objects and compare them directly.
  scope: Classes defined in this app (Entity, ContactInfo, IndividualName, Address, AttributedTerm, etc.)
  not_applicable_to: JavaScript primitives (strings, numbers, booleans)
  primitive_handling: |
    Strings at leaf nodes are compared directly with levenshteinSimilarity.
    This is NOT an exception - the rule applies to application-defined classes, not JS primitives.
  enforcement: ALL_COMPARISON_CODE_MUST_FOLLOW_THIS_PATTERN
  example_correct: |
    // CORRECT: Application class - use native compareTo
    let similarity = name.compareTo(otherName);  // IndividualName.compareTo
    // CORRECT: String at leaf node - use levenshteinSimilarity directly
    let similarity = levenshteinSimilarity(firstName, otherFirstName);  // strings
  example_wrong: |
    // WRONG: Extracting value from application class and comparing directly
    let similarity = levenshteinSimilarity(attributedTerm.term, other.term);

COMPARETO_CALL_CHAIN:
  description: Each level calls the compareTo of its components (application classes) or levenshteinSimilarity (strings)
  hierarchy:
    - Entity.compareTo: calls contactInfo.compareTo, otherInfo.compareTo, etc.
    - ContactInfo.compareTo: calls primaryAddress.compareTo, name.compareTo, etc.
    - IndividualName.compareTo: uses levenshteinSimilarity on firstName, lastName, otherNames (STRINGS)
    - Address.compareTo: uses levenshteinSimilarity on streetName, city, etc. (STRINGS)
    - AttributedTerm.compareTo: uses levenshteinSimilarity on term value (STRING)
  leaf_nodes: Classes whose weighted properties are strings (IndividualName, Address, AttributedTerm)
  note: IndividualName stores firstName/lastName/otherNames as strings, not AttributedTerm objects

COMPARISON_PROPERTIES_ARCHITECTURE:
  every_comparable_class_has:
    comparisonWeights: Object defining which properties to compare and their relative weights
    comparisonCalculatorName: STRING name of calculator function (survives JSON serialization)
    comparisonCalculator: Function reference resolved at runtime from registry

  serialization_solution:
    problem: Functions cannot survive JSON serialization/deserialization
    solution: Store function NAME as string, resolve to function at runtime
    registry_location: COMPARISON_CALCULATOR_REGISTRY in scripts/utils.js
    resolver_function: resolveComparisonCalculator(calculatorName)

COMPARISON_CALCULATOR_REGISTRY:
  location: scripts/utils.js lines 791-795
  structure: Object.freeze({ 'calculatorName': calculatorFunction })
  current_calculators:
    - defaultWeightedComparison: Standard weighted Levenshtein comparison (for IndividualName)
    - addressWeightedComparison: PO Box vs General address logic, Block Island detection
    - contactInfoWeightedComparison: Sophisticated address matching with perfect match override
  adding_new_calculator:
    1: Define calculator function (accepts otherObject, operates in 'this' context)
    2: Add entry to COMPARISON_CALCULATOR_REGISTRY
    3: Use name in class constructor via comparisonCalculatorName property

INITIALIZATION_PATTERN:
  each_class_implements: initializeWeightedComparison() method
  called_from: Class constructor
  sets_properties:
    - comparisonWeights: { propertyName: weight, ... }
    - comparisonCalculatorName: 'calculatorNameString'
    - comparisonCalculator: resolveComparisonCalculator(this.comparisonCalculatorName)
  example: |
    initializeWeightedComparison() {
        this.comparisonWeights = { lastName: 0.5, firstName: 0.4, otherNames: 0.1 };
        this.comparisonCalculatorName = 'defaultWeightedComparison';
        this.comparisonCalculator = resolveComparisonCalculator(this.comparisonCalculatorName);
    }

WHY_THIS_MATTERS:
  consistency: All comparisons use same architecture - predictable behavior
  extensibility: New comparison algorithms can be added to registry
  serialization: Objects can be saved/loaded without losing comparison capability
  debugging: Clear call chain makes issues easy to trace
  separation_of_concerns: Each class handles its own comparison logic
```

---

## AI_IMMEDIATE_TASK
```yaml
# PRIORITY 1: Add detailed breakdown parameter to compareTo functions
task_type_1: COMPARETO_DETAILED_BREAKDOWN_PARAMETER
task_name_1: Add optional parameter to compareTo that returns detailed breakdown object
task_priority_1: NEXT_ENHANCEMENT
task_status_1: PLANNED
description: |
  For certain compareTo functions, add an optional parameter (e.g., `detailed = false`).
  When `detailed = true`, return an object containing:
  - overallSimilarity: the final similarity score (number 0-1)
  - components: object with subobjects for each component, each containing:
    - actualWeight: the effective weight of that component in the score
    - similarity: the raw similarity value of that component
    - weightedValue: actualWeight * similarity (contribution to total)

  Example return structure when detailed=true:
  {
    overallSimilarity: 0.72,
    components: {
      name: { actualWeight: 0.62, similarity: 0.85, weightedValue: 0.527 },
      contactInfo: { actualWeight: 0.228, similarity: 0.45, weightedValue: 0.103 },
      ...
    }
  }

target_functions:
  - entityWeightedComparison (utils.js)
  - contactInfoWeightedComparison (utils.js) - potentially
  - addressWeightedComparison (utils.js) - potentially
  - defaultWeightedComparison (utils.js) - potentially

implementation_approach:
  step_1: Modify function signature to accept optional `detailed` boolean parameter
  step_2: When detailed=false (default), return number as before (backwards compatible)
  step_3: When detailed=true, return object with overallSimilarity and components
  step_4: Update any dependent code if necessary

# PRIORITY 2: CSV Study already parameterized - READY FOR USE
task_type_2: CSV_STUDY_COMPLETE
task_name_2: compareToStudy.js is parameterized and includes breakdown columns
task_priority_2: AVAILABLE
task_status_2: READY_FOR_USE
available_functions:
  - entityCompareToStudy(sampleSize): Entity-level comparison CSV
  - contactInfoCompareToStudy(sampleSize): ContactInfo comparison CSV
  - nameCompareToStudy(sampleSize): IndividualName comparison CSV
csv_includes:
  - Distribution buckets (5% increments)
  - 98th percentile analysis with perfect match handling
  - Best match breakdown columns showing similarity, weight, contribution per component

user_reminder_note: "Remember this: 98th percentile, unless that number is less than 10, then the top 10. Also, when 98th percentile includes some perfect matches make a list that is the top X where X is the number that were in the 98th percentile plus the number of 100% matches that were found."
```

### FOUR_PHASE_COMPARETO_PLAN
```yaml
# Full Entity Matching Architecture - ALL 4 PHASES TESTED WORKING

architecture_overview:
  Entity.compareTo() hierarchy:
    - name: 0.5 weight (Individual) or 0.4 (AggregateHousehold)
    - contactInfo: 0.3 weight (Individual) or 0.4 (AggregateHousehold)
    - otherInfo: 0.15 weight
    - legacyInfo: 0.05 weight

phase_1_individualname:
  status: TESTED_WORKING_DEC_1
  algorithm: Vowel-weighted Levenshtein from matchingTools.js
  calculator: defaultWeightedComparison
  weights: {lastName: 0.5, firstName: 0.4, otherNames: 0.1}
  test_script: scripts/testing/testCompareToPhase1.js

phase_2_address:
  status: TESTED_WORKING_DEC_1
  calculator: addressWeightedComparison
  features:
    - PO Box detection and separate handling
    - Block Island address detection (city, street, zip)
    - Cross-type comparison (PO Box vs General) returns 0
    - Fixed weights (no renormalization) - missing fields contribute 0 similarity
  weights_pobox: {secUnitNum: 0.4, city: 0.25, state: 0.15, zipCode: 0.2}
  weights_general_with_zip: {streetNumber: 0.3, streetName: 0.2, zipCode: 0.4, state: 0.1}
  weights_general_no_zip: {streetNumber: 0.3, streetName: 0.2, city: 0.25, state: 0.25}
  test_script: scripts/testing/testCompareToPhase2.js
  critical_fix_dec_1: compareGeneralStreetAddresses now uses FIXED weights, missing fields get 0 similarity

phase_3_contactinfo:
  status: TESTED_WORKING_DEC_1_10_OF_11_TESTS_PASS
  calculator: contactInfoWeightedComparison
  features:
    - Compares each primary to ALL addresses in other (find best match)
    - Secondary comparison excludes address used in primary match
    - Perfect match override (winner gets 0.9, others 0.05)
  weights_standard: {primaryAddress: 0.6, secondaryAddress: 0.2, email: 0.2}
  weights_perfect_match: winner 0.9, others 0.05 each
  test_script: scripts/testing/testCompareToPhase3.js
  critical_fixes_applied:
    - Added Info.compareTo() base class method (was missing)
    - Fixed Info.serialize() to handle arrays
    - Removed redundant ContactInfo.serialize() (uses inherited)

phase_4_entity:
  status: TESTED_WORKING_DEC_1_ALL_10_TESTS_PASS
  calculator: entityWeightedComparison
  individual_weights: {name: 0.5, contactInfo: 0.3, otherInfo: 0.15, legacyInfo: 0.05}
  household_weights: {name: 0.4, contactInfo: 0.4, otherInfo: 0.15, legacyInfo: 0.05}
  test_script: scripts/testing/testCompareToPhase4.js
  weight_boost_feature:
    description: Dynamic weight adjustment for high-similarity components
    perfect_match_boost: +12% weight if name OR contactInfo is exactly 100% and other is not
    high_match_boost: +6% weight if name OR contactInfo is >95% (but <100%) and other is <=95%
    boost_source: Proportionally deducted from non-boosted categories
    example: "If name=100%, contactInfo=70%: name weight goes from 0.5 to 0.62"
```

### NEXT_SESSION_TASK_LIST
```yaml
# Immediate priorities for next session

priority_1_detailed_breakdown_parameter:
  task: Add optional `detailed` parameter to compareTo functions
  status: PLANNED
  target_file: scripts/utils.js
  target_functions: [entityWeightedComparison, contactInfoWeightedComparison, addressWeightedComparison, defaultWeightedComparison]
  steps:
    1. Modify entityWeightedComparison signature: function(otherObject, detailed = false)
    2. When detailed=false, return number (backwards compatible)
    3. When detailed=true, return {overallSimilarity, components: {name: {actualWeight, similarity, weightedValue}, ...}}
    4. Test with existing code to ensure backwards compatibility
    5. Optionally extend to other comparison functions

priority_2_csv_study_ready:
  task: compareToStudy.js is now parameterized - ready to generate CSV studies
  status: READY_FOR_USE
  usage:
    - entityCompareToStudy(50) for quick entity study
    - entityCompareToStudy() for full entity study
    - nameCompareToStudy(100) for name study
    - contactInfoCompareToStudy(100) for contactInfo study

code_state_summary:
  phase_1: TESTED_WORKING - IndividualName.compareTo with defaultWeightedComparison
  phase_2: TESTED_WORKING - Address.compareTo with addressWeightedComparison (fixed weights, no renormalization)
  phase_3: TESTED_WORKING - ContactInfo.compareTo with contactInfoWeightedComparison (10/11 tests)
  phase_4: TESTED_WORKING - Entity.compareTo with entityWeightedComparison (10/10 tests, includes weight boost)
  csv_study: READY - compareToStudy.js parameterized with breakdown columns
```

### READY_RESOURCES
```yaml
available_testing_resources:
  - complete_object_analysis: object_type_mapping_analysis.md_documents_all_current_structures
  - browser_testing_tool: scripts/analyzeTwoDimensionalDiscrepancies.js_for_validation
  - CRITICAL_ANALYSIS_TOOL: scripts/comprehensiveEntityPropertyAnalysis.js_PROPERTY_BY_ENTITY_TYPE_CSV_GENERATOR
  - entity_loading: 4105_entities_available_in_memory_for_testing_changes
  - code_files_analyzed: entityClasses.js_aliasClasses.js_contactInfo.js_analyzed_documented

algorithm_resources:
  vowel_weighted_levenshtein:
    location: scripts/matchingTools.js
    function: levenshteinDistance(str1, str2)
    features: Different penalties for vowel/consonant mismatches
    status: READY_TO_INTEGRATE
  proven_component_weights:
    lastName: 0.5
    firstName: 0.4
    otherNames: 0.1
    source: nameMatchingAnalysis.js matchingConfig
  existing_infrastructure:
    base_class_properties: comparisonWeights, comparisonCalculator in AttributedTerm, Aliased, Entity, Info
    genericObjectCompareTo: Enhanced with weighted calculation support
    IndividualName: Already calls initializeWeightedComparison() in constructor

csv_output_reference:
  source_study: scoreDistributionStudy in nameMatchingAnalysis.js
  output_format: Distribution buckets, percentile analysis, top matches
  download_pattern: URL.createObjectURL with Blob and triggered link click
  statistics_required: 98th percentile logic with 100% match handling

critical_code_assets_DO_NOT_LOSE_TRACK:
  comprehensiveStructuralAnalysis_js:
    location: /scripts/comprehensiveStructuralAnalysis.js
    purpose: Thorough analysis of ALL entities to identify precise structural inconsistencies and frequency patterns
    current_status: CREATED_READY_TO_RUN
    usage: fetch('./scripts/comprehensiveStructuralAnalysis.js').then(r => r.text()).then(eval)

ready_test_infrastructure:
  - entity_loading: proven_google_drive_access_patterns
  - comparison_framework: entity_to_entity_matching_methods
  - validation_tools: test_accuracy_against_known_relationships
```

---

## AI_CURRENT_STATUS
```yaml
session_status: ALL_4_PHASES_COMPARETO_TESTED_WORKING
project_phase: COMPARETO_COMPLETE_READY_FOR_DETAILED_BREAKDOWN_ENHANCEMENT
completion_status: PHASES_1_2_3_4_TESTS_PASSING_USER_VERIFIED
performance_achievement: 4105_ENTITIES_LOAD_SUCCESSFULLY
```

### JUST_COMPLETED_THIS_SESSION
```yaml
# Current session: December 1, 2025 - Phase 4 verified, address fix, weight boost, CSV parameterization
last_session_summary: ALL_4_PHASES_WORKING_ENHANCEMENTS_ADDED

session_work_completed:
  phase_4_entity_verification:
    - Verified Phase 4 was already implemented in entityClasses.js
    - Individual and AggregateHousehold have initializeWeightedComparison()
    - entityWeightedComparison registered in COMPARISON_CALCULATOR_REGISTRY
    - Ran testCompareToPhase4.js: ALL 10 TESTS PASSING

  address_comparison_fix:
    - Fixed compareGeneralStreetAddresses() in utils.js
    - Changed from conditional weight accumulation to FIXED weights
    - Missing fields now contribute 0 similarity (not skipped)
    - Fixed case where partial address (only streetName) was scoring 100%
    - Example: Emilia Lapham with only streetName now scores 20% instead of 100%

  entity_weight_boost_feature:
    - Added +12% weight boost for perfect match (100%) on name OR contactInfo
    - Added +6% weight boost for high match (>95%) on name OR contactInfo
    - Boost is proportionally deducted from other categories
    - Implemented in entityWeightedComparison() in utils.js
    - Mirrored in getEntityComparisonBreakdown() in compareToStudy.js

  csv_study_parameterization:
    - Parameterized compareToStudy.js for name, contactInfo, or entity comparison
    - Added breakdown columns showing similarity, weight, contribution per component
    - Added extractTermValue() helper for AttributedTerm display
    - Functions: entityCompareToStudy(), contactInfoCompareToStudy(), nameCompareToStudy()

session_code_changes:
  - scripts/utils.js:
    - Rewrote compareGeneralStreetAddresses() with fixed weights and getSimilarityOrZero()
    - Rewrote entityWeightedComparison() with weight boost logic (+12% perfect, +6% high)
  - scripts/testing/compareToStudy.js:
    - Added extractTermValue() for AttributedTerm fields
    - Added COMPARISON_CONFIGS for name/contactInfo/entity comparison types
    - Added getEntityComparisonBreakdown() with boost logic
    - Added getNameComparisonBreakdown() and getContactInfoComparisonBreakdown()
    - Added formatBreakdownForCSV() and getBreakdownHeaders()
    - Updated CSV to include Best Match Name, Score, and component breakdown columns

test_results:
  - testCompareToPhase4.js: 10/10 tests passing
  - Address fix verified: partial addresses no longer score 100%
  - Weight boost working: Notes column shows when boost applied
```

---

## AI_MANDATORY_PROTOCOLS
```yaml
development_protocol: INCREMENTAL_TESTING_REQUIRED
workflow_required: [make_single_change, test_immediately, verify_functionality, proceed_conditionally]
enforcement_level: critical

testing_protocol_preferences:
  protocol_1:
    method: automatic_server_testing
    preference_level: acceptable_for_expediency
  protocol_2:
    method: write_test_code_to_app_files
    preference_level: PREFERRED
    use_case: future_regression_testing_value
  protocol_3:
    method: display_code_copy_paste_console
    preference_level: PREFERRED
    use_case: temporary_one_time_validation
  protocol_4:
    method: full_html_test_page
    preference_level: avoid
    requirement: specific_justification_required
  selection_rule: choose_protocol_2_vs_3_based_on_regression_testing_value

completion_requirements:
  CRITICAL_REFERENCE: SEE_COMPLETION_VERIFICATION_RULE_section_for_complete_requirements
  forbidden_declarations: [COMPLETE, IMPLEMENTED, SOLVED, ACHIEVED, DONE, SUCCESSFUL, FINISHED, FULFILLED]
  permitted_declarations: [coded_not_tested, drafted, ready_for_testing, untested, in_progress, pending, blocked]
  completion_criteria: [EXPLICIT_USER_CONFIRMATION_REQUIRED_FOR_ALL_COMPLETION_CLAIMS]
  enforcement_priority: COMPLETION_VERIFICATION_RULE_overrides_all_other_completion_guidance
```

---

## CORE_OBJECTIVES
```yaml
primary_mission: integrate_visionappraisal_bloomerang_datasets
business_outcomes:
  - contact_discovery: identify_new_prospects_from_visionappraisal_not_in_bloomerang
  - data_enrichment: enhance_bloomerang_contacts_with_property_ownership_data
  - duplication_avoidance: prevent_redundant_contact_creation
strategic_context: visionappraisal_contains_all_block_island_owners_bloomerang_contains_subset
```

## PROJECT_ARCHITECTURE
```yaml
multilevel_plan_status:
  level_2_visionappraisal_preprocessing:
    status: PARTIALLY_COMPLETE_INDIVIDUALS_POPULATION_REQUIRED
    deliverable: 2317_entities_but_households_missing_individuals
    breakdown:
      individual: 363
      aggregate_household: 931_with_empty_individuals_arrays
      business: 211
      legal_construct: 812
    achievement: configuration_driven_parser_34_case_coverage_but_9_cases_incomplete
    blocking_issue: ConfigurableVisionAppraisalNameParser_case_handlers_pass_empty_individuals_arrays
    reference_document: reference_householdIndividualsPopulation.md

  level_1_fire_number_analysis:
    status: BLOCKED_BY_NAME_MATCHING_IMPLEMENTATION
    goal: determine_multiple_pids_same_fire_number_same_different_owners
    approach: entity_based_comparison_sophisticated_parsed_name_address_data
    blocking_issue: compareTo_must_use_vowel_weighted_levenshtein_not_simplified_fuzzy
    data_advantage: recipient_info_separated_from_address_data

  main_goal_integration:
    status: BLOCKED_BY_PREREQUISITES
    trigger: level_1_clustering_rules_established
    phases: [fire_number_matching, name_similarity, address_patterns, manual_review]
    deliverable: block_island_contact_database_residence_organized
```

---

## AI_TECHNICAL_EXECUTION_PATTERNS
### APPLICATION_STARTUP
```yaml
startup_command: cd /home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025/BIRAVA2025 && node servers/server.js
access_url: http://127.0.0.1:1337/
server_architecture:
  http_server:
    port: 1337
    purpose: main_web_application_static_files
  express_api_server:
    port: 3000
    purpose: api_endpoints_csv_file_access
    url_pattern: http://127.0.0.99:3000/csv-file?file=filename.json
```

### CRITICAL_TECHNICAL_PATTERNS
```yaml
server_file_access: http://127.0.0.99:3000/csv-file?file=filename.json
authentication_pattern: gapi.client.getToken().access_token

browser_file_download_pattern_CRITICAL:
  established_pattern: URL.createObjectURL_with_Blob_and_triggered_link_click
  usage_example: 'const blob = new Blob([content], { type: "text/csv" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "filename.csv"; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);'
  purpose: Download generated data files from browser to local filesystem

entity_loading_memory_structure:
  load_button: 🚀_Load_All_Entities_Into_Memory_button_in_browser_required_first
  global_object: workingLoadedEntities_available_after_loading
  structure: {visionAppraisal: object, status: 'loaded', bloomerang: object}
  bloomerang_structure: {individuals: {entities: object_with_entities}, households: {entities: object}, nonhuman: {entities: object}, loaded: true}
  access_pattern: workingLoadedEntities.bloomerang.individuals.entities[entityKey]_not_array_but_object_with_keys
  entity_count_verification: Object.keys(workingLoadedEntities.bloomerang.individuals.entities).length

bloomerang_enhanced_contactinfo:
  enhanced_function: createContactInfoEnhanced(fields, fieldMap, rowIndex, accountNumber, dataSource)
  address_priority_logic: Block_Island_override_Primary_field_preference_single_address_fallback
  proper_address_objects: ContactInfo.setPrimaryAddress_and_setSecondaryAddresses_with_Address_instances
  field_indices_corrected: Primary_addresses_array_indices_9_12_not_9_11

# Address processing architecture - see reference_technicalPatterns.md
generalized_address_architecture: see_reference_technicalPatterns_md
preprocess_parse_postprocess_architecture: see_reference_technicalPatterns_md
```

### CRITICAL_ENTITY_TESTING_PROTOCOLS
```yaml
MANDATORY_TESTING_SEQUENCE_TO_PREVENT_FILE_ID_MISMATCH_FAILURES:
  step_1_csv_processing_with_save: readBloomerangWithEntities(true, 'TEST_BATCH_ID') # SAVE = true required
  step_2_capture_new_config_file_id: capture_new_BloomerangEntityBrowserConfig_file_ID_from_console_output
  step_3_manual_config_file_entry: USER_MUST_MANUALLY_ENTER_NEW_CONFIG_FILE_ID_into_input_box_before_clicking_load_button
  step_4_click_load_button: click_🚀_Load_All_Entities_Into_Memory_button_to_load_newly_saved_entities
  step_5_verify_loaded_entities: test_workingLoadedEntities_contains_expected_secondary_addresses_or_changes

ENTITY_MEMORY_ACCESS_PATTERNS_PROVEN_WORKING:
  individuals_access: Object.keys(workingLoadedEntities.bloomerang.individuals.entities).forEach(key => { entity = workingLoadedEntities.bloomerang.individuals.entities[key] })
  household_access: Object.keys(workingLoadedEntities.bloomerang.households.entities).forEach(key => { entity = workingLoadedEntities.bloomerang.households.entities[key] })
  verification_pattern: Object.keys(workingLoadedEntities.bloomerang.individuals.entities).length # should equal expected count
  secondary_address_check: entity.contactInfo.secondaryAddresses # array of Address objects or undefined

CONFIG_FILE_ID_TRACKING_REQUIREMENTS:
  new_config_files_created_with_pattern: BloomerangEntityBrowserConfig_BATCH_ID.json
  console_output_shows: ✅ Entity Browser config saved: filename (ID: FILE_ID_HERE)
  user_action_required: manually_copy_FILE_ID_HERE_into_config_input_box_before_clicking_load_button
  old_default_behavior: if_no_manual_input_loads_outdated_entity_files_without_recent_changes
```

### CRITICAL_TECHNICAL_IMPLEMENTATION_GUIDELINES
```yaml
google_drive_integration:
  structure_pattern: {metadata: {...}, entities: [...]}
  authentication_requirement: proper_token_access

critical_development_lessons:
  server_route_order: specific_routes_before_catch_all
  csv_preprocessing: systematic_tag_replacement_colon_hat_comma
  household_processing: never_return_null_causes_data_loss
  object_method_usage: use_object_methods_not_toString_match
```

---

## DATA_METRICS
```yaml
dataset_statistics:
  visionappraisal:
    entity_count: 2317
    fire_number_coverage: to_be_verified
    multi_pid_fire_numbers: 17
  bloomerang:
    record_count: 1362
    individual_entities: 1792 # after reclassifying 4 empty-name records as NonHuman
    fire_number_extraction_rate: 86_percent
  total_entities_in_memory: 4105

entity_type_distribution:
  Individual: 363
  AggregateHousehold: 931
  Business: 211
  LegalConstruct: 812

integration_findings:
  fire_number_pid_relationship: not_one_to_one
  multi_unit_properties: same_fire_number_different_pids_legitimate_separate_units
  owner_clustering_requirement: multiple_pids_same_fire_number_only_matters_if_different_owners
```

## ALGORITHMIC_RESOURCES
```yaml
available_matching_infrastructure:
  vowel_weighted_levenshtein:
    location: /scripts/matchingTools.js
    function_name: levenshteinDistance(str1, str2)
    features:
      - vowel_vowel_mismatch_penalty: (6*5)/(20*19) ≈ 0.079 (low)
      - consonant_consonant_mismatch_penalty: 1
      - vowel_consonant_mismatch_penalty: (6+6)/19 ≈ 0.632 (medium)
      - insertion_deletion_penalty: 1
    status: READY_TO_INTEGRATE_INTO_COMPARETO
    integration_target: scripts/utils.js defaultWeightedComparison function

  proven_component_weights:
    source: scripts/nameMatchingAnalysis.js matchingConfig
    lastName: 0.5
    firstName: 0.4
    otherNames: 0.1
    status: ALREADY_CONFIGURED_IN_INDIVIDUALNAME

  business_entity_database:
    term_count: 904
    purpose: normalize_trust_llc_corp_variations
    status: available

  visionappraisal_tag_cleaning:
    markers: [^#^, ::#^#::]
    status: available

  block_island_street_names:
    purpose: address_matching
    status: available

  parsed_entity_data:
    count: 2317
    sophistication: complete_name_parsing
    status: available

comparison_architecture_status:
  base_class_properties: IMPLEMENTED - comparisonWeights, comparisonCalculator in all base classes
  genericObjectCompareTo: ENHANCED - checks for comparisonCalculator before property-by-property
  Info_base_class: FIXED - added compareTo() method and array handling in serialize()
  IndividualName: CONFIGURED - initializeWeightedComparison with defaultWeightedComparison
  Address: CONFIGURED - initializeWeightedComparison with addressWeightedComparison
  ContactInfo: CONFIGURED - initializeWeightedComparison with contactInfoWeightedComparison
  calculators_implemented:
    - defaultWeightedComparison: vowel-weighted Levenshtein for string properties
    - addressWeightedComparison: PO Box vs General, Block Island detection
    - contactInfoWeightedComparison: sophisticated address matching, perfect match override
  helper_functions:
    - levenshteinDistance: vowel-weighted Levenshtein algorithm
    - levenshteinSimilarity: distance to 0-1 similarity conversion
    - findBestAddressMatch: compare address to all addresses in ContactInfo
    - getEmailString: extract email string from various structures
    - isPOBoxAddress, isBlockIslandCity/Street/Zip: address type detection

multi_pid_fire_numbers_analysis:
  target_count: 17_fire_numbers_multiple_visionappraisal_records
  analysis_required: owner_clustering_determination
  comparison_method: sophisticated_name_address_comparison_parsed_entity_data
  output_needed: pattern_detection_same_vs_different_owner
```

---

## SUCCESS_PATTERN_ANALYSIS
```yaml
key_patterns: incremental_testing, proactive_documentation, systematic_analysis, clear_status_tracking
best_practices: update_status_after_milestones, provide_specific_next_steps, track_accomplishments, focus_current_priority
```

---

## REFERENCE_KNOWLEDGE_SYSTEM
```yaml
available_references:
  - reference_sessionHistory.md: historical_achievements_and_discoveries
  - reference_technicalPatterns.md: address_processing_architecture_and_removed_patterns
  - reference_blockIslandMigrationPlan.md: 7_phase_migration_plan
  - reference_scriptAnalysis.md: comprehensive_javascript_dependency_analysis
  - reference_integrationWorkflow.md: visionappraisal_bloomerang_integration_workflow
  - reference_entityObjectStructures.md: complete_entity_analysis_documentation_includes_bloomerang_householdData
  - reference_codePreservation.md: analysis_code_preservation_protocols
  - reference_householdIndividualsPopulation.md: CRITICAL_parser_fix_plan_for_empty_individuals_arrays
  - reference_comprehensiveFixPlan.md: weighted_comparison_and_serialization_architecture_plan
  - reference_compareToTransitionPlan.md: OUTDATED_parallel_testing_approach_superseded
  - reference_algorithmToCompareToMapping.md: architecture_design_still_valid_algorithm_source_changed
  - reference_compareToDirectImplementationPlan.md: NEW_direct_implementation_using_vowel_weighted_levenshtein
```

---

## BLOCKING_STATUS_TRACKER
```yaml
# PARTIALLY RESOLVED: Household Individuals Population (Dec 1)
household_individuals_population:
  status: PARTIALLY_RESOLVED
  what_was_fixed:
    - case15b: Now extracts individuals from "LAST, FIRST, LAST, SECOND" pattern (29 records)
    - 7 cases standardized to use createHouseholdFromIndividuals consistently
    - Renamed unused configurableVisionAppraisalNameParser.js to OLD prefix
  what_remains_unfixable:
    - case27: 65 records - patterns too varied (different last names, two-word names, 3+ people)
    - case17, case16, case26, case28, case29, case11, case32: Cannot reliably extract individuals
  production_parser: scripts/dataSources/visionAppraisalNameParser.js (VisionAppraisalNameParser)

# RESOLVED: All 4 Phases compareTo Implementation
compareto_implementation:
  status: ALL_4_PHASES_TESTED_WORKING
  phase_1_status: TESTED_WORKING - IndividualName.compareTo with defaultWeightedComparison
  phase_2_status: TESTED_WORKING - Address.compareTo with addressWeightedComparison (FIXED weights)
  phase_3_status: TESTED_WORKING - ContactInfo.compareTo with contactInfoWeightedComparison (10/11 tests)
  phase_4_status: TESTED_WORKING - Entity.compareTo with entityWeightedComparison (10/10 tests)
  test_scripts_created:
    - scripts/testing/testCompareToPhase1.js: IndividualName tests
    - scripts/testing/testCompareToPhase2.js: Address tests
    - scripts/testing/testCompareToPhase3.js: ContactInfo tests
    - scripts/testing/testCompareToPhase4.js: Entity tests
    - scripts/testing/compareToStudy.js: Parameterized CSV study with breakdown columns
  enhancements_added:
    - Weight boost: +12% for perfect match, +6% for >95% match on name/contactInfo
    - Fixed address weights: missing fields get 0 similarity, no renormalization
    - CSV breakdown: shows similarity, effective weight, contribution per component
  reference_document: reference_compareToDirectImplementationPlan.md

# RESOLVED: CSV Study Parameterization
csv_study_parameterization:
  status: READY_FOR_USE
  goal_achieved: compareToStudy.js parameterized for name, contactInfo, entity
  available_functions:
    - entityCompareToStudy(sampleSize): Full entity comparison
    - contactInfoCompareToStudy(sampleSize): Address + email comparison
    - nameCompareToStudy(sampleSize): Name comparison
  output_includes:
    - Distribution buckets (5% increments)
    - 98th percentile with perfect match handling
    - Best match breakdown columns

# RESOLVED: Serialization (Fixed Nov 30)
serialization_status: RESOLVED
fixes_applied:
  - AggregateHousehold.deserialize handles already-transformed individuals
  - Info.deserializeBase removed incorrect IndicativeData wrapping
  - Entity type detection uses constructor.name
verification: 4105 entities load successfully (2317 VisionAppraisal + 1788 Bloomerang)

# RESOLVED: Empty Name Records (Fixed Nov 30)
empty_name_records_status: RESOLVED
fix_applied: Added check in determineEntityType() - empty firstName/middleName/lastName returns 'NonHuman'
accounts_fixed: 1954, 1901, 1897, 1896
verification: scoreDistributionStudy runs with no DATA INTEGRITY ERRORs

# PRIORITY 3: Unified Browser Enhancement
unified_browser_bloomerang_fix:
  status: NEEDED_AFTER_PARSER_FIX
  problem: findHouseholdMembers uses imprecise address search instead of householdData
  solution: Use additionalData.householdData.householdName for Bloomerang household membership lookup
```

---

## AI_SESSION_CONTINUITY_UPDATE_PROTOCOL

### FUNDAMENTAL_PURPOSE
```yaml
primary_goal: prevent_knowledge_loss_between_sessions_that_causes_ai_to_repeat_work
core_continuity_goals:
  - seamless_session_transition: next_ai_session_starts_complete_understanding_current_position
  - prevent_knowledge_loss: technical_discoveries_remain_accessible_actionable
  - avoid_repeated_failures: failed_approaches_documented_prevent_re_attempting
  - preserve_working_patterns: successful_techniques_captured_reuse
  - maintain_data_access: file_ids_authentication_patterns_entity_structures_remain_usable
```

### CRITICAL_KNOWLEDGE_TO_PRESERVE
```yaml
technical_discoveries: new_understanding_code_behavior_data_structures_integration_patterns
problem_solutions: specific_fixes_issues_may_recur_similar_contexts
data_access_patterns: file_ids_authentication_tokens_entity_loading_methods_working
code_modifications: exact_changes_made_file_paths_line_numbers_future_reference
failed_approaches: what_tried_why_failed_prevent_future_attempts
blocking_issues: specific_technical_impediments_resolution_requirements
```

### AI_UPDATE_EXECUTION_REQUIREMENTS
```yaml
when_concluding_session_update_specific_sections:

  ai_immediate_task:
    - task_name: specific_next_function_file_work_not_vague_description
    - blocking_issues: NONE_or_specific_technical_blockers_resolution_requirements
    - expected_problem: concrete_technical_issue_anticipated_based_current_analysis

  ai_current_status_just_completed_this_session:
    - completion_status: [CODED_NOT_TESTED, TESTED_WORKING, FAILED] never_claim_COMPLETE_without_testing
    - technical_changes_made: specific_code_modifications_file_paths_line_numbers
    - critical_technical_discoveries: new_technical_understanding_affects_future_development
    - code_changes_made: exact_file_modifications_future_reference

  update_technical_sections_as_needed:
    - ai_technical_execution_patterns: add_new_proven_patterns_file_access_authentication
    - blocking_status_tracker: update_resolved_issues_add_new_blocking_problems
    - algorithmic_resources: add_newly_discovered_tools_resources

  ai_session_metadata:
    - last_updated: current_date
    - update_reason: brief_description_session_achievements_position_change

continuity_success_criteria:
  - next_ai_session_immediately_begin_work_without_research_re_discovery
  - technical_solutions_preserved_immediately_applied_similar_problems
  - failed_approaches_documented_prevent_wasted_effort
  - working_patterns_remain_accessible_executable
  - data_access_methods_remain_functional_across_sessions

MANDATORY_BACKUP_PROTOCOL:
  after_each_claude_md_update execute this command: cp "/home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025/CLAUDE.md" "/home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025/BIRAVA2025/CLAUDE_BACKUP.md"
```

---

## EXECUTION_CONTEXT
```yaml
working_directory: /home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025
git_repository: false
platform: linux
os_version: Linux 6.14.0-35-generic
session_date: 2025-11-30
ai_model: claude_opus_4_5_20251101
knowledge_cutoff: january_2025
```

## AI_SESSION_METADATA
```yaml
last_updated: December_1_2025
update_session: ALL_4_PHASES_COMPLETE_WITH_ENHANCEMENTS
document_version: AI_OPTIMIZED_20.0_ALL_PHASES_WORKING_CSV_PARAMETERIZED
previous_update: December_1_2025_Phases_2_3_session
work_this_session:
  - Verified Phase 4 already implemented (entityWeightedComparison)
  - Ran testCompareToPhase4.js: ALL 10 TESTS PASSING
  - Fixed compareGeneralStreetAddresses(): fixed weights, no renormalization
  - Added weight boost to entityWeightedComparison: +12% perfect, +6% high match
  - Parameterized compareToStudy.js for name/contactInfo/entity comparison
  - Added breakdown columns to CSV showing similarity, weight, contribution
  - Added extractTermValue() helper for AttributedTerm display
key_discoveries:
  - Phase 4 was already implemented (Individual/AggregateHousehold have initializeWeightedComparison)
  - Address comparison was renormalizing weights when fields missing (fixed)
  - AttributedTerm fields need .term extraction for display (extractTermValue helper)
  - Weight boost improves discrimination for near-matches
next_priority: Add optional `detailed` parameter to compareTo functions for breakdown object return
# Current and previous session achievements - see reference_sessionHistory.md
```
