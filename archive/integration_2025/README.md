# Archived Integration Tools

**Archived**: December 26, 2025

## Purpose

These files were early-stage matching and analysis tools developed before the current architecture was built. They have been superseded by:

- `scripts/matching/entityGroupBuilder.js` - 6-phase EntityGroup construction
- `scripts/matching/universalEntityMatcher.js` - Entity comparison
- `scripts/matching/matchOverrideManager.js` - Override rules system

## Archived Files

| File | Original Purpose |
|------|------------------|
| `matchingEngine.js` | Early Fire Number and name matching prototype |
| `contactDiscovery.js` | Workflow orchestration prototype |
| `nameAnalysis.js` | Word frequency analysis for name fields |
| `testPlugin.js` | VisionAppraisal plugin testing utilities |
| `dualSourceEntityCapacityAssessment.js` | Entity structure capacity analysis |
| `visionAppraisalFieldAudit.js` | Field migration audit tool |

## Why Archived

- None of these modules were called from outside the integration folder
- Comments in code reference "NEXT SESSION PRIORITIES" for work that has since been completed
- Referenced older patterns (readBloomerangWithEntities, direct Fire Number matching) superseded by unified entity database

## Note

The `scripts/integration/` folder has been removed. If these tools are needed for reference, they remain available here.
