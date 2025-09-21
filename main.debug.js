// Debug version to identify the exact issue
console.log('🔍 DEBUG: Starting application...');

// Import Three.js the same way as main.js
import * as THREE from 'three';
console.log('✅ Three.js loaded:', !!THREE);
console.log('✅ Three.js version:', THREE.REVISION);

// Make it globally available for debugging
window.THREE = THREE;

// Test if DOM is ready
console.log('🔍 DOM readyState:', document.readyState);

function runDebugTests() {
    console.log('✅ DOM loaded');

    // Test if container exists
    const container = document.getElementById('three-container');
    console.log('✅ Container found:', !!container);

    if (container) {
        console.log('✅ Container element:', container);
        console.log('✅ Container offsetWidth:', container.offsetWidth);
        console.log('✅ Container offsetHeight:', container.offsetHeight);
        console.log('✅ Container clientWidth:', container.clientWidth);
        console.log('✅ Container clientHeight:', container.clientHeight);
        console.log('✅ Container computed style:', window.getComputedStyle(container));

        // Check if container has zero dimensions
        if (container.clientWidth === 0 || container.clientHeight === 0) {
            console.error('❌ Container has zero dimensions!');
            console.log('🔍 Container parent:', container.parentElement);
            console.log('🔍 Container CSS display:', window.getComputedStyle(container).display);
            console.log('🔍 Container CSS width:', window.getComputedStyle(container).width);
            console.log('🔍 Container CSS height:', window.getComputedStyle(container).height);
        }
    } else {
        console.error('❌ Container not found in DOM');
        console.log('🔍 Available elements with IDs:',
            Array.from(document.querySelectorAll('[id]')).map(el => el.id));
    }

    // Test basic Three.js setup
    if (container && container.clientWidth > 0 && container.clientHeight > 0) {
        try {
            console.log('🔍 Attempting Three.js setup...');

            const scene = new THREE.Scene();
            console.log('✅ Scene created');

            const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
            console.log('✅ Camera created');

            const renderer = new THREE.WebGLRenderer();
            console.log('✅ WebGL Renderer created');

            renderer.setSize(container.clientWidth, container.clientHeight);
            console.log('✅ Renderer size set');

            container.appendChild(renderer.domElement);
            console.log('✅ Canvas appended to container');

            // Add a simple cube to test rendering
            const geometry = new THREE.BoxGeometry();
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
            const cube = new THREE.Mesh(geometry, material);
            scene.add(cube);
            console.log('✅ Test cube added to scene');

            camera.position.z = 5;

            // Render once
            renderer.render(scene, camera);
            console.log('✅ Basic Three.js rendering completed successfully!');

            // Add a simple animation loop to test continuous rendering
            function animate() {
                requestAnimationFrame(animate);
                cube.rotation.x += 0.01;
                cube.rotation.y += 0.01;
                renderer.render(scene, camera);
            }
            animate();
            console.log('✅ Animation loop started');

        } catch (error) {
            console.error('❌ Three.js setup failed:', error);
            console.error('❌ Error stack:', error.stack);
        }
    } else {
        console.error('❌ Cannot proceed with Three.js setup - container issues');
    }
}

// Check if DOM is already loaded
if (document.readyState === 'loading') {
    console.log('🔍 Waiting for DOM to load...');
    document.addEventListener('DOMContentLoaded', runDebugTests);
} else {
    console.log('🔍 DOM already loaded, running tests immediately');
    runDebugTests();
}