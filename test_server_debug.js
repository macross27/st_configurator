const http = require('http');
const fs = require('fs');

function makeRequest(method, path, data, headers = {}) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3030,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: parsed });
                } catch (err) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', (err) => {
            reject(err);
        });

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testServerDebug() {
    console.log('🚀 Testing server file reception...');

    try {
        // First, create a session
        console.log('📱 Creating session...');
        const sessionResponse = await makeRequest('POST', '/api/sessions', {
            modelUrl: '/models/hat.glb'
        });

        const sessionId = sessionResponse.data.sessionId;
        console.log(`✅ Session created: ${sessionId}`);

        // Now, add a text layer (which generates an image file)
        console.log('📝 Adding text layer...');

        const layerData = {
            type: 'text',
            text: 'Server Debug',
            color: '#000000',
            position: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            rotation: { x: 0, y: 0, z: 0 }
        };

        const layerResponse = await makeRequest('POST', `/api/sessions/${sessionId}/layers`, {
            layerData: layerData
        });

        console.log('✅ Text layer added successfully');
        console.log('📊 Response:', layerResponse.data);

        // Wait a moment for server processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Now submit an order to trigger more server logging
        console.log('📤 Submitting order...');

        const orderData = {
            customerInfo: {
                name: 'Test User',
                email: 'test@example.com',
                phone: '555-1234',
                notes: 'Server debug test order'
            },
            sessionId: sessionId
        };

        const orderResponse = await makeRequest('POST', '/api/orders', orderData);
        console.log('✅ Order submitted successfully');
        console.log('📊 Order response:', orderResponse.data);

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testServerDebug();