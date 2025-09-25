// Debug script to add a texture preview plane to the scene
import * as THREE from 'three';

export function addDebugTexturePlane(sceneManager, layerManager) {
    if (!sceneManager || !sceneManager.scene) {
        console.error('No scene manager available');
        return;
    }

    console.log('🔧 Adding debug texture plane to scene...');

    // Create a plane geometry
    const planeGeometry = new THREE.PlaneGeometry(5, 5);

    // Create a material that will use the texture
    const planeMaterial = new THREE.MeshBasicMaterial({
        map: null, // Will be updated with texture
        side: THREE.DoubleSide,
        transparent: true
    });

    // Create the mesh
    const debugPlane = new THREE.Mesh(planeGeometry, planeMaterial);

    // Position the plane to the side of the main model
    debugPlane.position.set(8, 0, 0);
    debugPlane.name = 'debugTexturePlane';

    // Add to scene
    sceneManager.scene.add(debugPlane);

    // Function to update the debug plane texture
    const updateDebugPlaneTexture = () => {
        if (layerManager && layerManager.texture) {
            planeMaterial.map = layerManager.texture;
            planeMaterial.needsUpdate = true;
            console.log('🎨 Debug plane texture updated');
        }
    };

    // Update texture initially
    updateDebugPlaneTexture();

    // Store update function for external use
    window.updateDebugPlaneTexture = updateDebugPlaneTexture;

    console.log('✅ Debug texture plane added to scene at position (8, 0, 0)');
    return debugPlane;
}

// Remove debug plane
export function removeDebugTexturePlane(sceneManager) {
    if (sceneManager && sceneManager.scene) {
        const debugPlane = sceneManager.scene.getObjectByName('debugTexturePlane');
        if (debugPlane) {
            sceneManager.scene.remove(debugPlane);
            console.log('🗑️ Debug texture plane removed');
        }
    }
}