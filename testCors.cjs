const https = require('https');

const options = {
    hostname: 'firebasestorage.googleapis.com',
    port: 443,
    path: '/v0/b/proteccioncivil-system.firebasestorage.app/o',
    method: 'OPTIONS',
    headers: {
        'Origin': 'https://proteccioncivil-system.web.app',
        'Access-Control-Request-Method': 'GET'
    }
};

const req = https.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log('HEADERS:', res.headers);
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

req.end();
