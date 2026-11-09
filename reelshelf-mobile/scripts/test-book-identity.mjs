// Checks lib/bookIdentity.ts: every route to a franchise book resolves to one
// diary id, and unverified editions keep their own id.
// Run from reelshelf-mobile/:  node scripts/test-book-identity.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const out = mkdtempSync(join(tmpdir(), 'book-identity-'));
execFileSync('npx', ['tsc', 'lib/bookIdentity.ts', '--outDir', out, '--module', 'commonjs', '--target', 'es2020', '--skipLibCheck'], { stdio: 'inherit' });
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const { canonicalBookRouteId, matchFranchiseEdition, getFranchiseBookForRouteId } = createRequire(import.meta.url)(join(out, 'lib/bookIdentity.js'));

const SUNRISE = 'book-OL43426400W';
const collins = ['Suzanne Collins'];
let n = 0;
const ok = (name, fn) => { fn(); n++; console.log(`ok - ${name}`); };

ok('hub id is already canonical', () => assert.equal(canonicalBookRouteId(SUNRISE), SUNRISE));
ok('retired Open Library id maps to the catalogue work', () => assert.equal(canonicalBookRouteId('book-OL42360848W'), SUNRISE));
ok('any verified Google edition maps to the same id', () => {
  for (const vol of ['ZiDkEAAAQBAJ', 'abc123', 'another-edition']) {
    assert.equal(canonicalBookRouteId(`book-${vol}`, { title: 'Sunrise on the Reaping', authors: collins }), SUNRISE);
  }
});
ok('case, punctuation and series markers do not matter', () => {
  assert.equal(canonicalBookRouteId('book-x', { title: 'SUNRISE ON THE REAPING', authors: ['suzanne collins'] }), SUNRISE);
  assert.equal(canonicalBookRouteId('book-x', { title: 'Catching Fire (Hunger Games, Book Two)', authors: collins }), 'book-OL5735360W');
  assert.equal(canonicalBookRouteId('book-x', { title: 'The Ballad of Songbirds & Snakes', authors: collins }), 'book-OL20716197W');
});
ok('co-authored listing still verifies on Collins', () =>
  assert.equal(canonicalBookRouteId('book-x', { title: 'Mockingjay', authors: ['Suzanne Collins', 'Tim Mcgee'] }), 'book-OL14908941W'));
ok('a lookup that never ran (no hint) leaves Google ids alone', () =>
  assert.equal(canonicalBookRouteId('book-ZiDkEAAAQBAJ'), 'book-ZiDkEAAAQBAJ'));
ok('other authors are left alone', () =>
  assert.equal(matchFranchiseEdition({ title: 'The Hunger Games', authors: ['SuperSummary'] }), null));
ok('missing author is left alone', () =>
  assert.equal(matchFranchiseEdition({ title: 'Sunrise on the Reaping', authors: [] }), null));
ok('study guides and summaries are left alone', () => {
  assert.equal(matchFranchiseEdition({ title: 'Sunrise on the Reaping', subtitle: 'A Study Guide', authors: collins }), null);
  assert.equal(matchFranchiseEdition({ title: 'Summary of Sunrise on the Reaping', authors: collins }), null);
});
ok('box sets and other titles are left alone', () => {
  assert.equal(matchFranchiseEdition({ title: 'The Hunger Games Trilogy', authors: collins }), null);
  assert.equal(matchFranchiseEdition({ title: 'The Hunger Games Collection', authors: collins }), null);
  assert.equal(matchFranchiseEdition({ title: 'Gregor the Overlander', authors: collins }), null);
});
ok('films and TV are never touched', () => {
  assert.equal(canonicalBookRouteId('film-1300968', { title: 'Sunrise on the Reaping', authors: collins }), 'film-1300968');
  assert.equal(canonicalBookRouteId('tv-1'), 'tv-1');
});
ok('community lookup works for canonical and alias ids', () => {
  assert.equal(getFranchiseBookForRouteId(SUNRISE)?.title, 'Sunrise on the Reaping');
  assert.equal(getFranchiseBookForRouteId('book-OL42360848W')?.title, 'Sunrise on the Reaping');
  assert.equal(getFranchiseBookForRouteId('book-ZiDkEAAAQBAJ'), undefined);
});

console.log(`\n${n} passed`);
