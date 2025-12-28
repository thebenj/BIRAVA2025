// Load Phase 2D Dependencies
// Load all required scripts for Phase 2D pipeline processing

console.log('=== LOADING PHASE 2D DEPENDENCIES ===');

const dependencies = [
    './scripts/dataSources/visionAppraisal.js',
    './scripts/dataSources/visionAppraisalNameParser.js',
    './scripts/validation/case31Validator.js',
    './scripts/objectStructure/entityClasses.js',
    './scripts/objectStructure/aliasClasses.js'
];

let loadedCount = 0;

function loadNextDependency(index) {
    if (index >= dependencies.length) {
        console.log('✅ All Phase 2D dependencies loaded successfully!');
        console.log('Ready to run: testPhase2DPipeline()');
        return;
    }

    const script = document.createElement('script');
    script.src = dependencies[index];

    script.onload = () => {
        loadedCount++;
        console.log(`✅ Loaded ${loadedCount}/${dependencies.length}: ${dependencies[index]}`);

        // Load next dependency
        setTimeout(() => loadNextDependency(index + 1), 100);
    };

    script.onerror = () => {
        console.log(`❌ Failed to load: ${dependencies[index]}`);
    };

    document.head.appendChild(script);
}

// Start loading dependencies sequentially
loadNextDependency(0);

console.log('Phase 2D dependency loader started...');