/**
 * Recursive Class Serialization Utilities
 *
 * Handles serialization/deserialization of complex object hierarchies with class instances.
 * Preserves constructor information through the entire object tree by adding type properties.
 *
 * ARCHITECTURE:
 * - serializeWithTypes: Recursive replacer adds type property to all class instances
 * - deserializeWithTypes: Recursive reviver restores class instances from type properties
 * - Class registry maps class names to constructors for restoration
 *
 * USAGE:
 * - Replace JSON.stringify(obj) with serializeWithTypes(obj)
 * - Replace JSON.parse(str) with deserializeWithTypes(str, classRegistry)
 */

/**
 * Class Registry - Maps class names to their constructors
 * This enables restoration of class instances during deserialization
 */
const CLASS_REGISTRY = {
    // Entity Classes
    'Entity': typeof Entity !== 'undefined' ? Entity : null,
    'Individual': typeof Individual !== 'undefined' ? Individual : null,
    'CompositeHousehold': typeof CompositeHousehold !== 'undefined' ? CompositeHousehold : null,
    'AggregateHousehold': typeof AggregateHousehold !== 'undefined' ? AggregateHousehold : null,
    'NonHuman': typeof NonHuman !== 'undefined' ? NonHuman : null,
    'Business': typeof Business !== 'undefined' ? Business : null,
    'LegalConstruct': typeof LegalConstruct !== 'undefined' ? LegalConstruct : null,

    // Alias Classes
    'AttributedTerm': typeof AttributedTerm !== 'undefined' ? AttributedTerm : null,
    'FireNumberTerm': typeof FireNumberTerm !== 'undefined' ? FireNumberTerm : null,
    'AccountNumberTerm': typeof AccountNumberTerm !== 'undefined' ? AccountNumberTerm : null,
    'EmailTerm': typeof EmailTerm !== 'undefined' ? EmailTerm : null,
    'Aliases': typeof Aliases !== 'undefined' ? Aliases : null,
    'Aliased': typeof Aliased !== 'undefined' ? Aliased : null,
    'SimpleIdentifiers': typeof SimpleIdentifiers !== 'undefined' ? SimpleIdentifiers : null,
    'ComplexIdentifiers': typeof ComplexIdentifiers !== 'undefined' ? ComplexIdentifiers : null,
    'IndicativeData': typeof IndicativeData !== 'undefined' ? IndicativeData : null,
    'IdentifyingData': typeof IdentifyingData !== 'undefined' ? IdentifyingData : null,
    'FireNumber': typeof FireNumber !== 'undefined' ? FireNumber : null,
    'PoBox': typeof PoBox !== 'undefined' ? PoBox : null,
    'PID': typeof PID !== 'undefined' ? PID : null,
    'IndividualName': typeof IndividualName !== 'undefined' ? IndividualName : null,
    'HouseholdName': typeof HouseholdName !== 'undefined' ? HouseholdName : null,
    'Address': typeof Address !== 'undefined' ? Address : null,

    // Contact Info Classes
    'Info': typeof Info !== 'undefined' ? Info : null,
    'ContactInfo': typeof ContactInfo !== 'undefined' ? ContactInfo : null,
    'OtherInfo': typeof OtherInfo !== 'undefined' ? OtherInfo : null,
    'HouseholdOtherInfo': typeof HouseholdOtherInfo !== 'undefined' ? HouseholdOtherInfo : null,
    'LegacyInfo': typeof LegacyInfo !== 'undefined' ? LegacyInfo : null,
    'HouseholdInformation': typeof HouseholdInformation !== 'undefined' ? HouseholdInformation : null,

    // Comparison Participant Classes
    'ParentDescription': typeof ParentDescription !== 'undefined' ? ParentDescription : null,
    'ParticipantDescription': typeof ParticipantDescription !== 'undefined' ? ParticipantDescription : null,
    'ComparisonParticipants': typeof ComparisonParticipants !== 'undefined' ? ComparisonParticipants : null,

    // Built-in Classes
    'Map': Map,
    'Set': Set,
    'Date': Date,
    'RegExp': RegExp
};

/**
 * Recursive serialization with type preservation
 * Adds __type property to all class instances during serialization
 *
 * @param {*} obj - Object to serialize
 * @returns {string} JSON string with type information
 */
function serializeWithTypes(obj) {
    try {
        return JSON.stringify(obj, function(key, value) {
            // Handle null/undefined
            if (value === null || value === undefined) {
                return value;
            }

            // Handle primitives
            if (typeof value !== 'object') {
                return value;
            }

            // Handle arrays
            if (Array.isArray(value)) {
                return value;
            }

            // Handle Maps
            if (value instanceof Map) {
                return {
                    type: 'Map',
                    __data: Array.from(value.entries())
                };
            }

            // Handle Sets
            if (value instanceof Set) {
                return {
                    type: 'Set',
                    __data: Array.from(value)
                };
            }

            // Handle Dates
            if (value instanceof Date) {
                return {
                    type: 'Date',
                    __data: value.toISOString()
                };
            }

            // Handle RegExp
            if (value instanceof RegExp) {
                return {
                    type: 'RegExp',
                    __data: {
                        source: value.source,
                        flags: value.flags
                    }
                };
            }

            // Handle class instances (objects with non-Object constructor)
            if (value.constructor && value.constructor !== Object) {
                const className = value.constructor.name;

                // Create a copy of the object with type information
                const serializedObject = {
                    type: className
                };

                // Copy all enumerable properties
                for (const prop in value) {
                    if (value.hasOwnProperty(prop)) {
                        serializedObject[prop] = value[prop];
                    }
                }

                return serializedObject;
            }

            // Regular objects pass through unchanged
            return value;
        }, 2);
    } catch (error) {
        console.error('Serialization error:', error);
        throw new Error(`Failed to serialize object: ${error.message}`);
    }
}

/**
 * Recursive deserialization with type restoration
 * Restores class instances from __type properties during deserialization
 *
 * @param {string} jsonString - JSON string with type information
 * @param {Object} classRegistry - Optional custom class registry (defaults to CLASS_REGISTRY)
 * @returns {*} Deserialized object with restored class instances
 */
function deserializeWithTypes(jsonString, classRegistry = CLASS_REGISTRY) {
    try {
        return JSON.parse(jsonString, function(key, value) {
            // Handle null/undefined/primitives
            if (value === null || value === undefined || typeof value !== 'object') {
                return value;
            }

            // Handle arrays
            if (Array.isArray(value)) {
                return value;
            }

            // Handle objects with type information
            if (value.type) {
                const className = value.type;

                // Handle built-in types
                if (className === 'Map') {
                    return new Map(value.__data);
                }

                if (className === 'Set') {
                    return new Set(value.__data);
                }

                if (className === 'Date') {
                    return new Date(value.__data);
                }

                if (className === 'RegExp') {
                    return new RegExp(value.__data.source, value.__data.flags);
                }

                // Handle custom classes
                const ClassConstructor = classRegistry[className];
                if (ClassConstructor) {
                    // PREFERRED: Use fromSerializedData if available (constructor-based deserialization)
                    // This ensures constructor initialization logic runs
                    if (typeof ClassConstructor.fromSerializedData === 'function') {
                        return ClassConstructor.fromSerializedData(value);
                    }

                    // FALLBACK: Create instance without calling constructor (legacy approach)
                    // NOTE: This means constructor initialization code does NOT run
                    const instance = Object.create(ClassConstructor.prototype);

                    // Copy all properties except type
                    for (const prop in value) {
                        if (prop !== 'type' && value.hasOwnProperty(prop)) {
                            instance[prop] = value[prop];
                        }
                    }

                    // Restore comparisonCalculator from name if available (new pattern)
                    if (instance.comparisonCalculatorName && typeof resolveComparisonCalculator !== 'undefined') {
                        instance.comparisonCalculator = resolveComparisonCalculator(instance.comparisonCalculatorName);
                    }
                    // Legacy fallback: Restore comparisonCalculator function reference directly
                    else if (instance.comparisonWeights && !instance.comparisonCalculator) {
                        if (typeof defaultWeightedComparison !== 'undefined') {
                            instance.comparisonCalculator = defaultWeightedComparison;
                        }
                    }

                    return instance;
                } else {
                    console.warn(`Class '${className}' not found in registry, returning plain object`);
                    // Return object without type property
                    const plainObject = {};
                    for (const prop in value) {
                        if (prop !== 'type' && value.hasOwnProperty(prop)) {
                            plainObject[prop] = value[prop];
                        }
                    }
                    return plainObject;
                }
            }

            // Regular objects pass through unchanged
            return value;
        });
    } catch (error) {
        console.error('Deserialization error:', error);
        throw new Error(`Failed to deserialize object: ${error.message}`);
    }
}

/**
 * Validate that all classes in the registry are available
 * @returns {Object} Validation report with available/missing classes
 */
function validateClassRegistry() {
    const report = {
        available: [],
        missing: [],
        total: 0
    };

    for (const [className, ClassConstructor] of Object.entries(CLASS_REGISTRY)) {
        report.total++;
        if (ClassConstructor !== null) {
            report.available.push(className);
        } else {
            report.missing.push(className);
        }
    }

    return report;
}

/**
 * Test serialization/deserialization round-trip with a simple object
 * @param {*} testObject - Object to test with
 * @returns {Object} Test results
 */
function testRoundTrip(testObject) {
    try {
        const serialized = serializeWithTypes(testObject);
        const deserialized = deserializeWithTypes(serialized);

        return {
            success: true,
            original: testObject,
            serialized: serialized,
            deserialized: deserialized,
            serializedLength: serialized.length
        };
    } catch (error) {
        return {
            success: false,
            error: error.message,
            original: testObject
        };
    }
}

// Export functions for use in other modules
if (typeof window !== 'undefined') {
    // Browser environment
    window.serializeWithTypes = serializeWithTypes;
    window.deserializeWithTypes = deserializeWithTypes;
    window.validateClassRegistry = validateClassRegistry;
    window.testRoundTrip = testRoundTrip;
    window.CLASS_REGISTRY = CLASS_REGISTRY;
} else if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        serializeWithTypes,
        deserializeWithTypes,
        validateClassRegistry,
        testRoundTrip,
        CLASS_REGISTRY
    };
}