/**
 * Composite Name Similarity Calculator
 *
 * Combines multiple algorithms for robust name matching:
 * 1. Custom weighted Levenshtein (primary) - from matchingTools.js
 * 2. Jaro-Winkler (secondary) - name-specific matching
 * 3. Metaphone (tertiary) - phonetic similarity
 *
 * Designed for Block Island name matching with business entity integration.
 */

class CompositeSimilarity {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initialize the composite similarity calculator
     * Embeds the custom Levenshtein from matchingTools.js
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Embed custom weighted Levenshtein algorithm from matchingTools.js
            this.levenshteinDistance = (str1 = '', str2 = '') => {
                let vow = ["a", "e", "i", "o", "u", "y"];
                let cons = ["b", "c", "d", "e", "f", "g", "h", "j", "k", "l", "m", "n", "p", "q", "r", "s", "t", "v", "w", "x", "z"];

                const track = Array(str2.length + 1).fill(null).map(() =>
                    Array(str1.length + 1).fill(null));
                for (let i = 0; i <= str1.length; i += 1) {
                    track[0][i] = i;
                }
                for (let j = 0; j <= str2.length; j += 1) {
                    track[j][0] = j;
                }
                for (let j = 1; j <= str2.length; j += 1) {
                    for (let i = 1; i <= str1.length; i += 1) {
                        const indicator = ((str1[i - 1] === str2[j - 1]) ? 0 :
                            (((vow.indexOf(str1[i - 1]) > -1) && (vow.indexOf(str2[j - 1]) > -1)) ? (6 * 5) / (20 * 19) :
                                (((cons.indexOf(str1[i - 1]) > -1) && (cons.indexOf(str2[j - 1]) > -1) ? 1 : (6 + 6) / 19))));
                        track[j][i] = Math.min(
                            track[j][i - 1] + 1, // deletion
                            track[j - 1][i] + 1, // insertion
                            track[j - 1][i - 1] + indicator, // substitution
                        );
                    }
                }
                return track[str2.length][str1.length];
            };

            this.initialized = true;
            console.log('CompositeSimilarity initialized with custom weighted Levenshtein');
        } catch (error) {
            console.error('Failed to initialize CompositeSimilarity:', error);
            throw error;
        }
    }

    /**
     * Calculate composite similarity score between two names
     * @param {string} name1 - First name (already cleaned by BusinessEntityFilter)
     * @param {string} name2 - Second name (already cleaned by BusinessEntityFilter)
     * @returns {Object} - {score: number, breakdown: object, confidence: string}
     */
    calculateSimilarity(name1, name2) {
        if (!this.initialized) {
            throw new Error('CompositeSimilarity not initialized. Call initialize() first.');
        }

        // Normalize inputs
        const norm1 = this.normalizeName(name1);
        const norm2 = this.normalizeName(name2);

        // If identical after normalization, perfect match
        if (norm1 === norm2) {
            return {
                score: 1.0,
                breakdown: { exact: 1.0, levenshtein: 1.0, jaroWinkler: 1.0, metaphone: 1.0 },
                confidence: 'exact'
            };
        }

        // Calculate Levenshtein similarity (convert distance to similarity score)
        const levDistance = this.levenshteinDistance(norm1, norm2);
        const maxLength = Math.max(norm1.length, norm2.length);
        const levSimilarity = maxLength > 0 ? 1 - (levDistance / maxLength) : 1;

        const breakdown = {
            levenshtein: Math.max(0, levSimilarity),  // Custom weighted algorithm
            jaroWinkler: 0,    // Name-specific matching (placeholder)
            metaphone: 0       // Phonetic similarity (placeholder)
        };

        // Composite scoring (weighted average, heavily favor Levenshtein for now)
        const compositeScore = breakdown.levenshtein * 0.8 + breakdown.jaroWinkler * 0.15 + breakdown.metaphone * 0.05;

        return {
            score: compositeScore,
            breakdown: breakdown,
            confidence: this.classifyConfidence(compositeScore)
        };
    }

    /**
     * Normalize name for comparison
     * @param {string} name - Raw name
     * @returns {string} - Normalized name
     */
    normalizeName(name) {
        return name
            .trim()
            .toUpperCase()
            .replace(/\s+/g, ' ')  // Multiple spaces to single
            .replace(/[^\w\s&,-]/g, ''); // Keep only letters, numbers, spaces, &, comma, dash
    }

    /**
     * Classify confidence level based on composite score
     * @param {number} score - Composite similarity score
     * @returns {string} - Confidence classification
     */
    classifyConfidence(score) {
        if (score >= 0.9) return 'high';
        if (score >= 0.7) return 'medium';
        if (score >= 0.5) return 'low';
        return 'very_low';
    }

    /**
     * Test function for browser console testing
     */
    async testCompositeSimilarity() {
        await this.initialize();

        console.log('\n=== Composite Similarity Test ===');

        const testPairs = [
            ['JOHNSON, ROBERT', 'JOHNSON, ROBERT & MARY'],
            ['SMITH, JOHN', 'JOHN SMITH'],
            ['BROWN, DAVID', 'BROWN, DAVE'],
            ['WILLIAMS, SUSAN', 'WILLIAMS, SUE'],
            ['JONES, MICHAEL', 'COMPLETELY DIFFERENT NAME']
        ];

        testPairs.forEach(([name1, name2]) => {
            const result = this.calculateSimilarity(name1, name2);
            console.log(`"${name1}" vs "${name2}"`);
            console.log(`  Score: ${result.score.toFixed(3)}, Confidence: ${result.confidence}`);
            console.log(`  Breakdown:`, result.breakdown);
            console.log('');
        });
    }
}