/**
 * Dual-Source Entity Capacity Assessment
 *
 * Purpose: Determines if entity structure can support combined VisionAppraisal + Bloomerang data
 * requirements including alias structures for cross-source matching variations.
 *
 * Leverages existing field loss assessment code from dualSourceFieldAnalysis.js
 * to create comprehensive entity design evaluation.
 */

const DualSourceEntityCapacityAssessment = {

    /**
     * Main assessment function - evaluates entity capacity for dual-source integration
     */
    async assessEntityCapacity() {
        try {
            console.log("=== DUAL-SOURCE ENTITY CAPACITY ASSESSMENT ===");

            // Step 1: Run existing field loss analyses
            console.log("Step 1: Running existing dual-source field analyses...");
            const fieldAnalysisResults = await this.runExistingFieldAnalyses();

            // Step 2: Analyze combined field requirements
            console.log("Step 2: Analyzing combined field requirements...");
            const combinedRequirements = this.analyzeCombinedFieldRequirements(fieldAnalysisResults);

            // Step 3: Assess current entity structure capacity
            console.log("Step 3: Assessing entity structure capacity...");
            const entityCapacity = await this.assessCurrentEntityCapacity();

            // Step 4: Evaluate alias system requirements
            console.log("Step 4: Evaluating alias system requirements...");
            const aliasRequirements = this.evaluateAliasRequirements(fieldAnalysisResults);

            // Step 5: Generate capacity gap analysis
            console.log("Step 5: Generating capacity gap analysis...");
            const gapAnalysis = this.generateCapacityGapAnalysis(
                combinedRequirements,
                entityCapacity,
                aliasRequirements
            );

            // Step 6: Create comprehensive assessment report
            console.log("Step 6: Creating assessment report...");
            const assessmentReport = this.generateAssessmentReport(
                fieldAnalysisResults,
                combinedRequirements,
                entityCapacity,
                aliasRequirements,
                gapAnalysis
            );

            console.log("✅ Dual-Source Entity Capacity Assessment Complete!");
            console.log(`📊 CRITICAL FINDINGS:`);
            console.log(`   - Combined Field Requirements: ${combinedRequirements.totalUniqueFields}`);
            console.log(`   - Current Entity Capacity: ${entityCapacity.maxFieldsSupported}`);
            console.log(`   - Capacity Gap: ${gapAnalysis.capacityGapPercentage}%`);
            console.log(`   - Critical Missing Capabilities: ${gapAnalysis.criticalGaps.length}`);

            return {
                success: true,
                assessmentReport: assessmentReport,
                fieldAnalysisResults: fieldAnalysisResults,
                combinedRequirements: combinedRequirements,
                entityCapacity: entityCapacity,
                aliasRequirements: aliasRequirements,
                gapAnalysis: gapAnalysis
            };

        } catch (error) {
            console.error("Dual-Source Entity Capacity Assessment failed:", error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Run existing field loss analyses using available code
     */
    async runExistingFieldAnalyses() {
        console.log("Running existing dual-source field analyses...");

        // Check if analysis functions are available
        if (typeof runDualSourceFieldAnalysis !== 'function') {
            throw new Error("dualSourceFieldAnalysis.js must be loaded first");
        }

        // Run the comprehensive dual-source analysis
        const results = await runDualSourceFieldAnalysis();

        console.log("✓ Existing field analyses complete");
        console.log(`  - VisionAppraisal field loss: ${results.summary.visionFieldLoss}`);
        console.log(`  - Bloomerang field loss: ${results.summary.bloomerangFieldLoss}`);

        return results;
    },

    /**
     * Analyze combined field requirements from both data sources
     */
    analyzeCombinedFieldRequirements(fieldAnalysisResults) {
        console.log("Analyzing combined field requirements...");

        const visionFields = new Set(fieldAnalysisResults.visionAppraisal.sourceFields);
        const bloomerangFields = new Set(fieldAnalysisResults.bloomerang.sourceFields);

        // Create combined field set
        const allFields = new Set([...visionFields, ...bloomerangFields]);

        // Identify overlapping fields (same concept, different sources)
        const overlappingFields = [];
        const visionFieldsArray = Array.from(visionFields);
        const bloomerangFieldsArray = Array.from(bloomerangFields);

        visionFieldsArray.forEach(vField => {
            bloomerangFieldsArray.forEach(bField => {
                if (this.fieldsRepresentSameConcept(vField, bField)) {
                    overlappingFields.push({
                        concept: this.getFieldConcept(vField, bField),
                        visionField: vField,
                        bloomerangField: bField,
                        requiresAliasSupport: true
                    });
                }
            });
        });

        // Categorize fields by type
        const fieldCategories = this.categorizeFields(Array.from(allFields));

        const combinedRequirements = {
            totalUniqueFields: allFields.size,
            visionOnlyFields: visionFieldsArray.filter(f => !bloomerangFields.has(f)),
            bloomerangOnlyFields: bloomerangFieldsArray.filter(f => !visionFields.has(f)),
            overlappingFields: overlappingFields,
            fieldCategories: fieldCategories,
            aliasRequiredFields: overlappingFields.length,
            criticalIntegrationFields: this.identifyCriticalIntegrationFields(Array.from(allFields))
        };

        console.log(`✓ Combined requirements analysis complete`);
        console.log(`  - Total unique fields needed: ${combinedRequirements.totalUniqueFields}`);
        console.log(`  - Fields requiring alias support: ${combinedRequirements.aliasRequiredFields}`);
        console.log(`  - Critical integration fields: ${combinedRequirements.criticalIntegrationFields.length}`);

        return combinedRequirements;
    },

    /**
     * Assess current entity structure capacity for holding dual-source data
     */
    async assessCurrentEntityCapacity() {
        console.log("Assessing current entity structure capacity...");

        // Analyze entity class structure
        const entityStructureCapacity = this.analyzeEntityClassStructure();

        // Analyze AttributedTerm alias capacity
        const aliasSystemCapacity = this.analyzeAliasSystemCapacity();

        // Analyze ContactInfo capacity
        const contactInfoCapacity = this.analyzeContactInfoCapacity();

        // Calculate total capacity
        const totalCapacity = {
            maxFieldsSupported: entityStructureCapacity.maxFields +
                                aliasSystemCapacity.maxAliasesPerField * 10 +
                                contactInfoCapacity.maxContactFields,
            entityStructure: entityStructureCapacity,
            aliasSystem: aliasSystemCapacity,
            contactInfo: contactInfoCapacity,
            limitations: this.identifyStructuralLimitations()
        };

        console.log(`✓ Entity capacity assessment complete`);
        console.log(`  - Max fields supported: ${totalCapacity.maxFieldsSupported}`);
        console.log(`  - Entity structure limitations: ${totalCapacity.limitations.length}`);

        return totalCapacity;
    },

    /**
     * Analyze entity class structure capacity
     */
    analyzeEntityClassStructure() {
        // Count available properties in Entity base class and subclasses
        const baseProperties = [
            'locationIdentifier', 'name', 'accountNumber', 'contactInfo',
            'label', 'number' // legacy
        ];

        const subclassProperties = {
            'Individual': [],
            'CompositeHousehold': [],
            'AggregateHousehold': ['individuals'],
            'NonHuman': [],
            'Business': [],
            'LegalConstruct': []
        };

        return {
            maxFields: baseProperties.length + Math.max(...Object.values(subclassProperties).map(props => props.length)),
            baseProperties: baseProperties,
            subclassProperties: subclassProperties,
            extensible: true, // Classes can be extended
            supports: {
                nestedData: true,
                serialization: true,
                typePolymorphism: true
            }
        };
    },

    /**
     * Analyze AttributedTerm alias system capacity
     */
    analyzeAliasSystemCapacity() {
        return {
            maxAliasesPerField: Number.MAX_SAFE_INTEGER, // Arrays can grow arbitrarily
            supportsSourceAttribution: true,
            supportsConfidenceScoring: true,
            supportsTypeSpecialization: true,
            specializedTerms: ['FireNumberTerm', 'AccountNumberTerm', 'EmailTerm'],
            canCreateNewTypes: true
        };
    },

    /**
     * Analyze ContactInfo capacity
     */
    analyzeContactInfoCapacity() {
        return {
            maxContactFields: 20, // Estimated based on typical contact info needs
            supportsMultipleAddresses: true,
            supportsMultiplePhones: true,
            supportsMultipleEmails: true,
            hierarchicalStructure: true,
            supportsPreferences: true
        };
    },

    /**
     * Evaluate alias system requirements for cross-source matching
     */
    evaluateAliasRequirements(fieldAnalysisResults) {
        console.log("Evaluating alias system requirements...");

        const aliasRequirements = {
            nameVariations: this.getNameVariationRequirements(),
            addressVariations: this.getAddressVariationRequirements(),
            fireNumberVariations: this.getFireNumberVariationRequirements(),
            businessEntityVariations: this.getBusinessEntityVariationRequirements(),
            sourceSpecificFields: this.getSourceSpecificFieldRequirements(fieldAnalysisResults)
        };

        const totalAliasRequirements =
            aliasRequirements.nameVariations.length +
            aliasRequirements.addressVariations.length +
            aliasRequirements.fireNumberVariations.length +
            aliasRequirements.businessEntityVariations.length;

        console.log(`✓ Alias requirements evaluation complete`);
        console.log(`  - Total alias scenarios: ${totalAliasRequirements}`);

        return {
            ...aliasRequirements,
            totalAliasScenarios: totalAliasRequirements,
            criticalAliasNeeds: this.identifyCriticalAliasNeeds(aliasRequirements)
        };
    },

    /**
     * Generate capacity gap analysis
     */
    generateCapacityGapAnalysis(combinedRequirements, entityCapacity, aliasRequirements) {
        console.log("Generating capacity gap analysis...");

        // Calculate capacity gaps
        const fieldCapacityGap = Math.max(0, combinedRequirements.totalUniqueFields - entityCapacity.maxFieldsSupported);
        const aliasCapacityGap = this.calculateAliasCapacityGap(aliasRequirements, entityCapacity.aliasSystem);

        // Identify critical gaps
        const criticalGaps = [];

        if (fieldCapacityGap > 0) {
            criticalGaps.push({
                category: 'Field Storage',
                gap: fieldCapacityGap,
                impact: 'Cannot store all required fields',
                priority: 'CRITICAL'
            });
        }

        if (!entityCapacity.contactInfo.supportsMultipleAddresses &&
            combinedRequirements.fieldCategories.addressFields > 4) {
            criticalGaps.push({
                category: 'Address Storage',
                gap: 'Multiple address types not fully supported',
                impact: 'Cannot store VisionAppraisal + Bloomerang address variations',
                priority: 'HIGH'
            });
        }

        const capacityGapPercentage = Math.round(
            (fieldCapacityGap / combinedRequirements.totalUniqueFields) * 100
        );

        return {
            fieldCapacityGap: fieldCapacityGap,
            aliasCapacityGap: aliasCapacityGap,
            capacityGapPercentage: capacityGapPercentage,
            criticalGaps: criticalGaps,
            canSupportDualSource: criticalGaps.length === 0,
            recommendedActions: this.generateCapacityRecommendations(criticalGaps)
        };
    },

    /**
     * Helper functions for field analysis
     */
    fieldsRepresentSameConcept(field1, field2) {
        const conceptMappings = {
            'name': ['name', 'ownerName', 'firstName', 'lastName'],
            'address': ['address', 'street', 'ownerAddress', 'propertyLocation'],
            'fireNumber': ['fireNumber', 'fire number'],
            'email': ['email', 'primaryEmail'],
            'phone': ['phone', 'primaryPhone'],
            'city': ['city'],
            'state': ['state'],
            'zip': ['zip', 'zipCode']
        };

        for (const [concept, fields] of Object.entries(conceptMappings)) {
            const field1Match = fields.some(f => field1.toLowerCase().includes(f.toLowerCase()));
            const field2Match = fields.some(f => field2.toLowerCase().includes(f.toLowerCase()));
            if (field1Match && field2Match) return true;
        }

        return false;
    },

    getFieldConcept(field1, field2) {
        // Return the conceptual category these fields represent
        if (this.fieldsRepresentSameConcept(field1, field2)) {
            const concepts = ['name', 'address', 'fireNumber', 'email', 'phone', 'city', 'state', 'zip'];
            for (const concept of concepts) {
                if (field1.toLowerCase().includes(concept) || field2.toLowerCase().includes(concept)) {
                    return concept;
                }
            }
        }
        return 'unknown';
    },

    categorizeFields(fields) {
        const categories = {
            nameFields: [],
            addressFields: [],
            contactFields: [],
            identifierFields: [],
            transactionFields: [],
            metadataFields: []
        };

        fields.forEach(field => {
            const fieldLower = field.toLowerCase();
            if (fieldLower.includes('name')) categories.nameFields.push(field);
            else if (fieldLower.includes('address') || fieldLower.includes('street') ||
                    fieldLower.includes('city') || fieldLower.includes('state') || fieldLower.includes('zip')) {
                categories.addressFields.push(field);
            }
            else if (fieldLower.includes('email') || fieldLower.includes('phone')) categories.contactFields.push(field);
            else if (fieldLower.includes('id') || fieldLower.includes('number') || fieldLower.includes('fire')) {
                categories.identifierFields.push(field);
            }
            else if (fieldLower.includes('transaction') || fieldLower.includes('amount') || fieldLower.includes('date')) {
                categories.transactionFields.push(field);
            }
            else categories.metadataFields.push(field);
        });

        return categories;
    },

    identifyCriticalIntegrationFields(fields) {
        const criticalFields = [
            'fireNumber', 'name', 'ownerName', 'firstName', 'lastName',
            'address', 'street', 'city', 'state', 'zip',
            'email', 'pid', 'accountNumber'
        ];

        return fields.filter(field =>
            criticalFields.some(critical =>
                field.toLowerCase().includes(critical.toLowerCase())
            )
        );
    },

    getNameVariationRequirements() {
        return [
            { type: 'Individual vs Household', example: 'John Smith vs Smith Family' },
            { type: 'Name Order', example: 'Smith, John vs John Smith' },
            { type: 'Joint Ownership', example: 'John Smith vs John & Mary Smith' },
            { type: 'Business Suffix', example: 'Smith LLC vs Smith, LLC' }
        ];
    },

    getAddressVariationRequirements() {
        return [
            { type: 'Format Differences', example: '123 Main St vs 123 MAIN STREET' },
            { type: 'Unit Designations', example: 'Apt 1 vs Unit 1' },
            { type: 'Off Island vs On Island', example: 'Block Island addresses vs mainland' }
        ];
    },

    getFireNumberVariationRequirements() {
        return [
            { type: 'Numeric vs String', example: '1234 vs "1234"' },
            { type: 'Formatted vs Raw', example: 'Fire #1234 vs 1234' }
        ];
    },

    getBusinessEntityVariationRequirements() {
        return [
            { type: 'Entity Type Suffix', example: 'Trust vs TRUST' },
            { type: 'Punctuation', example: 'LLC vs L.L.C.' },
            { type: 'Abbreviation', example: 'Corporation vs Corp vs Inc' }
        ];
    },

    getSourceSpecificFieldRequirements(fieldAnalysisResults) {
        return {
            visionAppraisalSpecific: fieldAnalysisResults.visionAppraisal.sourceFields.filter(f =>
                !fieldAnalysisResults.bloomerang.sourceFields.some(bf => this.fieldsRepresentSameConcept(f, bf))
            ),
            bloomerangSpecific: fieldAnalysisResults.bloomerang.sourceFields.filter(f =>
                !fieldAnalysisResults.visionAppraisal.sourceFields.some(vf => this.fieldsRepresentSameConcept(f, vf))
            )
        };
    },

    identifyStructuralLimitations() {
        return [
            'Fixed class hierarchy may not accommodate all data variations',
            'Serialization may not preserve all nested data structures',
            'Type polymorphism limited to predefined entity types'
        ];
    },

    identifyCriticalAliasNeeds(aliasRequirements) {
        return [
            'Cross-source name matching',
            'Address format normalization',
            'Business entity recognition',
            'Fire Number standardization'
        ];
    },

    calculateAliasCapacityGap(aliasRequirements, aliasSystemCapacity) {
        // Current alias system appears sufficient for requirements
        return 0;
    },

    generateCapacityRecommendations(criticalGaps) {
        const recommendations = [];

        criticalGaps.forEach(gap => {
            switch (gap.category) {
                case 'Field Storage':
                    recommendations.push({
                        priority: 'CRITICAL',
                        action: 'Expand entity class properties to support all required fields',
                        implementation: 'Add source-specific field containers or dynamic field storage'
                    });
                    break;
                case 'Address Storage':
                    recommendations.push({
                        priority: 'HIGH',
                        action: 'Enhance ContactInfo to support multiple address types',
                        implementation: 'Add VisionAppraisal property address vs Bloomerang contact addresses'
                    });
                    break;
                default:
                    recommendations.push({
                        priority: gap.priority || 'MEDIUM',
                        action: `Address ${gap.category} limitation`,
                        implementation: 'Review and enhance entity structure'
                    });
            }
        });

        return recommendations;
    },

    /**
     * Generate comprehensive assessment report
     */
    generateAssessmentReport(fieldAnalysisResults, combinedRequirements, entityCapacity, aliasRequirements, gapAnalysis) {
        return {
            timestamp: new Date().toISOString(),
            executiveSummary: {
                canSupportDualSource: gapAnalysis.canSupportDualSource,
                criticalGapsCount: gapAnalysis.criticalGaps.length,
                capacityGapPercentage: gapAnalysis.capacityGapPercentage,
                recommendationsCount: gapAnalysis.recommendedActions.length
            },
            fieldRequirements: {
                totalFieldsNeeded: combinedRequirements.totalUniqueFields,
                visionAppraisalFields: fieldAnalysisResults.visionAppraisal.sourceFields.length,
                bloomerangFields: fieldAnalysisResults.bloomerang.sourceFields.length,
                overlappingFields: combinedRequirements.overlappingFields.length,
                aliasRequiredFields: combinedRequirements.aliasRequiredFields
            },
            entityCapacity: {
                maxFieldsSupported: entityCapacity.maxFieldsSupported,
                aliasSystemCapacity: entityCapacity.aliasSystem.maxAliasesPerField,
                contactInfoCapacity: entityCapacity.contactInfo.maxContactFields,
                limitations: entityCapacity.limitations
            },
            gapAnalysis: gapAnalysis,
            recommendations: gapAnalysis.recommendedActions,
            criticalFindings: {
                systemicDataLoss: {
                    visionAppraisal: fieldAnalysisResults.summary.visionFieldLoss,
                    bloomerang: fieldAnalysisResults.summary.bloomerangFieldLoss
                },
                entityDesignSufficiency: gapAnalysis.canSupportDualSource,
                aliasSystemReadiness: aliasRequirements.totalAliasScenarios < 100 // Reasonable threshold
            }
        };
    },

    /**
     * Display assessment results with formatted output
     */
    displayAssessmentResults(assessmentResult) {
        if (!assessmentResult.success) {
            console.error("❌ Assessment failed:", assessmentResult.error);
            return;
        }

        const report = assessmentResult.assessmentReport;

        console.log("\n" + "=".repeat(70));
        console.log("📋 DUAL-SOURCE ENTITY CAPACITY ASSESSMENT REPORT");
        console.log("=".repeat(70));

        console.log("\n🎯 EXECUTIVE SUMMARY:");
        console.log(`   Can Support Dual Source: ${report.executiveSummary.canSupportDualSource ? '✅ YES' : '❌ NO'}`);
        console.log(`   Critical Gaps: ${report.executiveSummary.criticalGapsCount}`);
        console.log(`   Capacity Gap: ${report.executiveSummary.capacityGapPercentage}%`);

        console.log("\n📊 FIELD REQUIREMENTS:");
        console.log(`   Total Fields Needed: ${report.fieldRequirements.totalFieldsNeeded}`);
        console.log(`   VisionAppraisal Fields: ${report.fieldRequirements.visionAppraisalFields}`);
        console.log(`   Bloomerang Fields: ${report.fieldRequirements.bloomerangFields}`);
        console.log(`   Overlapping (Alias Required): ${report.fieldRequirements.overlappingFields}`);

        console.log("\n🏗️ CURRENT ENTITY CAPACITY:");
        console.log(`   Max Fields Supported: ${report.entityCapacity.maxFieldsSupported}`);
        console.log(`   Alias System Capacity: ${report.entityCapacity.aliasSystemCapacity}`);
        console.log(`   Contact Info Capacity: ${report.entityCapacity.contactInfoCapacity}`);

        if (report.gapAnalysis.criticalGaps.length > 0) {
            console.log("\n🚨 CRITICAL GAPS:");
            report.gapAnalysis.criticalGaps.forEach((gap, index) => {
                console.log(`   ${index + 1}. [${gap.priority}] ${gap.category}: ${gap.impact}`);
            });
        }

        if (report.recommendations.length > 0) {
            console.log("\n🔧 RECOMMENDATIONS:");
            report.recommendations.forEach((rec, index) => {
                console.log(`   ${index + 1}. [${rec.priority}] ${rec.action}`);
                console.log(`      → ${rec.implementation}`);
            });
        }

        console.log("\n" + "=".repeat(70));
    }
};

// Make available globally for testing
if (typeof window !== 'undefined') {
    window.DualSourceEntityCapacityAssessment = DualSourceEntityCapacityAssessment;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DualSourceEntityCapacityAssessment;
}