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
// Real Google Books listings seen through books-search on 2026-11-10.
ok('real editions with edition wording verify', () => {
  for (const title of [
    'Sunrise on the Reaping (a Hunger Games Novel)', 'Sunrise on the Reaping (eBook)',
    'Sunrise on the Reaping (The Hunger Games)', 'Sunrise on the Reaping Movie Tie-In',
    'Sunrise on the Reaping (a Hunger Games Novel): Movie Tie-In Edition', 'Sunrise on the Reaping (Deluxe Edition)',
    "Sunrise on the Reaping: Collector's Edition (a Hunger Games Novel)", 'Sunrise on the Reaping (svensk utgåva)',
  ]) assert.equal(canonicalBookRouteId('book-x', { title, authors: collins }), SUNRISE, title);
  assert.equal(canonicalBookRouteId('book-x', { title: 'Sunrise on the Reaping', subtitle: 'A Hunger Games Novel', authors: collins }), SUNRISE);
  assert.equal(canonicalBookRouteId('book-x', { title: 'Mockingjay (Large Print)', authors: collins }), 'book-OL14908941W');
  assert.equal(canonicalBookRouteId('book-x', { title: 'Hunger games', authors: collins }), 'book-OL5735363W');
  assert.equal(canonicalBookRouteId('book-x', { title: 'Ballad of Songbirds and Snakes', authors: collins }), 'book-OL20716197W');
  assert.equal(canonicalBookRouteId('book-x', { title: 'BALLAD OF SONGBIRDS AND SNAKES', subtitle: 'A Hunger Games Novel', authors: ['SUZANNE. COLLINS'] }), 'book-OL20716197W');
});
ok('real non-novels by Collins stay unverified', () => {
  for (const [title, subtitle] of [
    ['Catching Fire', 'Teaching Unit'], ['The Hunger Games Complete Trilogy'], ['The Hunger Games Movie'],
    ['The Hunger Games Official Illustrated Movie Companion'], ['The World of the Hunger Games'],
    ['The Hunger Games 4 Book eBook Box Set'], ['Mockingjay - Classic De-specced Special Sales Exclusive'],
    ['Sinsajo / Mockingjay'], ['The Hunger Games / druk 1', 'Film editie'],
  ]) assert.equal(matchFranchiseEdition({ title, subtitle, authors: collins }), null, title);
});
ok('lookalike titles by other authors stay unverified', () => {
  assert.equal(matchFranchiseEdition({ title: 'Sunrise on the Reaping', subtitle: 'Hunger Game', authors: ['J. PEACE'] }), null);
  assert.equal(matchFranchiseEdition({ title: 'Catching Fire', authors: ['Kay Nolte Smith'] }), null);
  assert.equal(matchFranchiseEdition({ title: 'Hunger Games: Sunrise on the Reaping Unisex T-Shirt Large', authors: ['Out of Print'] }), null);
});
ok('build-21 built-in entries resolve to the stable ids', () => {
  assert.equal(canonicalBookRouteId('book-local-the-hunger-games'), 'book-OL5735363W');
  assert.equal(canonicalBookRouteId('book-local-mockingjay'), 'book-OL14908941W');
  assert.equal(canonicalBookRouteId('book-local-catching-fire', { title: 'Catching Fire', authors: collins }), 'book-OL5735360W');
  assert.equal(canonicalBookRouteId('book-local-the-ballad-of-songbirds-and-snakes', { title: 'The Ballad of Songbirds and Snakes', authors: collins }), 'book-OL20716197W');
  // Other built-in books keep their own ids.
  assert.equal(canonicalBookRouteId('book-local-circe', { title: 'Circe', authors: ['Madeline Miller'] }), 'book-local-circe');
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
