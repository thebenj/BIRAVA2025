// Simple test for serialization functionality
// Load the classes (simulating browser environment)

// Mock classes for Node.js testing
class AttributedTerm {
    constructor(term, source, index, identifier) {
        this.term = term;
        this.sourceMap = new Map();
        this.sourceMap.set(source, { index: index, identifier: identifier });
    }

    serialize() {
        return {
            type: 'AttributedTerm',
            term: this.term,
            sourceMap: Array.from(this.sourceMap.entries()).map(([source, data]) => ({
                source: source,
                index: data.index,
                identifier: data.identifier
            }))
        };
    }

    static deserialize(data) {
        if (data.type !== 'AttributedTerm') {
            throw new Error('Invalid AttributedTerm serialization format');
        }

        const firstSource = data.sourceMap[0];
        const term = new AttributedTerm(data.term, firstSource.source, firstSource.index, firstSource.identifier);

        for (let i = 1; i < data.sourceMap.length; i++) {
            const sourceData = data.sourceMap[i];
            term.addAdditionalSource(sourceData.source, sourceData.index, sourceData.identifier);
        }

        return term;
    }

    addAdditionalSource(source, index, identifier) {
        this.sourceMap.set(source, { index: index, identifier: identifier });
    }
}

// Test basic serialization
console.log('Testing AttributedTerm serialization...');

const testTerm = new AttributedTerm('John Smith', 'BLOOMERANG_CSV', 1, 'ACC123');
console.log('Original term:', testTerm.term);

const serialized = testTerm.serialize();
console.log('Serialized:', JSON.stringify(serialized, null, 2));

const deserialized = AttributedTerm.deserialize(serialized);
console.log('Deserialized term:', deserialized.term);

if (testTerm.term === deserialized.term) {
    console.log('✅ Basic serialization test PASSED');
} else {
    console.log('❌ Basic serialization test FAILED');
}

console.log('Test complete.');