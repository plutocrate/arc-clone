const server = require('./server.js');
const assert = require('assert');
const { testFlightParse } = require('./flight_validator.js');

const TEST_PORT = 3999;

server.listen(TEST_PORT, async () => {
    console.log(`Running comprehensive test suite on port ${TEST_PORT}...`);
    try {
        const routes = [
            '/',
            '/profile',
            '/news-watch',
            '/work/remyshoots',
            '/work/depthfirst',
            '/work/makereign-academy',
            '/work/refresh',
            '/work/scza',
            '/work/rumor',
            '/work/pollen'
        ];

        console.log('\n1. Testing HTML Page Loads & Client Flight Streams:');
        for (const r of routes) {
            const res = await fetch(`http://localhost:${TEST_PORT}${r}`);
            assert.strictEqual(res.status, 200, `Failed HTML load for ${r}: ${res.status}`);
            const ct = res.headers.get('content-type');
            assert(ct && ct.includes('text/html'), `Expected text/html for ${r}, got ${ct}`);
            
            const html = await res.text();
            const pushes = Array.from(html.matchAll(/self\.__next_f\.push\(\[1,\s*\"(.*?)\"\]\)/gs));
            let combined = '';
            for (const m of pushes) {
                combined += JSON.parse('"' + m[1] + '"');
            }
            if (combined.length > 0) {
                testFlightParse(`HTML-Push:${r}`, Buffer.from(combined));
            }
            console.log(`  ✓ HTML ${r} (200 OK & Validated Hydration Stream)`);
        }

        console.log('\n2. Testing RSC Prefetch & Navigation Flight Streams:');
        for (const r of routes) {
            // Prefetch
            const pf = await fetch(`http://localhost:${TEST_PORT}${r}`, {
                headers: { RSC: '1', 'next-router-prefetch': '1' }
            });
            assert.strictEqual(pf.status, 200, `Failed RSC prefetch for ${r}`);
            assert(pf.headers.get('content-type').includes('text/x-component'));
            const pfBuf = Buffer.from(await pf.arrayBuffer());
            testFlightParse(`Prefetch:${r}`, pfBuf);
            
            // Dynamic navigation
            const nav = await fetch(`http://localhost:${TEST_PORT}${r}`, {
                headers: { RSC: '1' }
            });
            assert.strictEqual(nav.status, 200, `Failed RSC nav for ${r}`);
            assert(nav.headers.get('content-type').includes('text/x-component'));
            const navBuf = Buffer.from(await nav.arrayBuffer());
            testFlightParse(`Nav:${r}`, navBuf);

            console.log(`  ✓ RSC ${r} (Prefetch & Navigation 200 OK & Flight Parsed)`);
        }

        console.log('\n3. Testing Media & Telemetry Endpoints:');
        const assets = [
            { url: '/media/remyshoots.jpg', status: 200, ct: 'image/jpeg' },
            { url: '/media/depthfirst.jpg', status: 200, ct: 'image/jpeg' },
            { url: '/media/makereign-academy.jpg', status: 200, ct: 'image/jpeg' },
            { url: '/media/refresh.jpg', status: 200, ct: 'image/jpeg' },
            { url: '/media/scza.jpg', status: 200, ct: 'image/jpeg' },
            { url: '/media/rumor.jpg', status: 200, ct: 'image/jpeg' },
            { url: '/media/pollen.jpg', status: 200, ct: 'image/jpeg' },
            { url: '/brand/tv-glass-1280.webp', status: 200, ct: 'image/webp' },
            { url: '/brand/tv-glass-960.webp', status: 200, ct: 'image/webp' },
            { url: '/brand/tv-glass.webp', status: 200, ct: 'image/webp' },
            { url: '/brand/arc-bands.svg', status: 200, ct: 'image/svg+xml' },
            { url: '/brand/arrow-next.svg', status: 200, ct: 'image/svg+xml' },
            { url: '/about/cover-arc-mark.svg', status: 200, ct: 'image/svg+xml' },
            { url: '/about/portrait.webp', status: 200, ct: 'image/webp' },
            { url: '/favicon.ico', status: 200, ct: 'image/x-icon' },
            { url: '/icon1.png', status: 200, ct: 'image/png' },
            { url: '/apple-icon.png', status: 200, ct: 'image/png' },
            { url: '/aafe13344bef70fc/view', status: 204 },
            { url: '/5d18c82ce29be22e/vitals', status: 204 },
            { url: '/aafe13344bef70fc/script.js', status: 200, ct: 'application/javascript' }
        ];

        for (const a of assets) {
            const res = await fetch(`http://localhost:${TEST_PORT}${a.url}`);
            assert.strictEqual(res.status, a.status, `Asset status mismatch for ${a.url}`);
            if (a.ct) {
                const ct = res.headers.get('content-type');
                assert(ct && ct.includes(a.ct), `Content-Type mismatch for ${a.url}`);
            }
            console.log(`  ✓ Asset ${a.url} (${res.status})`);
        }

        console.log('\nAll pages, routes, RSC streams, and assets passed successfully! 🎉');
    } catch (err) {
        console.error('Test failed:', err);
        process.exit(1);
    } finally {
        server.close();
    }
});
