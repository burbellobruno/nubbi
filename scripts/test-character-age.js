/* Regression coverage for the shared character age contract. No network or credentials. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ctx = { TextDecoder, Uint8Array };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/ai-client.js'), 'utf8'), ctx);
const character = {
  name: 'Nube', desc: 'Exploradora, 29 años', role: 'exploradora',
  persona: 'Paciente y curiosa.', greeting: '*Sonríe* Hola.',
  imagePrompt: 'Portrait of an explorer, 29 years old', emoji: '☁', gender: 'Otro',
};
let passed = 0;
const failures = [];
async function test(name, run) {
  try { await run(); passed++; }
  catch (error) { failures.push({ name, error }); }
}
function valid(fields) {
  assert.equal(ctx.NubbiValidateCharacter(JSON.stringify({ ...character, ...fields })).name, 'Nube');
}
function invalid(fields) {
  assert.throws(() => ctx.NubbiValidateCharacter(JSON.stringify({ ...character, ...fields })), error => {
    assert.equal(error.code, 'INVALID_AGE');
    assert.equal(error.retryable, false);
    return true;
  });
}
function manual(fields) {
  return ctx.NubbiCharacterAgeIssue({ desc: character.desc, persona: character.persona, greeting: character.greeting, ...fields });
}
function manualInvalid(fields) {
  const issue = manual(fields);
  assert.ok(issue, 'manual save must report an age issue');
  assert.equal(issue.code, 'INVALID_AGE');
}

function communityHarness(custom = []) {
  const source = fs.readFileSync(path.join(__dirname, '../public/community.js'), 'utf8');
  const events = { saved: 0, opened: [], alerts: [], external: 0 };
  const elements = {
    pubsheet: { open: false }, pubdlg: { open: false },
    pubchar: { value: 'local' }, pubname: { value: 'Nube' },
    pubadult: { checked: true }, pubterms: { checked: true },
    pubdesc: { value: 'Exploradora, 18 años' },
    pubpersona: { value: 'Paciente.' }, pubgreet: { value: 'Hola.' },
    pubsend: { disabled: false, textContent: 'Publicar' },
  };
  function unexpectedExternal() {
    events.external++;
    throw new Error('External community access must not occur in an invalid-age test');
  }
  const context = {
    st: { custom },
    window: {
      NubbiCharacterAgeIssue: ctx.NubbiCharacterAgeIssue,
      NubbiApp: { openChat(id) { events.opened.push(id); } },
    },
    save() { events.saved++; },
    alert(message) { events.alerts.push(message); },
    confirm() { return false; },
    $(id) { return elements[id]; },
    findCustom(id) { return context.st.custom.find(item => item.id === id); },
    upsertCreator: unexpectedExternal,
    imageWithCap: unexpectedExternal,
    db: { collection: unexpectedExternal },
    friendlyFirestore(error) { return error.message; },
  };
  vm.createContext(context);
  vm.runInContext(source.slice(source.indexOf('function importPub(pub)'), source.indexOf('function publish(id)')), context);
  vm.runInContext(source.slice(source.indexOf('async function publishCurrent()'), source.indexOf('async function unpublish(pub)')), context);
  return { context, events, elements };
}

(async () => {
  await test('18 is the inclusive minimum across description and portrait', () => {
    valid({ desc: 'Exploradora, 18 años', imagePrompt: 'A person, 18 years old' });
    assert.equal(manual({ desc: 'Exploradora, 18 años' }), null);
  });
  await test('18 through 20 are valid adults and 17 is rejected', () => { for(const age of [18,19,20]) { valid({desc:'Exploradora, '+age+' años',imagePrompt:'A person, '+age+' years old'}); assert.equal(manual({desc:age+' años'}),null); } invalid({desc:'17 años'}); });
  await test('unchanged valid character remains valid and input is not mutated', () => {
    const original = JSON.stringify(character);
    valid({});
    assert.equal(JSON.stringify(character), original);
  });
  await test('explicit age extraction handles Unicode apostrophes and hyphens', () => {
    assert.deepEqual(Array.from(ctx.NubbiExtractAges('A 29‑year‑old explorer')), [29]);
    assert.deepEqual(Array.from(ctx.NubbiExtractSelfAges('I’m 17 years old.')), [17]);
    valid({ imagePrompt: 'A 29‑year‑old explorer' });
  });
  await test('zero is an explicit invalid age instead of disappearing', () => {
    assert.deepEqual(Array.from(ctx.NubbiExtractAges('0 años')), [0]);
    invalid({ desc: '0 años' });
    manualInvalid({ desc: '0 años' });
  });
  await test('missing description ages reject AI and manual creation', () => {
    for (const desc of ['', 'Exploradora sin edad', 'Nació en 1998, mide 175 cm']) {
      manualInvalid({ desc });
      // Empty required fields can fail format validation first; age-free nonempty fields cannot.
      if (desc) invalid({ desc });
    }
  });
  await test('image age is required for generated characters but not manual characters', () => {
    invalid({ imagePrompt: 'Portrait of an explorer' });
    assert.equal(manual({}), null);
  });
  await test('ages under 18 reject across every character field', () => {
    invalid({ desc: 'Exploradora, 17 años' });
    invalid({ imagePrompt: 'A person, 17 years old' });
    invalid({ persona: 'Tengo 17 años.' });
    invalid({ greeting: 'Hola, tengo 20 años.' });
    invalid({ persona: 'I’m 17 years old.' });
    manualInvalid({ desc: '17 años' });
    manualInvalid({ persona: 'I’m 17 years old.' });
    manualInvalid({ greeting: 'Tengo 17 años.' });
  });
  await test('adult age contradictions reject rather than silently changing the age', () => {
    invalid({ imagePrompt: 'A person, 70 years old' });
    invalid({ persona: 'Tengo 30 años.' });
    invalid({ greeting: 'Hola, tengo 30 años.' });
    invalid({ desc: '29 años y 30 años' });
    manualInvalid({ persona: 'Tengo 30 años.' });
    manualInvalid({ imagePrompt: 'A person, 30 years old' });
  });
  await test('matching explicit ages in all fields remain valid', () => {
    valid({ persona: 'Tengo 29 años.', greeting: 'Hola, tengo 29 años.' });
    assert.equal(manual({ persona: 'Tengo 29 años.', greeting: 'Hola, tengo 29 años.' }), null);
  });
  await test('a second underage mention in an image prompt is rejected', () => {
    invalid({ imagePrompt: 'Portrait, 29 years old, 12 years old' });
    manualInvalid({ imagePrompt: 'Portrait, 29 years old, 12 years old' });
  });
  await test('fantasy characters older than 120 remain compatible', () => {
    valid({ desc: 'Vampiro, 300 años', imagePrompt: 'A 300-year-old vampire' });
    assert.equal(manual({ desc: 'Vampiro, 300 años' }), null);
    assert.deepEqual(Array.from(ctx.NubbiExtractAges('300 años')), [300]);
  });
  await test('historical ages and durations do not contradict a current explicit age', () => {
    assert.deepEqual(Array.from(ctx.NubbiExtractAges('Hace 5 años que vive acá y tiene 29 años')), [29]);
    valid({ persona: 'A los 5 años se mudó. Hoy tiene 29 años.' });
    valid({ persona: 'At age 5 she moved; now she is 29 years old.' });
  });
  await test('third-party ages remain permitted', () => {
    valid({ persona: 'Su hermana tiene 12 años.' });
    valid({ persona: 'Her sister is 12.' });
    assert.equal(manual({ persona: 'Su hermana tiene 12 años.' }), null);
  });
  await test('attributed third-party quotes do not become the character age', () => {
    valid({ persona: 'Dice: «Tengo 12 años», recuerda su hermana.' });
    assert.equal(manual({ persona: 'Dice: «Tengo 12 años», recuerda su hermana.' }), null);
  });
  await test('a direct quoted first-person greeting does not bypass the age requirement', () => {
    invalid({ greeting: '«Tengo 17 años»' });
    manualInvalid({ greeting: '«Tengo 17 años»' });
  });
  await test('third-person contractions and singular they expose explicit own ages', () => {
    for (const persona of ["She's 17 years old.", 'He’s 17 years old.', 'They are 17 years old.']) {
      assert.deepEqual(Array.from(ctx.NubbiExtractSelfAges(persona)), [17], persona);
      invalid({ persona });
      manualInvalid({ persona });
    }
  });
  await test('explicit Spanish pronouns identify the character age within a sentence', () => {
    for (const persona of ['Es amable y ella tiene 17 años.', 'Es amable; él tiene 17 años.', 'Actualmente, tiene 17 años.']) {
      assert.deepEqual(Array.from(ctx.NubbiExtractSelfAges(persona)), [17], persona);
      invalid({ persona });
      manualInvalid({ persona });
    }
  });
  await test('typographic third-party quotes retain attribution', () => {
    valid({ persona: 'Su hermana dice: “Tengo 12 años”.' });
    assert.equal(manual({ persona: 'Su hermana dice: “Tengo 12 años”.' }), null);
    invalid({ greeting: '“Tengo 17 años”.' });
  });
  await test('age contradictions do not consume a retry', async () => {
    let calls = 0;
    await assert.rejects(ctx.NubbiGenerateCharacter('idea', async () => {
      calls++;
      return JSON.stringify({ ...character, imagePrompt: 'A person, 70 years old' });
    }, { wait: async () => {} }), error => error.code === 'INVALID_AGE');
    assert.equal(calls, 1);
  });
  await test('new community imports reject underage and missing-age characters before saving', () => {
    for (const desc of ['Exploradora, 17 años', 'Exploradora sin edad']) {
      const { context, events } = communityHarness();
      context.importPub({ ...character, id: 'public-new', desc });
      assert.equal(context.st.custom.length, 0, desc);
      assert.equal(events.saved, 0, desc);
      assert.equal(events.opened.length, 0, desc);
      assert.equal(events.alerts.length, 1, desc);
      assert.equal(events.external, 0, desc);
    }
  });
  await test('valid 18-year-old community imports preserve character fields and save once', () => {
    const { context, events } = communityHarness();
    context.importPub({ ...character, id: 'public-new', desc: 'Exploradora, 18 años' });
    assert.equal(context.st.custom.length, 1);
    assert.equal(context.st.custom[0].desc, 'Exploradora, 18 años');
    assert.equal(context.st.custom[0].persona, character.persona);
    assert.equal(context.st.custom[0].pubId, 'public-new');
    assert.equal(events.saved, 1);
    assert.deepEqual(events.opened, [context.st.custom[0].id]);
    assert.equal(events.alerts.length, 0);
    assert.equal(events.external, 0);
  });
  await test('existing legacy community copies remain unchanged and can still open', () => {
    const legacy = { id: 'local', pubId: 'public-old', name: 'Legacy', desc: 'Sin edad', greeting: 'Hola.' };
    const { context, events } = communityHarness([legacy]);
    const before = JSON.stringify(context.st.custom);
    context.importPub({ id: 'public-old', name: 'Replacement', desc: '19 años' });
    assert.equal(JSON.stringify(context.st.custom), before);
    assert.equal(events.saved, 0);
    assert.equal(events.alerts.length, 0);
    assert.equal(events.opened.length, 0);
    context.confirm = () => true;
    context.importPub({ id: 'public-old', name: 'Replacement', desc: '19 años' });
    assert.deepEqual(events.opened, ['local']);
    assert.equal(JSON.stringify(context.st.custom), before);
    assert.equal(events.saved, 0);
    assert.equal(events.external, 0);
  });
  await test('publishing invalid edited ages rejects before any external access', async () => {
    for (const fields of [
      { pubdesc: 'Exploradora, 17 años' },
      { pubdesc: 'Exploradora sin edad' },
      { pubdesc: 'Exploradora, 18 años', pubpersona: 'Tengo 30 años.' },
    ]) {
      const { context, events, elements } = communityHarness([{ id: 'local', ...character }]);
      for (const [id, value] of Object.entries(fields)) elements[id].value = value;
      await context.publishCurrent();
      assert.equal(events.saved, 0);
      assert.equal(events.external, 0);
      assert.equal(events.alerts.length, 1);
      assert.equal(elements.pubsend.disabled, false);
      assert.equal(elements.pubsend.textContent, 'Publicar');
    }
  });
  await test('legacy image ages require an explicit user declaration without rewriting data', () => {
    const legacy={desc:'Sin edad registrada',persona:'Paciente.'},original=JSON.stringify(legacy);
    assert.throws(()=>ctx.NubbiImageCharacterDescription(legacy,''),e=>e.code==='INVALID_AGE');
    assert.match(ctx.NubbiImageCharacterDescription(legacy,21),/Edad: 21/);
    assert.throws(()=>ctx.NubbiImageCharacterDescription(legacy,17),e=>e.code==='INVALID_AGE');
    assert.throws(()=>ctx.NubbiImageCharacterDescription(character,30),e=>e.code==='INVALID_AGE');
    assert.match(ctx.NubbiImageCharacterDescription(character,29),/Edad: 29/);
    assert.equal(JSON.stringify(legacy),original);
  });
  for (const failure of failures) console.error('FAIL:', failure.name, '\n ', failure.error.message);
  console.log(`Character age regression groups: ${passed} passed, ${failures.length} failed`);
  if (failures.length) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });


