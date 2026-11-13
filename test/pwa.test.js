'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const pub = path.join(__dirname, '..', 'public');
const pkg = require('../package.json');
const manifest = JSON.parse(fs.readFileSync(path.join(pub, 'manifest.webmanifest'), 'utf8'));

function pngSize(file) {
  const b = fs.readFileSync(file);
  assert.equal(b.toString('ascii', 1, 4), 'PNG');
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

test('manifest has the fields Chrome needs to offer installation', () => {
  assert.ok(manifest.name && manifest.short_name);
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.ok(manifest.icons.some((i) => i.sizes === '192x192' && i.purpose === 'any'));
  assert.ok(manifest.icons.some((i) => i.sizes === '512x512' && i.purpose === 'any'));
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));
});

test('every manifest icon exists and has the declared size', () => {
  for (const i of manifest.icons) {
    const [w, h] = pngSize(path.join(pub, i.src));
    assert.equal(`${w}x${h}`, i.sizes, i.src);
  }
});

test('service worker: valid, version matches package.json, every shell file exists, never caches /api', () => {
  const src = fs.readFileSync(path.join(pub, 'sw.js'), 'utf8');
  new vm.Script(src);
  assert.equal(src.match(/const VERSION = 'mts-v([^']+)'/)[1], pkg.version);
  const shell = new Function(`${src.match(/const SHELL = (\[[^\]]*\])/)[1].replace(/^/, 'return ')}`)();
  for (const u of shell) {
    const f = u === '/' ? 'index.html' : u.slice(1);
    assert.ok(fs.existsSync(path.join(pub, f)), `missing ${u}`);
  }
  assert.match(src, /pathname\.startsWith\('\/api\/'\)/);
});

test('index.html links the manifest and icons', () => {
  const h = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
  assert.match(h, /rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(h, /rel="apple-touch-icon"/);
});
