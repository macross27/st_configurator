// Memory Management Testing Script
// Run this in the browser console to test the new memory management features

console.log('🧠 Testing Memory Management System');

// Test 1: Basic Memory Stats
console.log('\n=== Test 1: Basic Memory Stats ===');
if (window.sceneManager) {
    const memStats = window.sceneManager.getMemoryStats();
    console.log('Memory Statistics:', memStats);
    
    const utilization = window.sceneManager.getMemoryUtilization();
    console.log('Memory Utilization:', utilization);
} else {
    console.error('SceneManager not found. Make sure the application is loaded.');
}

// Test 2: Cache Stats
console.log('\n=== Test 2: Cache Statistics ===');
if (window.sceneManager) {
    const cacheStats = window.sceneManager.getCacheStats();
    console.log('Cache Statistics:', cacheStats);
} else {
    console.error('SceneManager not found.');
}

// Test 3: Memory Optimization
console.log('\n=== Test 3: Memory Optimization ===');
async function testOptimization() {
    if (window.sceneManager) {
        try {
            console.log('Running memory optimization...');
            const result = await window.sceneManager.optimizeMemory();
            console.log('Optimization result:', result);
        } catch (error) {
            console.error('Optimization failed:', error);
        }
    }
}

// Test 4: Configuration Check
console.log('\n=== Test 4: Configuration Check ===');
if (window.sceneManager) {
    const autoMemMgmt = window.sceneManager.isAutoMemoryManagementEnabled();
    console.log('Auto Memory Management Enabled:', autoMemMgmt);
    
    // Test toggling auto memory management
    console.log('Testing toggle...');
    window.sceneManager.setAutoMemoryManagement(!autoMemMgmt);
    const newState = window.sceneManager.isAutoMemoryManagementEnabled();
    console.log('New Auto Memory Management State:', newState);
    
    // Restore original state
    window.sceneManager.setAutoMemoryManagement(autoMemMgmt);
}

// Test 5: Memory Report
console.log('\n=== Test 5: Comprehensive Memory Report ===');
if (window.sceneManager) {
    window.sceneManager.logMemoryReport();
}

// Helper function to simulate memory load (for testing)
window.testMemoryLoad = async function(numModels = 5) {
    console.log(`\n🧪 Testing memory load with ${numModels} models...`);
    
    if (!window.sceneManager) {
        console.error('SceneManager not available');
        return;
    }
    
    const testModels = [
        './assets/model.gltf',
        './assets/test-model-1.glb', 
        './assets/test-model-2.glb',
        './assets/test-model-3.glb',
        './assets/test-model-4.glb'
    ];
    
    const startStats = window.sceneManager.getMemoryStats();
    console.log('Starting memory:', startStats.currentMemoryMB.toFixed(1) + 'MB');
    
    for (let i = 0; i < Math.min(numModels, testModels.length); i++) {
        try {
            console.log(`Loading model ${i + 1}/${numModels}: ${testModels[i]}`);
            await window.sceneManager.switchToModel(testModels[i]);
            
            const currentStats = window.sceneManager.getMemoryStats();
            console.log(`After model ${i + 1}: ${currentStats.currentMemoryMB.toFixed(1)}MB (${currentStats.memoryUtilization.toFixed(1)}%)`);
            
            // Small delay to see progression
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.warn(`Failed to load model ${testModels[i]}:`, error.message);
        }
    }
    
    const endStats = window.sceneManager.getMemoryStats();
    console.log('\n📊 Final memory stats:');
    console.log('Total Memory:', endStats.currentMemoryMB.toFixed(1) + 'MB');
    console.log('Utilization:', endStats.memoryUtilization.toFixed(1) + '%');
    console.log('Cached Models:', endStats.cachedModels + '/' + endStats.maxCachedModels);
};

// Helper function to test emergency cleanup
window.testEmergencyCleanup = async function() {
    console.log('\n🚨 Testing Emergency Cleanup...');
    
    if (!window.sceneManager) {
        console.error('SceneManager not available');
        return;
    }
    
    const beforeStats = window.sceneManager.getMemoryStats();
    console.log('Before cleanup:', {
        memory: beforeStats.currentMemoryMB.toFixed(1) + 'MB',
        utilization: beforeStats.memoryUtilization.toFixed(1) + '%',
        models: beforeStats.cachedModels
    });
    
    try {
        const result = await window.sceneManager.emergencyCleanup();
        console.log('Emergency cleanup result:', result);
        
        const afterStats = window.sceneManager.getMemoryStats();
        console.log('After cleanup:', {
            memory: afterStats.currentMemoryMB.toFixed(1) + 'MB',
            utilization: afterStats.memoryUtilization.toFixed(1) + '%',
            models: afterStats.cachedModels
        });
        
        const memoryFreed = beforeStats.currentMemoryMB - afterStats.currentMemoryMB;
        const modelsEvicted = beforeStats.cachedModels - afterStats.cachedModels;
        
        console.log('📉 Cleanup Results:');
        console.log(`Memory freed: ${memoryFreed.toFixed(1)}MB`);
        console.log(`Models evicted: ${modelsEvicted}`);
        
    } catch (error) {
        console.error('Emergency cleanup failed:', error);
    }
};

// Run basic tests
if (typeof window !== 'undefined' && window.sceneManager) {
    testOptimization();
} else {
    console.log('💡 To run full tests, execute these in browser console:');
    console.log('   testMemoryLoad(5)    - Load 5 models and monitor memory');
    console.log('   testEmergencyCleanup() - Test emergency memory cleanup');
}

console.log('\n✅ Memory Management Test Script Loaded');
console.log('Open browser console and run this script to test the new memory management features.');