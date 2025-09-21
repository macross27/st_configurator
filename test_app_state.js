const fs = require('fs');
const http = require('http');

// Test if the main HTML loads correctly
function testHTMLLoad() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3026', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('✅ HTML loads successfully');
                console.log('HTML length:', data.length);

                // Check for key elements
                if (data.includes('id="order-btn"')) {
                    console.log('✅ Order form button found in HTML');
                } else {
                    console.log('❌ Order form button NOT found in HTML');
                }

                if (data.includes('id="submit-btn"')) {
                    console.log('✅ Submit order button found in HTML');
                } else {
                    console.log('❌ Submit order button NOT found in HTML');
                }

                if (data.includes('canvas')) {
                    console.log('✅ Canvas element found for 3D rendering');
                } else {
                    console.log('❌ Canvas element NOT found');
                }

                resolve(data);
            });
        });

        req.on('error', (err) => {
            console.log('❌ Failed to load HTML:', err.message);
            reject(err);
        });
    });
}

// Test if main.js loads
function testJavaScriptLoad() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3026/main.js', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log('✅ main.js loads successfully');
                console.log('JavaScript length:', data.length);

                // Check for key imports
                if (data.includes('OrderFormManager')) {
                    console.log('✅ OrderFormManager import found');
                } else {
                    console.log('❌ OrderFormManager import NOT found');
                }

                if (data.includes('Three.js')) {
                    console.log('✅ Three.js import found');
                } else {
                    console.log('❌ Three.js import NOT found');
                }

                resolve(data);
            });
        });

        req.on('error', (err) => {
            console.log('❌ Failed to load main.js:', err.message);
            reject(err);
        });
    });
}

// Test API endpoints
function testAPIEndpoint(path, description) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:3026${path}`, (res) => {
            console.log(`✅ ${description} - Status: ${res.statusCode}`);
            resolve(res.statusCode);
        });

        req.on('error', (err) => {
            console.log(`❌ ${description} - Error: ${err.message}`);
            resolve(null);
        });

        req.setTimeout(5000, () => {
            console.log(`❌ ${description} - Timeout`);
            resolve(null);
        });
    });
}

async function runTests() {
    console.log('🔍 Testing Application State...\n');

    try {
        await testHTMLLoad();
        console.log();

        await testJavaScriptLoad();
        console.log();

        console.log('🔗 Testing API Endpoints:');
        await testAPIEndpoint('/api/config', 'Config API');
        await testAPIEndpoint('/api/sessions', 'Sessions API');
        await testAPIEndpoint('/api/upload', 'Upload API');
        await testAPIEndpoint('/order-form-handler', 'Order Form Handler');

    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
}

runTests();