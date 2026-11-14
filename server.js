const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'www.arcmarumo.com');
const SANITY_DIR = path.join(__dirname, 'cdn.sanity.io');

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.txt': 'text/plain; charset=utf-8',
    '.rsc': 'text/x-component; charset=utf-8'
};

const server = http.createServer((req, res) => {
    // Enable CORS across all endpoints for Three.js textures & cross-origin loads
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = url.parse(req.url, true);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // 1. Handle analytics and telemetry endpoints
    if (pathname.startsWith('/aafe13344bef70fc') || pathname.startsWith('/5d18c82ce29be22e')) {
        if (pathname.endsWith('.js')) {
            res.writeHead(200, {
                'Content-Type': 'application/javascript; charset=utf-8',
                'Cache-Control': 'no-cache'
            });
            res.end('// Analytics telemetry stub\nwindow.va=window.va||function(){};');
            return;
        }
        res.writeHead(204);
        res.end();
        return;
    }

    // 2. Next.js image optimization endpoint: /_next/image?url=...
    if (pathname === '/_next/image') {
        const imageUrl = parsedUrl.query.url;
        if (!imageUrl) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing url query parameter');
            return;
        }

        // Check if local file exists
        if (imageUrl.startsWith('/')) {
            const localPath = path.join(PUBLIC_DIR, imageUrl);
            if (fs.existsSync(localPath)) {
                const ext = path.extname(localPath).toLowerCase();
                res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'image/webp' });
                fs.createReadStream(localPath).pipe(res);
                return;
            }
        }

        // If local sanity file exists
        if (imageUrl.includes('cdn.sanity.io')) {
            const parsedImage = url.parse(imageUrl);
            const localSanity = path.join(__dirname, parsedImage.hostname, parsedImage.pathname);
            if (fs.existsSync(localSanity)) {
                const ext = path.extname(localSanity).toLowerCase();
                res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'image/webp' });
                fs.createReadStream(localSanity).pipe(res);
                return;
            }
        }

        // Redirect to remote image (Unsplash or external)
        res.writeHead(302, { Location: imageUrl });
        res.end();
        return;
    }

    // 3. Handle Sanity CDN paths served locally with CORS
    if (pathname.startsWith('/images/ngr7c3v4')) {
        const localSanity = path.join(SANITY_DIR, pathname);
        if (fs.existsSync(localSanity)) {
            const ext = path.extname(localSanity).toLowerCase();
            res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'image/webp' });
            fs.createReadStream(localSanity).pipe(res);
            return;
        }
    }

    // 4. Handle RSC / Next.js data requests
    const isRsc = req.headers['rsc'] === '1' || parsedUrl.query._rsc !== undefined;
    const isPrefetch = req.headers['next-router-prefetch'] === '1' ||
                       req.headers['purpose'] === 'prefetch' ||
                       (parsedUrl.query && parsedUrl.query.prefetch !== undefined);

    if (isRsc) {
        const rscHeaders = {
            'Content-Type': 'text/x-component; charset=utf-8',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Vary': 'RSC, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url'
        };
        if (pathname === '/' || pathname === '/index.html') {
            const rscFile = path.join(PUBLIC_DIR, 'index-06546ca0c1ce.html');
            if (fs.existsSync(rscFile)) {
                res.writeHead(200, rscHeaders);
                fs.createReadStream(rscFile).pipe(res);
                return;
            }
        } else if (pathname === '/profile') {
            const rscFile = isPrefetch
                ? path.join(PUBLIC_DIR, 'profile.html')
                : path.join(PUBLIC_DIR, 'profile.rsc');
            if (fs.existsSync(rscFile)) {
                res.writeHead(200, rscHeaders);
                fs.createReadStream(rscFile).pipe(res);
                return;
            }
        } else if (pathname === '/news-watch') {
            const rscFile = isPrefetch
                ? path.join(PUBLIC_DIR, 'news-watch.html')
                : path.join(PUBLIC_DIR, 'news-watch.rsc');
            if (fs.existsSync(rscFile)) {
                res.writeHead(200, rscHeaders);
                fs.createReadStream(rscFile).pipe(res);
                return;
            }
        } else if (pathname.startsWith('/work/')) {
            const slug = pathname.replace('/work/', '').replace(/\/$/, '');
            const rscFile = isPrefetch
                ? path.join(PUBLIC_DIR, 'work', `${slug}.html`)
                : path.join(PUBLIC_DIR, 'work', `${slug}.rsc`);
            if (fs.existsSync(rscFile)) {
                res.writeHead(200, rscHeaders);
                fs.createReadStream(rscFile).pipe(res);
                return;
            }
        }
    }

    // 5. Handle routing for page transitions / direct browser access (non-RSC HTML loads)
    if (pathname === '/' || pathname === '') {
        pathname = '/index.html';
    } else if (pathname === '/profile') {
        const htmlPath = path.join(PUBLIC_DIR, 'profile/index.html');
        if (fs.existsSync(htmlPath)) {
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            fs.createReadStream(htmlPath).pipe(res);
            return;
        }
    } else if (pathname === '/news-watch') {
        const htmlPath = path.join(PUBLIC_DIR, 'news-watch/index.html');
        if (fs.existsSync(htmlPath)) {
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            fs.createReadStream(htmlPath).pipe(res);
            return;
        }
    } else if (pathname.startsWith('/work/')) {
        const slug = pathname.replace('/work/', '').replace(/\/$/, '');
        const htmlPath = path.join(PUBLIC_DIR, 'work', slug, 'index.html');
        if (fs.existsSync(htmlPath)) {
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            });
            fs.createReadStream(htmlPath).pipe(res);
            return;
        }
    }

    // 6. Serve static files from PUBLIC_DIR
    let filePath = path.join(PUBLIC_DIR, pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(PUBLIC_DIR) && !filePath.startsWith(SANITY_DIR)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            if (fs.existsSync(filePath + '.html')) {
                filePath = filePath + '.html';
            } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
                filePath = path.join(filePath, 'index.html');
            } else {
                const fallback = path.join(PUBLIC_DIR, 'index.html');
                if (fs.existsSync(fallback)) {
                    res.writeHead(200, {
                        'Content-Type': 'text/html; charset=utf-8',
                        'Cache-Control': 'no-cache, no-store, must-revalidate'
                    });
                    fs.createReadStream(fallback).pipe(res);
                    return;
                }
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
                return;
            }
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        fs.createReadStream(filePath).pipe(res);
    });
});

if (require.main === module) {
    server.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}/`);
    });
}

module.exports = server;
