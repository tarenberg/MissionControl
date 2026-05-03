#!/usr/bin/env node
/**
 * proxy.js — Simple HTTP proxy
 * Forwards requests from port 3001 to localhost:3002 (Next.js app)
 */

const http = require('http');
const httpProxy = require('http-proxy');

const proxy = httpProxy.createProxyServer({});

const server = http.createServer((req, res) => {
  proxy.web(req, res, {
    target: 'http://127.0.0.1:3002',
  });
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Proxy] Listening on port ${PORT}, forwarding to localhost:3002`);
});

server.on('error', (err) => {
  console.error('[Proxy] Server error:', err.message);
});

proxy.on('error', (err, req, res) => {
  console.error('[Proxy] Error:', err.message);
  res.writeHead(502, { 'Content-Type': 'text/plain' });
  res.end('Proxy error: ' + err.message);
});
