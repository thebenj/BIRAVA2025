/**
 * VisionAppraisal Field Migration Audit
 *
 * Analyzes which fields from VisionAppraisal source data actually make it
 * into the entity structure vs. which are lost during processing.
 *
 * CRITICAL FINDINGS RECREATION:
 * - VisionAppraisal has 28+ source fields available
 * - Entity structure only captures a small subset
 * - Need to identify the 75% data loss mentioned in diversContent.md
 */

const VisionAppraisalFieldAudit = {

    /**
     * Main audit function - compares source data fields to entity structure
     */
    async auditFieldMigration() {
        try {
            console.log("=== VISIONAPPRAISAL FIELD MIGRATION AUDIT ===");

            // Step 1: Get VisionAppraisal source data with all available fields
            console.log("Step 1: Loading VisionAppraisal source data...");
            const sourceDataResult = await VisionAppraisal.loadData();

            if (!sourceDataResult || sourceDataResult.length === 0) {
                throw new Error("No VisionAppraisal source data available");
            }

            console.log(`✓ Loaded ${sourceDataResult.length} VisionAppraisal source records`);

            // Step 2: Load processed entities from Google Drive
            console.log("Step 2: Loading processed entities...");
            const entitiesResult = await this.loadProcessedEntities();

            if (!entitiesResult.success) {
                throw new Error(`Failed to load entities: ${entitiesResult.message}`);
            }

            console.log(`✓ Loaded ${entitiesResult.data.length} processed entities`);

            // Step 3: Analyze source data fields
            console.log("Step 3: Analyzing source data fields...");
            const sourceFields = this.analyzeSourceFields(sourceDataResult);

            // Step 4: Analyze entity structure fields
            console.log("Step 4: Analyzing entity structure fields...");
            const entityFields = this.analyzeEntityFields(entitiesResult.data);

            // Step 5: Compare field migration
            console.log("Step 5: Comparing field migration...");
            const migrationAnalysis = this.compareFieldMigration(sourceFields, entityFields);

            // Step 6: Generate comprehensive audit report
            console.log("Step 6: Generating audit report...");
            const auditReport = this.generateAuditReport(sourceFields, entityFields, migrationAnalysis);

            console.log("✅ VisionAppraisal Field Migration Audit Complete!");
            console.log(`📊 CRITICAL FINDINGS:`);
            console.log(`   - Source Fields Available: ${sourceFields.totalUniqueFields}`);
            console.log(`   - Entity Fields Captured: ${entityFields.totalUniqueFields}`);
            console.log(`   - Field Loss Rate: ${migrationAnalysis.lossPercentage}%`);
            console.log(`   - Missing Critical Fields: ${migrationAnalysis.missingCriticalFields.length}`);

            return {
                success: true,
                auditReport: auditReport,
                sourceFields: sourceFields,
                entityFields: entityFields,
                migrationAnalysis: migrationAnalysis
            };

        } catch (error) {
            console.error("VisionAppraisal Field Migration Audit failed:", error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Load processed entities from Google Drive
     */
    async loadProcessedEntities() {
        try {
            // Try to load from the documented VisionAppraisal_ParsedEntities.json file
            const GOOGLE_FILE_ID = "19cgccMYNBboL07CmMP-5hNNGwEUBXgCI"; // From CLAUDE.md

            console.log(`Loading processed entities from Google Drive File ID: ${GOOGLE_FILE_ID}`);

            const response = await gapi.client.drive.files.get({
                fileId: GOOGLE_FILE_ID,
                alt: 'media'
            });

            const dataPackage = JSON.parse(response.body);

            // Handle both old and new data formats
            let entitiesData;
            if (dataPackage.entities) {
                entitiesData = dataPackage.entities; // New format
            } else if (dataPackage.records) {
                entitiesData = dataPackage.records; // Old format
            } else if (Array.isArray(dataPackage)) {
                entitiesData = dataPackage; // Direct array
            } else {
                throw new Error("Unrecognized data format in processed entities file");
            }

            console.log(`✓ Loaded ${entitiesData.length} processed entities`);

            return {
                success: true,
                data: entitiesData,
                metadata: dataPackage.metadata || {}
            };

        } catch (error) {
            console.error("Error loading processed entities:", error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Analyze all fields available in VisionAppraisal source data
     */
    analyzeSourceFields(sourceDataArray) {
        console.log("Analyzing VisionAppraisal source data fields...");

        const allFields = new Set();
        const fieldTypes = {};
        const sampleValues = {};

        sourceDataArray.forEach((record, index) => {
            Object.keys(record).forEach(fieldName => {
                allFields.add(fieldName);

                // Track field types and sample values
                const value = record[fieldName];
                if (!fieldTypes[fieldName]) {
                    fieldTypes[fieldName] = new Set();
                    sampleValues[fieldName] = [];
                }

                fieldTypes[fieldName].add(typeof value);
                if (sampleValues[fieldName].length < 3 && value && value.toString().trim()) {
                    sampleValues[fieldName].push(value.toString().trim());
                }
            });
        });

        // Convert Sets to Arrays for easier analysis
        Object.keys(fieldTypes).forEach(field => {
            fieldTypes[field] = Array.from(fieldTypes[field]);
        });

        const sourceFields = {
            totalUniqueFields: allFields.size,
            fieldNames: Array.from(allFields).sort(),
            fieldTypes: fieldTypes,
            sampleValues: sampleValues,
            recordCount: sourceDataArray.length
        };

        console.log(`✓ Found ${sourceFields.totalUniqueFields} unique fields in source data`);
        console.log(`✓ Source fields: ${sourceFields.fieldNames.join(', ')}`);

        return sourceFields;
    },

    /**
     * Analyze what fields are actually captured in entity structures
     */
    analyzeEntityFields(entitiesArray) {
        console.log("Analyzing entity structure fields...");

        const allFields = new Set();
        const fieldTypes = {};
        const entityTypes = {};

        entitiesArray.forEach((entity, index) => {
            // Track entity types
            const entityType = entity.type || 'Unknown';
            entityTypes[entityType] = (entityTypes[entityType] || 0) + 1;

            // Recursively extract all field paths from entity
            this.extractFieldPaths(entity, '', allFields, fieldTypes);
        });

        // Convert Sets to Arrays
        Object.keys(fieldTypes).forEach(field => {
            fieldTypes[field] = Array.from(fieldTypes[field]);
        });

        const entityFields = {
            totalUniqueFields: allFields.size,
            fieldNames: Array.from(allFields).sort(),
            fieldTypes: fieldTypes,
            entityTypes: entityTypes,
            recordCount: entitiesArray.length
        };

        console.log(`✓ Found ${entityFields.totalUniqueFields} unique field paths in entity structure`);
        console.log(`✓ Entity types: ${Object.keys(entityTypes).join(', ')}`);

        return entityFields;
    },

    /**
     * Recursively extract field paths from nested objects
     */
    extractFieldPaths(obj, prefix, allFields, fieldTypes) {
        if (obj === null || obj === undefined) return;

        if (typeof obj !== 'object') {
            // Leaf value
            allFields.add(prefix);
            if (!fieldTypes[prefix]) fieldTypes[prefix] = new Set();
            fieldTypes[prefix].add(typeof obj);
            return;
        }

        if (Array.isArray(obj)) {
            // Array - analyze first few elements
            obj.slice(0, 3).forEach((item, index) => {
                this.extractFieldPaths(item, `${prefix}[${index}]`, allFields, fieldTypes);
            });
            return;
        }

        // Object - recurse into properties
        Object.keys(obj).forEach(key => {
            const newPrefix = prefix ? `${prefix}.${key}` : key;
            this.extractFieldPaths(obj[key], newPrefix, allFields, fieldTypes);
        });
    },

    /**
     * Compare source fields to entity fields to identify migration losses
     */
    compareFieldMigration(sourceFields, entityFields) {
        console.log("Comparing field migration...");

        const sourceFieldSet = new Set(sourceFields.fieldNames);
        const entityFieldSet = new Set(entityFields.fieldNames);

        // Find fields that exist in source but not in entities
        const missingFields = sourceFields.fieldNames.filter(field => {
            // Check if source field has any representation in entity structure
            // (field might be nested or transformed)
            return !this.fieldExistsInEntity(field, entityFields.fieldNames);
        });

        // Find fields that exist in entities but not in source
        const newFields = entityFields.fieldNames.filter(field => {
            return !this.fieldExistsInSource(field, sourceFields.fieldNames);
        });

        // Identify critical data fields that are missing
        const criticalFields = [
            'ownerName', 'ownerName2', 'ownerAddress', 'propertyLocation',
            'mblu', 'pid', 'street', 'city', 'state', 'zip',
            'map', 'block', 'lot', 'unit', 'fireNumber'
        ];

        const missingCriticalFields = criticalFields.filter(field =>
            missingFields.includes(field)
        );

        const lossCount = missingFields.length;
        const lossPercentage = Math.round((lossCount / sourceFields.totalUniqueFields) * 100);

        const migrationAnalysis = {
            totalSourceFields: sourceFields.totalUniqueFields,
            totalEntityFields: entityFields.totalUniqueFields,
            missingFields: missingFields,
            missingCount: lossCount,
            lossPercentage: lossPercentage,
            newFields: newFields,
            missingCriticalFields: missingCriticalFields,
            fieldMigrationEfficiency: Math.round(((sourceFields.totalUniqueFields - lossCount) / sourceFields.totalUniqueFields) * 100)
        };

        console.log(`✓ Migration analysis complete:`);
        console.log(`   - Missing ${lossCount} fields (${lossPercentage}% loss)`);
        console.log(`   - Missing critical fields: ${missingCriticalFields.length}`);

        return migrationAnalysis;
    },

    /**
     * Check if source field exists in entity structure (possibly nested/transformed)
     */
    fieldExistsInEntity(sourceField, entityFieldNames) {
        // Direct match
        if (entityFieldNames.includes(sourceField)) return true;

        // Check for nested versions (e.g., ownerName -> name.identifier.primaryAlias.term)
        const possibleMappings = this.getSourceFieldMappings(sourceField);
        return possibleMappings.some(mapping =>
            entityFieldNames.some(entityField => entityField.includes(mapping))
        );
    },

    /**
     * Check if entity field corresponds to source field
     */
    fieldExistsInSource(entityField, sourceFieldNames) {
        // Check if entity field maps back to any source field
        return sourceFieldNames.some(sourceField => {
            const mappings = this.getSourceFieldMappings(sourceField);
            return mappings.some(mapping => entityField.includes(mapping));
        });
    },

    /**
     * Get possible entity field mappings for a source field
     */
    getSourceFieldMappings(sourceField) {
        const mappings = {
            'ownerName': ['name', 'primaryAlias', 'term'],
            'ownerName2': ['name', 'alias'],
            'ownerAddress': ['contactInfo', 'address'],
            'fireNumber': ['locationIdentifier', 'fireNumber'],
            'pid': ['locationIdentifier', 'pid'],
            'propertyLocation': ['locationIdentifier', 'address'],
            'street': ['contactInfo', 'address', 'street'],
            'city': ['contactInfo', 'address', 'city'],
            'state': ['contactInfo', 'address', 'state'],
            'zip': ['contactInfo', 'address', 'zip'],
            'accountNumber': ['accountNumber']
        };

        return mappings[sourceField] || [sourceField];
    },

    /**
     * Generate comprehensive audit report
     */
    generateAuditReport(sourceFields, entityFields, migrationAnalysis) {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                sourceDataAnalysis: {
                    totalRecords: sourceFields.recordCount,
                    totalFields: sourceFields.totalUniqueFields,
                    fieldNames: sourceFields.fieldNames
                },
                entityAnalysis: {
                    totalRecords: entityFields.recordCount,
                    totalFields: entityFields.totalUniqueFields,
                    entityTypes: entityFields.entityTypes
                },
                migrationResults: {
                    fieldLossCount: migrationAnalysis.missingCount,
                    fieldLossPercentage: migrationAnalysis.lossPercentage,
                    migrationEfficiency: migrationAnalysis.fieldMigrationEfficiency,
                    criticalFieldsLost: migrationAnalysis.missingCriticalFields.length
                }
            },
            detailedFindings: {
                missingFields: migrationAnalysis.missingFields,
                missingCriticalFields: migrationAnalysis.missingCriticalFields,
                newFieldsInEntities: migrationAnalysis.newFields,
                sourceFieldSamples: sourceFields.sampleValues,
                recommendedActions: this.generateRecommendations(migrationAnalysis)
            }
        };

        return report;
    },

    /**
     * Generate recommendations based on audit findings
     */
    generateRecommendations(migrationAnalysis) {
        const recommendations = [];

        if (migrationAnalysis.lossPercentage > 70) {
            recommendations.push({
                priority: 'CRITICAL',
                issue: 'Massive field loss during entity creation',
                recommendation: 'Complete redesign of entity creation process to preserve all source fields',
                impact: 'High - Critical data loss affecting matching and analysis capabilities'
            });
        }

        if (migrationAnalysis.missingCriticalFields.length > 0) {
            recommendations.push({
                priority: 'HIGH',
                issue: `Critical fields missing: ${migrationAnalysis.missingCriticalFields.join(', ')}`,
                recommendation: 'Ensure entity structure captures all critical identification and contact fields',
                impact: 'High - Missing essential data for entity matching and contact discovery'
            });
        }

        if (migrationAnalysis.fieldMigrationEfficiency < 50) {
            recommendations.push({
                priority: 'MEDIUM',
                issue: 'Low field migration efficiency',
                recommendation: 'Audit entity porting process to identify where field loss occurs',
                impact: 'Medium - Reduced data completeness affects system capabilities'
            });
        }

        return recommendations;
    },

    /**
     * Display audit results in console with formatted output
     */
    displayAuditResults(auditResult) {
        if (!auditResult.success) {
            console.error("❌ Audit failed:", auditResult.error);
            return;
        }

        const report = auditResult.auditReport;

        console.log("\n" + "=".repeat(60));
        console.log("📋 VISIONAPPRAISAL FIELD MIGRATION AUDIT REPORT");
        console.log("=".repeat(60));

        console.log("\n📊 SUMMARY:");
        console.log(`   Source Records: ${report.summary.sourceDataAnalysis.totalRecords}`);
        console.log(`   Source Fields: ${report.summary.sourceDataAnalysis.totalFields}`);
        console.log(`   Entity Records: ${report.summary.entityAnalysis.totalRecords}`);
        console.log(`   Entity Fields: ${report.summary.entityAnalysis.totalFields}`);
        console.log(`   Field Loss: ${report.summary.migrationResults.fieldLossCount} (${report.summary.migrationResults.fieldLossPercentage}%)`);
        console.log(`   Migration Efficiency: ${report.summary.migrationResults.migrationEfficiency}%`);

        console.log("\n🚨 MISSING CRITICAL FIELDS:");
        if (report.detailedFindings.missingCriticalFields.length > 0) {
            report.detailedFindings.missingCriticalFields.forEach(field => {
                console.log(`   ❌ ${field}`);
            });
        } else {
            console.log("   ✅ No critical fields missing");
        }

        console.log("\n📝 ALL MISSING FIELDS:");
        report.detailedFindings.missingFields.forEach(field => {
            console.log(`   - ${field}`);
        });

        console.log("\n🔧 RECOMMENDATIONS:");
        report.detailedFindings.recommendedActions.forEach((rec, index) => {
            console.log(`   ${index + 1}. [${rec.priority}] ${rec.issue}`);
            console.log(`      → ${rec.recommendation}`);
            console.log(`      Impact: ${rec.impact}\n`);
        });

        console.log("=".repeat(60));
    }
};

// Make available globally for testing
if (typeof window !== 'undefined') {
    window.VisionAppraisalFieldAudit = VisionAppraisalFieldAudit;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VisionAppraisalFieldAudit;
}