// Fail closed when the experimental manifest stops representing this app.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
const root = read('package.json');
const web = read('web/package.json');
const candidateRoot = read('scripts/cloudflare-probe-lock/package.json');
const candidateWeb = read('scripts/cloudflare-probe-lock/web-package.json');
assert.deepEqual(candidateRoot.overrides, { '@opennextjs/cloudflare': { glob: '14.0.6' } });
delete candidateRoot.overrides;
assert.deepEqual(candidateRoot, root, 'root manifest differs beyond the reviewed probe override');
assert.equal(web.dependencies.next, '16.4.2', 'revisit the experimental Next version when the app changes');
assert.equal(candidateWeb.dependencies.next, '16.4.5');
assert.equal(candidateWeb.devDependencies['@opennextjs/cloudflare'], '1.20.17');
assert.equal(candidateWeb.devDependencies.wrangler, '4.162.0');
candidateWeb.dependencies.next = web.dependencies.next;
delete candidateWeb.devDependencies['@opennextjs/cloudflare'];
delete candidateWeb.devDependencies.wrangler;
assert.deepEqual(candidateWeb, web, 'web manifest differs beyond reviewed probe dependencies');
console.log('Probe manifests match the application, apart from the documented experimental versions and override.');
