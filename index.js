#!/usr/bin/env node
const http = require('http');
const fs = require('fs');
const fetch = require('node-fetch'); // Replaces deprecated 'request'
const zlib = require('zlib');
const path = require('path');

const index = zlib.gzipSync(fs.readFileSync('index.html'));
const favicon = zlib.gzipSync(fs.readFileSync('favicon.ico'));
const crossdomainXML = zlib.gzipSync(fs.readFileSync('crossdomain.xml'));

const port = process.env.PORT || 1337;
const allowedOriginalHeaders = new RegExp('^' + require('./allowedOriginalHeaders.json').join('|'), 'i');
const bannedUrls = new RegExp(require('./bannedUrls.json').join('|'), 'i');

const server = http.createServer(async (req, res) => {
    try {
        switch (req.url) {
            case '/':
            case '/index.html':
                res.writeHead(200, {
                    'Content-Type': 'text/html',
                    'Content-Encoding': 'gzip'
                });
                res.end(index);
                break;

            case '/favicon.ico':
                res.writeHead(200, {
                    'Content-Type': 'image/x-icon',
                    'Content-Encoding': 'gzip'
                });
                res.end(favicon);
                break;

            case '/crossdomain.xml':
                res.writeHead(200, {
                    'Content-Type': 'application/xml',
                    'Content-Encoding': 'gzip'
                });
                res.end(crossdomainXML);
                break;

            default:
                const targetUrl = req.url.slice(1);

                if (bannedUrls.test(targetUrl)) {
                    res.writeHead(403);
                    res.end('FORBIDDEN');
                    return;
                }

                console.log('Proxying:', targetUrl);

                const response = await fetch(targetUrl, {
                    method: 'GET',
                    headers: {
                        'Referer': 'https://epg.pw/',
                        'User-Agent': 'Mozilla/5.0',
                        'Accept-Encoding': 'identity'
                    }
                });

                res.writeHead(response.status, {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Credentials': 'false',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Expires': new Date(Date.now() + 86400000).toUTCString(), // 1 day
                    'Content-Type': response.headers.get('content-type') || 'text/plain'
                });

                response.body.pipe(res);
        }
    } catch (e) {
        console.error('ERROR:', e.stack);
        res.writeHead(500);
        res.end('Error: ' + (e instanceof TypeError ? 'make sure your URL is correct' : String(e)));
    }
});

server.listen(port, () => {
    console.log(`CORS proxy running on port ${port}`);
});
