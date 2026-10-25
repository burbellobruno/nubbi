/* Official Firestore Emulator Suite tests. Refuses non-loopback endpoints and non-demo projects. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || '';
if (!/^(?:127\.0\.0\.1|localhost):\d+$/.test(emulatorHost)) {
  throw new Error('Run only with FIRESTORE_EMULATOR_HOST set to an explicit loopback emulator endpoint.');
}
const projectId = 'demo-nubbi-review';
if (process.env.GCLOUD_PROJECT && process.env.GCLOUD_PROJECT !== projectId) throw new Error('A demo-only project is required.');
const load = process.env.NUBBI_EMULATOR_TOOLS
  ? createRequire(path.join(path.resolve(process.env.NUBBI_EMULATOR_TOOLS), 'package.json')) : require;
const { initializeTestEnvironment, assertSucceeds, assertFails } = load('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc } = load('firebase/firestore');
const [host, port] = emulatorHost.split(':');
const rules = fs.readFileSync(path.join(__dirname, '../firestore.rules'), 'utf8');
let env, passed = 0;
function character(owner = 'owner', likedBy = []) {
  return { ownerUid: owner, ownerName: 'Test Owner', name: 'Nube', desc: '29 años', role: 'Explorer',
    gender: 'Otro', tags: 'test', persona: 'Patient.', greeting: 'Hello.', emoji: '☁', img: '',
    likedBy, status: 'published', createdAt: 1, updatedAt: 1 };
}
function post(likedBy = []) {
  return { authorUid: 'owner', authorName: 'Owner', text: 'Test post', charPubId: '', charName: '',
    charEmoji: '', charImg: '', charDesc: '', likedBy, status: 'published', createdAt: 1 };
}
async function seed(collection, id, value) {
  await env.withSecurityRulesDisabled(async context => setDoc(doc(context.firestore(), collection, id), value));
}
async function test(name, run) { await env.clearFirestore(); await run(); passed++; console.log('PASS:', name); }
(async () => {
  env = await initializeTestEnvironment({ projectId, firestore: { host, port: Number(port), rules } });
  const owner = env.authenticatedContext('owner').firestore();
  const caller = env.authenticatedContext('caller').firestore();
  const stranger = env.authenticatedContext('stranger').firestore();
  const anonymous = env.authenticatedContext('guest', { firebase: { sign_in_provider: 'anonymous' } }).firestore();
  const publicDb = env.unauthenticatedContext().firestore();
  await test('private snapshots are readable/writable only by their own UID', async () => {
    await assertSucceeds(setDoc(doc(owner, 'users', 'owner'), { data: '{}', updated: 1 }));
    await assertSucceeds(getDoc(doc(owner, 'users', 'owner')));
    await assertFails(getDoc(doc(stranger, 'users', 'owner')));
    await assertFails(setDoc(doc(stranger, 'users', 'owner'), { data: 'changed' }));
    await assertFails(getDoc(doc(publicDb, 'users', 'owner')));
  });
  await test('anonymous users retain private guest snapshot ownership', async () => {
    await assertSucceeds(setDoc(doc(anonymous, 'users', 'guest'), { data: '{}' }));
    await assertSucceeds(getDoc(doc(anonymous, 'users', 'guest')));
    await assertFails(getDoc(doc(anonymous, 'users', 'owner')));
  });
  await test('valid community character creation succeeds for a real user', async () => {
    await assertSucceeds(setDoc(doc(owner, 'communityCharacters', 'valid'), character()));
    await assertSucceeds(getDoc(doc(publicDb, 'communityCharacters', 'valid')));
  });
  await test('anonymous and unauthenticated community writes are denied', async () => {
    await assertFails(setDoc(doc(anonymous, 'communityCharacters', 'guest'), character('guest')));
    await assertFails(setDoc(doc(publicDb, 'communityCharacters', 'public'), character()));
    await assertFails(setDoc(doc(anonymous, 'communityPosts', 'guest'), { ...post(), authorUid: 'guest' }));
  });
  await test('malformed and forged-owner character documents are denied', async () => {
    for (const value of [{ name: 'Incomplete' }, { ...character(), unknownField: true },
      { ...character(), ownerUid: 'victim' }, { ...character(), name: '' },
      { ...character(), likedBy: ['caller'] }, { ...character(), createdAt: 'not an integer' }]) {
      await assertFails(setDoc(doc(owner, 'communityCharacters', 'bad'), value));
    }
  });
  await test('caller can add and remove only its own character like', async () => {
    await seed('communityCharacters', 'likes', character('owner', ['other']));
    const ref = doc(caller, 'communityCharacters', 'likes');
    await assertSucceeds(updateDoc(ref, { likedBy: ['other', 'caller'] }));
    await assertSucceeds(updateDoc(ref, { likedBy: ['other'] }));
  });
  await test('adding a victim like while already liked is denied', async () => {
    await seed('communityCharacters', 'likes', character('owner', ['caller']));
    await assertFails(updateDoc(doc(caller, 'communityCharacters', 'likes'), { likedBy: ['caller', 'victim'] }));
  });
  await test('removing a victim like while caller is absent is denied', async () => {
    await seed('communityCharacters', 'likes', character('owner', ['victim']));
    await assertFails(updateDoc(doc(caller, 'communityCharacters', 'likes'), { likedBy: [] }));
  });
  await test('duplicate insertion and historical duplicate-list changes fail closed', async () => {
    await seed('communityCharacters', 'likes', character('owner', ['caller']));
    await assertFails(updateDoc(doc(caller, 'communityCharacters', 'likes'), { likedBy: ['caller', 'caller'] }));
    await seed('communityCharacters', 'legacy', character('owner', ['victim', 'victim']));
    await assertFails(updateDoc(doc(caller, 'communityCharacters', 'legacy'), { likedBy: ['victim', 'victim', 'caller'] }));
  });
  await test('like updates cannot change other character fields or delete the document', async () => {
    await seed('communityCharacters', 'likes', character());
    await assertFails(updateDoc(doc(caller, 'communityCharacters', 'likes'), { likedBy: ['caller'], name: 'Hijacked' }));
    await assertFails(deleteDoc(doc(caller, 'communityCharacters', 'likes')));
  });
  await test('post likes share the same own-UID protections', async () => {
    await seed('communityPosts', 'post', post(['other']));
    const ref = doc(caller, 'communityPosts', 'post');
    await assertSucceeds(updateDoc(ref, { likedBy: ['other', 'caller'] }));
    await assertFails(updateDoc(ref, { likedBy: ['other', 'caller', 'victim'] }));
    await assertSucceeds(updateDoc(ref, { likedBy: ['other'] }));
    await assertFails(updateDoc(ref, { likedBy: [] }));
  });
  await test('draft characters are private to owners and unmatched collections deny access', async () => {
    await seed('communityCharacters', 'draft', { ...character(), status: 'draft' });
    await assertSucceeds(getDoc(doc(owner, 'communityCharacters', 'draft')));
    await assertFails(getDoc(doc(publicDb, 'communityCharacters', 'draft')));
    await assertFails(getDoc(doc(stranger, 'communityCharacters', 'draft')));
    await assertFails(setDoc(doc(owner, 'unknown', 'record'), { data: true }));
  });
  console.log(`Official Firestore Emulator Suite: ${passed} groups passed; demo project ${projectId}; endpoint ${emulatorHost}`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (env) await env.cleanup(); });
