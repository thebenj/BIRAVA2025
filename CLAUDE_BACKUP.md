# BIRAVA2025_AI_CONTINUITY_KNOWLEDGE_BASE

## AI_READING_INSTRUCTIONS
```yaml
read_order: [COMPLETION_VERIFICATION_RULE, CURRENT_WORK_CONTEXT, TERMINOLOGY, MANDATORY_COMPARETO_ARCHITECTURE]
focus_section: COMPLETION_VERIFICATION_RULE_then_CURRENT_WORK_CONTEXT
processing_directive: ignore_visual_formatting_process_semantic_content_only
last_updated: 2025-12-16
version: 54.0_ENTITYGROUP_PERSISTENCE_READY_FOR_VERIFICATION
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
# December 16, 2025 - ENTITYGROUP PERSISTENCE READY FOR USER VERIFICATION

immediate_status: ENTITYGROUP_PERSISTENCE_READY_FOR_USER_VERIFICATION
current_focus: EntityGroup persistence with reference file companions - user verifying via Build New button
next_action: User clicks "Build New" button to test full flow (build → display → save buttons)

# ENTITYGROUP PERSISTENCE - READY FOR USER VERIFICATION
# Note: Console test with sampleSize:800 succeeded - files created on Google Drive
entitygroup_persistence_enhancements:
  status: READY_FOR_USER_VERIFICATION
  purpose: Enable safe saving of EntityGroup databases with companion reference files

  test_results_from_console:
    command_run: "await buildEntityGroupDatabase({ sampleSize: 800 })"
    outcome: SUCCESS
    database_file_created: "1NRKzen-IjQcc950cCGPr96g8V15mEW74"
    reference_file_created: "1nTFLPY5gKeCwWy9RA8H014f2R7y88n33"
    database_size: "1.88 MB"
    reference_size: "37.8 KB"
    groups_built: 645
    entities_assigned: 801

  new_features:
    reference_file:
      description: Lightweight companion file for quick group membership lookup
      structure:
        metadata: {timestamp, totalGroups, totalMembers}
        groups: {"index||foundingMemberKey": ["additionalMemberKey1", "additionalMemberKey2"]}
      key_format: "{groupIndex}||{foundingMemberKey}" (|| separator unlikely in entity keys)
      value_format: Array of additional member keys (excluding founding member)

    save_buttons:
      save_to_file_ids:
        button_id: entityGroupSaveToFileIdBtn
        function: saveEntityGroupToExistingFiles()
        behavior: Saves database and reference to file IDs specified in input boxes
      save_as_new_files:
        button_id: entityGroupSaveAsNewBtn
        function: saveEntityGroupToNewFiles()
        behavior: Creates NEW files on Google Drive, reports IDs, updates input boxes

    build_behavior_change:
      old: buildEntityGroupDatabase() saved to hardcoded file ID (overwrote same file)
      new: buildEntityGroupDatabase() saves BOTH database AND reference to NEW files, reports IDs

  files_modified:
    entityGroupBuilder_js:
      new_functions:
        - buildEntityGroupReferenceFile(groupDb) - Creates reference file object
        - saveEntityGroupDatabaseToNewFile(groupDb, folderId, log) - Creates new database file
        - saveEntityGroupReference(referenceData, fileId, log) - Updates existing reference file
        - saveEntityGroupReferenceToNewFile(referenceData, folderId, log) - Creates new reference file
        - saveEntityGroupDatabaseAndReference(groupDb, dbFileId, refFileId, log) - Saves both to existing
        - saveEntityGroupDatabaseAndReferenceToNewFiles(groupDb, folderId, log) - Saves both to new
      modified_functions:
        - buildEntityGroupDatabase() - Now calls saveEntityGroupDatabaseAndReferenceToNewFiles()
    entityGroupBrowser_js:
      new_constants:
        - ENTITYGROUP_REFERENCE_FILE_ID_STORAGE_KEY
      new_functions:
        - saveEntityGroupToExistingFiles() - Button handler for Save to File IDs
        - saveEntityGroupToNewFiles() - Button handler for Save as New Files
      modified_functions:
        - restoreEntityGroupFileId() - Now restores both database and reference file IDs
        - setupFileIdPersistence() - Now persists both file IDs
        - setupEntityGroupButtons() - Now sets up both save buttons
    index_html:
      new_elements:
        - entityGroupReferenceFileId input box
        - entityGroupSaveToFileIdBtn button
        - entityGroupSaveAsNewBtn button

  design_rationale: |
    User plans to add feature to edit group membership (add/remove members).
    Need ability to save edited databases without accidentally overwriting clean originals.
    Two file IDs (database + reference) kept in sync.
    Save to New Files creates fresh copies for edited versions.

  bug_fix_this_session:
    issue: "TypeError: groupDb.groups is not iterable" when clicking Save as New Files
    root_cause: EntityGroupDatabase stores groups as OBJECT (keyed by index), not array
    original_code: "for (const group of groupDb.groups)" - fails on objects
    fix_applied: "const groupsArray = Object.values(groupDb.groups)" - converts to iterable
    lesson: Check existing code patterns (applyEntityGroupFilters already used Object.values)

  browser_integration_note: |
    When running buildEntityGroupDatabase() from console, results stored in window.entityGroupDatabase
    but NOT displayed in browser (entityGroupBrowser.loadedDatabase not set).
    Use "Build New" button instead - it sets both and calls applyEntityGroupFilters().
    Or manually: entityGroupBrowser.loadedDatabase = window.entityGroupDatabase; applyEntityGroupFilters();

# ENTITYGROUP BROWSER - USER VERIFIED WORKING
entitygroup_browser:
  status: USER_VERIFIED_WORKING
  file_created: scripts/entityGroupBrowser.js
  files_modified:
    - index.html (HTML section, CSS styles, script include)
    - scripts/unifiedEntityBrowser.js (exported basicEntityDetailsView)

  features_implemented:
    - Load EntityGroup database from Google Drive by file ID
    - Build New button (builds EntityGroup database from loaded entities)
    - Load Unified Database button (required to display founding member names)
    - Filter dropdown (all, multi-member, single-member, prospects, donors, near misses)
    - Sort dropdown (index, member count, name)
    - Search functionality (name, address, member keys) - with robust type checking
    - Results list with founding member name/address display
    - View Group Details modal with enhanced features (see below)
    - Group Stats modal (totals, composition, phase breakdown)
    - Export to CSV
    - File ID persistence in localStorage

  view_group_details_modal_features:
    founding_member_section:
      - Highlighted box with purple left border
      - Shows "Founding Member (Source)" label
      - Name and address display
      - View Details button (Entity Browser style - renderEntityDetailsWindow)
    members_section:
      - Each member shows name, address, source
      - View Details button per member (Entity Browser style)
      - Blue button for Bloomerang, red for VisionAppraisal
    near_misses_section:
      - Each near miss shows name and source
      - View button per near miss (Entity Browser style)
    consensus_entity_section:
      - Shows type, name, address
      - View Details (Drill-Down) button (basicEntityDetailsView - property explorer)

  view_details_button_types:
    entity_browser_style:
      function: renderEntityDetailsWindow(entityWrapper)
      used_by: [founding member, members, near misses]
      description: Sophisticated HTML view matching Entity Browser View Details
    drill_down_style:
      function: basicEntityDetailsView(entityWrapper)
      used_by: [consensus entity]
      description: Interactive property explorer with Expand buttons for nested objects

  key_design_decisions:
    - Follows unifiedEntityBrowser.js pattern (separate .js file, innerHTML rendering)
    - No embedded script tags in template literals (lesson learned)
    - Modals created via DOM API with addEventListener (not inline onclick)
    - Displays founding member name (not consensus) - requires Unified Database loaded
    - Uses existing unifiedDatabaseFileId input for Load Unified Database button
    - View Details buttons reuse same code as Entity Browser for consistency
    - extractEntityAddress() made robust with String() wrapping and fallback component building

  new_functions_this_session:
    - viewMemberEntityDetails(key): Opens Entity Browser style view for any member
    - viewConsensusEntityDetails(consensusEntity, groupIndex): Opens drill-down view for consensus

  bug_fixes_this_session:
    - Fixed search crash when address was object instead of string (type checking added)
    - extractEntityAddress() now always returns string

  lesson_learned: |
    Modal close buttons must NOT use inline onclick with complex selectors like:
    onclick="this.closest('div[style*=\"position: fixed\"]').remove()"
    Instead, create elements via DOM and attach event listeners programmatically.

# STRATIFIED SAMPLING - USER VERIFIED WORKING
stratified_sampling:
  status: USER_VERIFIED_WORKING
  purpose: Fast testing of EntityGroup construction without full 20+ minute run
  implementation:
    file: scripts/matching/entityGroupBuilder.js
    new_function: createStratifiedSample(entityDb, sampleSize, seed)
    new_options:
      - "sampleSize: number (null = full database)"
      - "sampleSeed: number (default 12345 for reproducibility)"
  usage:
    full_run: "await buildEntityGroupDatabase()"
    test_run: "await buildEntityGroupDatabase({ sampleSize: 200, googleDriveFileId: '1lxCsFOTOTgp4uxIBD_t0bgfJGUhxGuMJ' })"
  test_file_id: "1lxCsFOTOTgp4uxIBD_t0bgfJGUhxGuMJ"

# ALIAS CONSENSUS INTEGRATION - CODED, READY FOR USER VERIFICATION
alias_consensus_integration:
  status: CODED_READY_FOR_TESTING
  purpose: Populate homonyms/synonyms/candidates in consensus entity Aliased properties

  files_modified_this_session:
    aliasClasses_js:
      location: scripts/objectStructure/aliasClasses.js
      new_methods:
        - "Aliased.createConsensus(aliasedObjects, thresholds) - static factory method (lines 578-673)"
        - "Aliased.mergeAlternatives(otherObjects, thresholds) - instance method (lines 685-728)"
        - "Aliased._mergeSourceAlternatives(sourceAlternatives, sourceSimilarity, t) - private helper (lines 738-771)"
    entityGroup_js:
      location: scripts/objectStructure/entityGroup.js
      changes:
        - "_synthesizeConsensus() now calls _createAliasedConsensus() for name and locationIdentifier"
        - "New _buildAliasThresholds() method (lines 199-223) - reads from MATCH_CRITERIA"
        - "New _createAliasedConsensus() method (lines 233-249) - wrapper for Aliased.createConsensus()"

  threshold_mapping:
    source: window.MATCH_CRITERIA (from unifiedEntityBrowser.js)
    name_thresholds:
      homonym: MATCH_CRITERIA.trueMatch.nameAlone (0.875)
      synonym: MATCH_CRITERIA.nearMatch.nameAlone (0.845)
      candidate: 0.5 (floor)
    contactInfo_thresholds:
      homonym: MATCH_CRITERIA.trueMatch.contactInfoAlone (0.87)
      synonym: MATCH_CRITERIA.nearMatch.contactInfoAlone (0.85)
      candidate: 0.5 (floor)

  design_decisions:
    - Alias logic placed in Aliased class for reusability (not EntityGroup)
    - Both static factory and instance methods provided for flexibility
    - Thresholds reference MATCH_CRITERIA not hardcoded values
    - Source alternatives merged with demotion based on source similarity

# ENTITYGROUP IMPLEMENTATION - PRIOR SESSION WORK
entitygroup_implementation:
  status: CODED_READY_FOR_USER_VERIFICATION
  files_created:
    - scripts/objectStructure/entityGroup.js (EntityGroup and EntityGroupDatabase classes)
    - scripts/matching/entityGroupBuilder.js (5-phase construction algorithm)
  files_modified:
    - index.html (added script includes)
    - scripts/unifiedEntityBrowser.js (exported isTrueMatch, isNearMatch, MATCH_CRITERIA)

  test_results_from_session:
    total_groups: 2291
    multi_member_groups: 785
    single_member_groups: 1506
    prospects: 1316
    existing_donors: 975
    entities_assigned: 4097
    near_misses: 202

  construction_phases:
    phase_1: Bloomerang Households (426 found)
    phase_2: VisionAppraisal Households (1406 processed)
    phase_3: Bloomerang Individuals (remaining after Phase 1)
    phase_4: VisionAppraisal Individuals (remaining after Phase 2)
    phase_5: Remaining entity types (Business, LegalConstruct)

  completed_features:
    - Browser/viewing tools: USER_VERIFIED_WORKING (scripts/entityGroupBrowser.js)
  pending_features:
    - CSV output enhancement (basic export exists)
    - Google Drive persistence (save EntityGroup database)

# PRIOR WORK - KEYED DATABASE MIGRATION (USER VERIFIED WORKING)
migration_plan_reference: reference_keyedDatabaseMigration.md
key_preservation_plan: reference_keyPreservationPlan.md

# KEY PRESERVATION IMPLEMENTATION - USER VERIFIED WORKING
key_preservation:
  problem_solved: Reconcile button was regenerating entity keys instead of using actual database keys
  solution: Database keys now preserved through entire flow from findBestMatches() to reconcileMatch()
  reference: reference_keyPreservationPlan.md
  status: ALL_PHASES_USER_VERIFIED_WORKING

  implementation_summary:
    phase_A: findBestMatches() uses getAllEntitiesWithKeys() - stores targetDatabaseKey in match objects
    phase_B: doReconcile() and reconcileMatch() accept and use database keys for direct lookup
    phase_C: baseDatabaseKey passed from entityWrapper.key through options to findBestMatches()
    phase_D: Self-comparison uses database key comparison instead of regenerating keys
    cleanup: PID fallback hack removed from getVisionAppraisalEntity()

  key_architectural_principle: |
    Database keys are generated ONLY during database building (generateUnifiedEntityKey in unifiedDatabasePersistence.js).
    Once loaded, entities carry their database keys through all flows.
    getEntityKeyInfo() is now used ONLY for display purposes, not for entity lookup.

# KEYED DATABASE MIGRATION STATUS
keyed_database_migration:
  roadmap_reference: reference_projectRoadmap.md Section 3
  detailed_plan: reference_keyedDatabaseMigration.md
  status: USER_VERIFIED_WORKING

  coded_working:
    save_keyed_database:
      function: saveUnifiedDatabase() in unifiedDatabasePersistence.js
      button: "💾 Record Unified Database" in index.html
      status: WORKING
    load_keyed_database:
      function: loadUnifiedDatabase() in unifiedDatabasePersistence.js
      button: "📂 Load Unified Database" in index.html
      status: WORKING
    compatibility_layer:
      functions: [getEntityDatabase, getFilteredEntities, isEntityDatabaseLoaded, hasLoadedData, getAllEntitiesWithKeys]
      purpose: Provide uniform access to Keyed Database
      status: WORKING
    key_preservation:
      functions: [getAllEntitiesWithKeys returns [key, entity] pairs]
      flow: entityWrapper.key → findBestMatches(options.baseDatabaseKey) → match.targetDatabaseKey → reconcileMatch()
      status: WORKING

# MIGRATION PHASES (see reference_keyedDatabaseMigration.md for full details)
migration_phases:
  phase_1:
    description: Remove competing getAllSelectedEntities() from persistence module
    file: unifiedDatabasePersistence.js
    action: DELETE lines 688-711 and line 739
    status: USER_VERIFIED_WORKING
  phase_2:
    description: Remove legacy fallbacks from unifiedEntityBrowser.js
    files: unifiedEntityBrowser.js
    actions_completed:
      - Deleted getAllSelectedEntities() legacy fallback (was lines 311-385)
      - Deleted generateUnifiedStats() legacy fallback (was lines 3224-3265)
      - Fixed Data Source dropdown to auto-refresh display after change
      - Fixed stats popup to extract .count from source objects
    status: USER_VERIFIED_WORKING
  phase_3:
    description: Remove legacy fallback from universalEntityMatcher.js
    file: universalEntityMatcher.js
    actions_completed:
      - Deleted getAllEntities() legacy fallback (was lines 686-706)
      - Fixed getBloomerangEntityByAccountNumber() to use Keyed Database (loadAllEntitiesButton.js)
      - Fixed getVisionAppraisalEntity() to use Keyed Database (loadAllEntitiesButton.js)
      - Fixed reconcile modal View Details to check for unifiedEntityDatabase
    status: USER_VERIFIED_WORKING
  phase_4:
    description: Migrate entityRenderer.js to use Keyed Database
    file: entityRenderer.js
    action: Rewrote findHouseholdMembersFallback() to use getFilteredEntities() compatibility layer
    status: USER_VERIFIED_WORKING
  phase_5:
    description: Migrate loadAllEntitiesButton.js
    file: loadAllEntitiesButton.js
    actions_completed:
      - Deleted buildEntityLookupIndex() function (was lines 363-425)
      - Removed window.buildEntityLookupIndex export (was line 492)
      - Rewrote entity counting to use Keyed Database metadata (lines 143-147)
      - Added call to buildUnifiedEntityDatabase() (lines 135-141)
      - PID fallback removed after key preservation fix (Dec 15 session)
    status: USER_VERIFIED_WORKING
  phase_6:
    description: Wire load flow to auto-build Keyed Database
    action: Auto-call buildUnifiedEntityDatabase() after source file load
    status: USER_VERIFIED_WORKING

# DEC 15 SESSION - KEY PRESERVATION IMPLEMENTATION
dec15_session:
  issue_discovered:
    symptom: "Error - Base entity not found. Key - PID:203" when clicking Reconcile
    root_cause: Code regenerated entity keys from properties instead of using actual database keys
    detail: Entities stored by FireNumber (visionAppraisal:FireNumber:1510) but Reconcile code reconstructed key using PID (visionAppraisal:PID:203)

  comprehensive_fix_implemented:
    reference: reference_keyPreservationPlan.md
    status: ALL_PHASES_USER_VERIFIED_WORKING

    changes_to_universalEntityMatcher_js:
      - findBestMatches() now uses getAllEntitiesWithKeys() to get [key, entity] pairs
      - Match objects include targetDatabaseKey (actual database key)
      - Result includes baseEntity.databaseKey
      - Self-comparison uses database key comparison (not regenerated keys)

    changes_to_unifiedEntityBrowser_js:
      - analyzeSelectedEntityMatches() passes baseDatabaseKey via options
      - displayMatchAnalysisResults() extracts databaseKey into baseEntityInfo
      - doReconcile() accepts baseDatabaseKey and targetDatabaseKey parameters
      - reconcileMatch() uses direct db[key] lookup first, legacy lookup as fallback

    changes_to_loadAllEntitiesButton_js:
      - Removed PID fallback hack from getVisionAppraisalEntity()
      - Function is now a simple fallback (legacy lookup), not primary lookup

    key_principle: |
      Database keys generated ONLY during database building.
      Once loaded, keys travel with entities through all flows.
      getEntityKeyInfo() used ONLY for display, not lookup.

# COMPLETED WORK SUMMARY (Dec 8-15, 2025)
# For detailed session logs, see reference_sessionHistory.md

completed_features:
  keyed_database_persistence:
    buttons: ["💾 Record Unified Database", "📂 Load Unified Database"]
    status: USER_VERIFIED_WORKING
  nonhumanname_class:
    purpose: Handle Business/LegalConstruct entity names
    status: USER_VERIFIED_WORKING
  email_matching:
    method: Split local part (0.8 fuzzy) + domain (0.2 exact)
    status: USER_VERIFIED_WORKING
  fire_number_collision_handler:
    stats: {merged: 8, suffixed: 59, unique_output: 2309}
    status: USER_VERIFIED_WORKING
  permutation_memory_fix:
    solution: MAX_WORDS_FOR_PERMUTATION = 7
    status: USER_VERIFIED_WORKING
  true_near_match_checkboxes:
    purpose: Auto-detect and display True Match / Near Match status in Analyze Matches UI
    location: unifiedEntityBrowser.js (MATCH_CRITERIA config, isTrueMatch(), isNearMatch())
    status: USER_VERIFIED_WORKING

google_drive_analysis:
  status: CODED_READY_FOR_TESTING
  folder_id: "1f1b7MHXsNKr3qXmqOAcLdzQVZ3sZD2tL"
  key_file: scripts/matching/entityAnalysisToGoogleDrive.js

# PROJECT STACK (outermost to innermost)
project_layers:
  layer_1_analyze_matches_ui:
    status: USER_VERIFIED_WORKING
    features_verified:
      - View Details button in reconciliation modal: WORKING
      - Top Matches summary section: WORKING (sorted by score descending)
      - Reconcile button: WORKING
      - True Match / Near Match checkboxes: USER_VERIFIED_WORKING
    features_coded_not_tested:
      - CSV export
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

## TERMINOLOGY
```yaml
# CRITICAL: Use these terms consistently to avoid confusion

KEYED_DATABASE:
  variable: unifiedEntityDatabase
  description: Single flat structure where ALL entities (both sources) stored together
  access_pattern: unifiedEntityDatabase.entities[key]
  key_format_visionappraisal: "visionAppraisal:FireNumber:1510"
  key_format_bloomerang: "bloomerang:12345:SimpleIdentifiers:...:head"
  buttons:
    save: "💾 Record Unified Database"
    load: "📂 Load Unified Database"
  characteristics:
    - Source-agnostic access (same pattern for all entities)
    - Saved to / loaded from Google Drive
    - THIS IS THE TARGET ARCHITECTURE

LEGACY_UNIFIED_DATABASE:
  variable: workingLoadedEntities
  description: Original structure holding VisionAppraisal and Bloomerang in SEPARATE sub-structures
  access_pattern_visionappraisal: workingLoadedEntities.visionAppraisal.entities[index]
  access_pattern_bloomerang: workingLoadedEntities.bloomerang.individuals.entities[key]
  button: "Load All Entities Into Memory"
  characteristics:
    - Requires source-specific navigation code
    - Different paths for different sources
    - THIS IS BEING MIGRATED AWAY FROM

MIGRATION_GOAL:
  from: Functions reading from Legacy Unified Database (navigating separate structures)
  to: Functions reading from Keyed Database (single keyed structure)
  reference: reference_keyedDatabaseMigration.md

ENTITYGROUP_DATABASE:
  description: Collection of EntityGroups representing matched real-world persons/households
  purpose: Consolidate entities from multiple sources into unified groups for prospect identification and reporting
  construction_function: buildEntityGroupDatabase() in scripts/matching/entityGroupBuilder.js
  classes:
    EntityGroup: Container for matched entities (founding member, members, near-misses, consensus)
    EntityGroupDatabase: Container for all EntityGroups with construction orchestration
  key_properties:
    EntityGroup: [index, foundingMemberKey, memberKeys, nearMissKeys, hasBloomerangMember, consensusEntity, constructionPhase]
    EntityGroupDatabase: [groups, nextIndex, assignedEntityKeys (Set), constructionConfig, stats]
  five_phase_construction:
    phase_1: Bloomerang Households (seed groups from existing donors)
    phase_2: VisionAppraisal Households (match or form new groups)
    phase_3: Bloomerang Individuals (remaining after Phase 1)
    phase_4: VisionAppraisal Individuals (remaining after Phase 2)
    phase_5: Remaining entity types (Business, LegalConstruct)
  key_rule: Once assigned to a group, an entity cannot join other groups
  near_miss_rule: Near misses are recorded but NOT marked as assigned (can still form own groups)
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
  # PREFERRED: Keyed Database (target architecture)
  keyed_database:
    load_option_1: Click "📂 Load Unified Database" (from Google Drive)
    load_option_2: Click "Load All Entities Into Memory" (builds from source files)
    global_object: unifiedEntityDatabase
    access_any_entity: unifiedEntityDatabase.entities[key]
    count_check: Object.keys(unifiedEntityDatabase.entities).length
  # LEGACY: Only used during migration (being phased out)
  legacy_unified_database:
    global_object: workingLoadedEntities
    bloomerang: workingLoadedEntities.bloomerang.individuals.entities[key]
    visionappraisal: workingLoadedEntities.visionAppraisal.entities[index]
    note: DO_NOT_USE_IN_NEW_CODE

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

KEYED_DATABASE_MIGRATION:
  reference_keyedDatabaseMigration.md: Complete 6-phase migration plan from Legacy to Keyed Database
  READ_WHEN: Working on any migration phase, understanding database architecture
  NOTE: THIS IS THE CURRENT PRIORITY WORK

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

PROJECT_ROADMAP:
  reference_projectRoadmap.md: 8-step strategic roadmap including five-step process, match recognition, entityGroups, reports
  READ_WHEN: Discussing future plans, prioritization, or strategic direction
  NOTE: High-level outline only - each step requires specific discussion before implementation

ENTITYGROUP:
  class_file: scripts/objectStructure/entityGroup.js
  builder_file: scripts/matching/entityGroupBuilder.js
  READ_WHEN: Working on EntityGroup construction, browsing, or export
  entry_point: buildEntityGroupDatabase() - runs 5-phase construction algorithm

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
email_comparison:
  method: split_local_and_domain
  weights: {localPart: 0.8, domain: 0.2}
  local_part: fuzzy_levenshtein
  domain: exact_match_only
```

---

## BLOCKING_STATUS_TRACKER
```yaml
# CURRENT WORK: ENTITYGROUP BROWSER ENHANCEMENTS - USER VERIFIED WORKING
current_work:
  entitygroup_browser:
    description: EntityGroup Browser with View Details enhancements for viewing member and consensus entities
    status: USER_VERIFIED_WORKING
    session: December 16, 2025
    files_modified:
      - scripts/entityGroupBrowser.js (View Details functions, search bug fix)
      - scripts/unifiedEntityBrowser.js (exported basicEntityDetailsView)
    view_details_features:
      - Founding member View Details button (Entity Browser style)
      - Member View Details buttons (Entity Browser style)
      - Near miss View buttons (Entity Browser style)
      - Consensus entity View Details (Drill-Down) button (property explorer style)
  entitygroup_construction:
    description: EntityGroup and EntityGroupDatabase classes with 5-phase construction algorithm
    status: USER_VERIFIED_WORKING
    files_created:
      - scripts/objectStructure/entityGroup.js
      - scripts/matching/entityGroupBuilder.js
    test_results:
      total_groups: 2291
      multi_member: 785
      single_member: 1506
      entities_assigned: 4097
      near_misses: 202

# COMPLETED WORK: KEYED DATABASE MIGRATION AND KEY PRESERVATION
completed_work:
  keyed_database_migration:
    description: Migrated from Legacy Unified Database to Keyed Database
    reference: reference_keyedDatabaseMigration.md
    status: ALL_PHASES_USER_VERIFIED_WORKING
    completed: December 15, 2025
  key_preservation:
    description: Database keys now preserved through entire flow
    reference: reference_keyPreservationPlan.md
    status: ALL_PHASES_USER_VERIFIED_WORKING
    completed: December 15, 2025

# MIGRATION PHASE STATUS - ALL COMPLETE
migration_phases:
  phase_1_remove_competing_function: USER_VERIFIED_WORKING
  phase_2_remove_browser_legacy_fallbacks: USER_VERIFIED_WORKING
  phase_3_remove_matcher_legacy_fallback: USER_VERIFIED_WORKING
  phase_4_migrate_entity_renderer: USER_VERIFIED_WORKING
  phase_5_migrate_load_button: USER_VERIFIED_WORKING
  phase_6_wire_auto_build: USER_VERIFIED_WORKING

# RESOLVED (moved to reference_sessionHistory.md for details)
resolved_items:
  - NonHumanName implementation (Dec 14) - USER_VERIFIED_WORKING
  - Email matching improvement (Dec 14) - USER_VERIFIED_WORKING
  - Fire number collision handler (Dec 8) - USER_VERIFIED_WORKING
  - Entity key uniqueness (Dec 7) - USER_VERIFIED_WORKING
  - View button entity lookup (Dec 6) - RESOLVED with storage key architecture
  - Cross-type name comparison (Dec 5) - RESOLVED in universalEntityMatcher
  - HouseholdInformation (Dec 3) - USER_VERIFIED_WORKING
  - All 4 phases compareTo (Dec 1) - ALL_TESTED_WORKING
  - Serialization (Nov 30) - RESOLVED
  - Empty name records (Nov 30) - RESOLVED

# PENDING WORK (not blocking, deferred)
pending_work:
  - EntityGroup Google Drive persistence: READY_FOR_USER_VERIFICATION (save buttons implemented, console test passed)
  - Full production EntityGroup database run (20+ minutes)
  - CSV output enhancement for EntityGroups
  - Alias consensus integration testing
  - Category 2 files (analysis/diagnostic) migration
  - Category 3 files (tests) migration
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
last_updated: December_16_2025
document_version: 54.0_ENTITYGROUP_PERSISTENCE_READY_FOR_VERIFICATION
previous_version: 53.0_ENTITYGROUP_REFERENCE_FILE_AND_SAVE_BUTTONS

# CURRENT STATE
current_state:
  entitygroup_persistence: READY_FOR_USER_VERIFICATION (console test passed, awaiting Build New button test)
  entitygroup_browser: USER_VERIFIED_WORKING (with View Details enhancements)
  alias_consensus_integration: CODED_READY_FOR_USER_VERIFICATION
  entitygroup_construction: USER_VERIFIED_WORKING
  keyed_database_migration: ALL_PHASES_USER_VERIFIED_WORKING
  key_preservation: ALL_PHASES_USER_VERIFIED_WORKING
  all_foundational_layers: USER_VERIFIED_WORKING

# DEC 16 SESSION - ENTITYGROUP PERSISTENCE (LATEST)
dec16_session_part4:
  focus: EntityGroup persistence with companion reference files
  work_completed:
    - Implemented buildEntityGroupReferenceFile(groupDb) function
    - Implemented saveEntityGroupDatabaseToNewFile() for creating new database files
    - Implemented saveEntityGroupReferenceToNewFile() for creating new reference files
    - Implemented saveEntityGroupDatabaseAndReference() for saving to existing files
    - Implemented saveEntityGroupDatabaseAndReferenceToNewFiles() for creating both new files
    - Modified buildEntityGroupDatabase() to auto-save both files to NEW locations
    - Added Reference File ID input box to UI
    - Added "Save to File IDs" and "Save as New Files" buttons
    - Fixed bug: groups is object not array - use Object.values()
  test_results:
    console_command: "await buildEntityGroupDatabase({ sampleSize: 800 })"
    database_file_id: "1NRKzen-IjQcc950cCGPr96g8V15mEW74"
    reference_file_id: "1nTFLPY5gKeCwWy9RA8H014f2R7y88n33"
    groups_built: 645
    entities_assigned: 801
  pending_verification:
    - User to test "Build New" button flow (builds + displays + enables save buttons)
    - User to test "Save to File IDs" button
    - User to test "Save as New Files" button

# DEC 16 SESSION - ENTITYGROUP BROWSER VIEW DETAILS (EARLIER)
dec16_session_part3:
  focus: Enhanced View Details buttons in EntityGroup Browser View Group Details modal
  work_completed:
    - Added View Details button for founding member (Entity Browser style)
    - Added View Details button for each group member (Entity Browser style)
    - Added View button for each near miss (Entity Browser style)
    - Added View Details (Drill-Down) button for consensus entity (basicEntityDetailsView style)
    - Created viewMemberEntityDetails(key) function - reuses renderEntityDetailsWindow
    - Created viewConsensusEntityDetails(consensusEntity, groupIndex) function - uses basicEntityDetailsView
    - Exported basicEntityDetailsView to window scope in unifiedEntityBrowser.js
    - Fixed search crash (address.toLowerCase error) - added type checking in groupMatchesSearch
    - Enhanced extractEntityAddress() to always return string with fallback component building
  design_decisions:
    - Two View Details styles for different purposes (entity view vs property explorer)
    - All member View Details buttons use same renderer as Entity Browser for consistency
    - Consensus entity uses drill-down style for exploring synthesized structure
    - Type safety added to search function to handle unexpected data structures

# DEC 16 SESSION - ALIAS CONSENSUS INTEGRATION (EARLIER)
dec16_session_part2:
  focus: Alias categorization in consensus entity synthesis
  work_completed:
    - Added Aliased.createConsensus() static method to aliasClasses.js (lines 578-673)
    - Added Aliased.mergeAlternatives() instance method to aliasClasses.js (lines 685-728)
    - Added Aliased._mergeSourceAlternatives() helper to aliasClasses.js (lines 738-771)
    - Updated EntityGroup._synthesizeConsensus() to use createConsensus for name/locationIdentifier
    - Added EntityGroup._buildAliasThresholds() method (lines 199-223)
    - Added EntityGroup._createAliasedConsensus() wrapper method (lines 233-249)
  design_decisions:
    - Alias logic placed in Aliased class (not EntityGroup) for reusability
    - Both static factory and instance methods provided
    - Thresholds read from MATCH_CRITERIA, not hardcoded
    - Homonyms use True Match thresholds, Synonyms use Near Match thresholds
    - Source alternatives demoted based on source similarity to consensus primary

# DEC 16 SESSION - ENTITYGROUP IMPLEMENTATION (EARLIEST)
dec16_session_part1:
  work_completed:
    - Created EntityGroup class (scripts/objectStructure/entityGroup.js)
    - Created EntityGroupDatabase class (same file)
    - Created 5-phase construction algorithm (scripts/matching/entityGroupBuilder.js)
    - Added script includes to index.html
    - Exported isTrueMatch, isNearMatch, MATCH_CRITERIA from unifiedEntityBrowser.js
    - Fixed universalEntityMatcher.js include (was dynamic, now static script)
  test_run_results:
    total_groups: 2291
    multi_member_groups: 785
    single_member_groups: 1506
    prospects: 1316
    existing_donors: 975
    entities_assigned: 4097
    near_misses: 202

next_priorities:
  reference: reference_projectRoadmap.md
  completed: EntityGroup Browser with View Details enhancements
  pending_features:
    - CSV output enhancement for EntityGroups
    - Google Drive persistence (save EntityGroup database)

# SESSION HISTORY REFERENCE
# Detailed session logs for Dec 8-15, 2025 have been migrated to reference_sessionHistory.md
# This includes: key preservation, keyed database migration, NonHumanName, email matching,
# score discrepancy fixes, permutation memory fix, fire number collision handler

working_directory: /home/robert-benjamin/RPBprojects/VisionAppraisal/BIRAVA2025
platform: linux
```
