/**
 * Business Entity Filter System
 *
 * Two-tier business entity exclusion for name matching:
 * 1. Complete entity exclusion (institutional/governmental)
 * 2. Business term stripping (clean personal names)
 */

class BusinessEntityFilter {
    constructor() {
        this.completeExclusionSet = new Set();
        this.businessTermsSet = new Set();
        this.initialized = false;
    }

    /**
     * Initialize the filter with data from CSV files
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Load complete exclusion entities
            const completeExclusionData = await this.loadCSVFile('/servers/Results/BusinessTermsMaster - NonNameFullNamesx.csv');
            completeExclusionData.forEach(entity => {
                this.completeExclusionSet.add(entity.trim().toUpperCase());
            });

            // Load business terms for stripping
            const businessTermsData = await this.loadCSVFile('/servers/Results/BusinessTermsMaster - Nonnames.csv');
            businessTermsData.forEach(term => {
                this.businessTermsSet.add(term.trim().toUpperCase());
            });

            this.initialized = true;
            console.log(`BusinessEntityFilter initialized:`);
            console.log(`  - ${this.completeExclusionSet.size} complete exclusion entities`);
            console.log(`  - ${this.businessTermsSet.size} business terms for stripping`);

        } catch (error) {
            console.error('Failed to initialize BusinessEntityFilter:', error);
            throw error;
        }
    }

    /**
     * Load CSV file and return array of values (handles numbered format like "1→VALUE")
     */
    async loadCSVFile(relativePath) {
        const fs = require('fs').promises;
        const path = require('path');

        const fullPath = path.join(__dirname, '../../', relativePath);
        const content = await fs.readFile(fullPath, 'utf-8');

        return content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                // Handle numbered format: "1→TOWN OF NEW SHOREHAM" -> "TOWN OF NEW SHOREHAM"
                const arrowIndex = line.indexOf('→');
                return arrowIndex !== -1 ? line.substring(arrowIndex + 1).trim() : line;
            })
            .filter(value => value.length > 0);
    }

    /**
     * Check if a name represents a complete business entity that should be excluded
     * @param {string} name - Name to check
     * @returns {boolean} - True if this is a business entity to exclude completely
     */
    isCompleteBusinessEntity(name) {
        if (!this.initialized) {
            throw new Error('BusinessEntityFilter not initialized. Call initialize() first.');
        }

        const normalizedName = name.trim().toUpperCase();
        return this.completeExclusionSet.has(normalizedName);
    }

    /**
     * Strip business terms from a name to get the personal name component
     * @param {string} name - Original name with potential business terms
     * @returns {string} - Name with business terms removed and cleaned
     */
    stripBusinessTerms(name) {
        if (!this.initialized) {
            throw new Error('BusinessEntityFilter not initialized. Call initialize() first.');
        }

        let cleanedName = name.trim();

        // Split name into words for term-by-term filtering
        const words = cleanedName.split(/\s+/);
        const filteredWords = words.filter(word => {
            const upperWord = word.toUpperCase();
            // Remove punctuation for matching but keep original word if not a business term
            const cleanWord = upperWord.replace(/[^\w]/g, '');
            return !this.businessTermsSet.has(cleanWord) && !this.businessTermsSet.has(upperWord);
        });

        // Rejoin filtered words
        cleanedName = filteredWords.join(' ');

        // Clean up extra whitespace and punctuation
        cleanedName = cleanedName
            .replace(/\s+/g, ' ')  // Multiple spaces to single space
            .replace(/[,\s]+$/, '') // Remove trailing commas and spaces
            .replace(/^[,\s]+/, '') // Remove leading commas and spaces
            .trim();

        return cleanedName;
    }

    /**
     * Determine the entity type and appropriate processing
     * @param {string} name - Name to classify
     * @returns {Object} - {type: 'business_entity'|'individual', cleanedName: string, originalName: string}
     */
    classifyAndCleanName(name) {
        if (!this.initialized) {
            throw new Error('BusinessEntityFilter not initialized. Call initialize() first.');
        }

        const originalName = name;

        // Check if this is a complete business entity
        if (this.isCompleteBusinessEntity(name)) {
            return {
                type: 'business_entity',
                cleanedName: name,
                originalName: originalName,
                shouldExcludeFromMatching: true
            };
        }

        // Strip business terms for individual name matching
        const cleanedName = this.stripBusinessTerms(name);

        // If nothing left after stripping, it was probably a business entity
        if (cleanedName.length === 0) {
            return {
                type: 'business_entity',
                cleanedName: originalName,
                originalName: originalName,
                shouldExcludeFromMatching: true
            };
        }

        return {
            type: 'individual',
            cleanedName: cleanedName,
            originalName: originalName,
            shouldExcludeFromMatching: false
        };
    }

    /**
     * Test function to validate the business entity filter
     */
    async testBusinessEntityFilter() {
        await this.initialize();

        console.log('\n=== Business Entity Filter Test ===');

        const testNames = [
            'TOWN OF NEW SHOREHAM',                    // Complete exclusion
            'JOHNSON, ROBERT & MARY TRUST',            // Strip TRUST
            'HARBOR POND LLC',                         // Strip LLC
            'SMITH FAMILY REVOCABLE TRUST',            // Strip REVOCABLE, TRUST
            'JOHN DOE',                                // Individual name
            'BLUE COVE ASSOCIATION',                   // Complete exclusion
            'ROBERTS, SUSAN M TRUSTEE',                // Strip TRUSTEE
            'CONSERVANCY FOR NATURE',                  // Business terms
            'BROWN, DAVID & JENNIFER'                  // Individual name
        ];

        testNames.forEach(name => {
            const result = this.classifyAndCleanName(name);
            console.log(`"${name}"`);
            console.log(`  Type: ${result.type}`);
            console.log(`  Cleaned: "${result.cleanedName}"`);
            console.log(`  Exclude: ${result.shouldExcludeFromMatching}`);
            console.log('');
        });
    }
}

module.exports = BusinessEntityFilter;