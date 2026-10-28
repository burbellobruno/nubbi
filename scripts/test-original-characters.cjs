/* Original catalog additions: no network, user accounts or provider calls. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const context={window:{},TextDecoder,Uint8Array};vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/catalog.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../public/ai-client.js'),'utf8'),context);
const catalog=Array.from(context.window.NUBBI_RAW);
assert.equal(catalog.length,35,'append exactly eight entries after the existing 27');
const previousHash=crypto.createHash('sha256').update(JSON.stringify(catalog.slice(0,27))).digest('hex');
assert.equal(previousHash,'b8f9a33b13ef25c34414c1e820e33fc24d6ff4ebd28af4dfda48bf49f4015875','existing p0–p26 values and ordering must remain unchanged');
const expected=[['Mara Solís',29],['Damián Voss',31],['Lía Arce',26],['Ivo Calder',28],['Soraya Nadir',34],['Teo Vale',24],['Kira',27],['Aurel',30]];
expected.forEach(([name,age],offset)=>{
 const row=catalog[27+offset],id='p'+(27+offset);
 assert.equal(row.length,8,id+' eight-field NUBBI_RAW schema');
 assert.ok(row.every(value=>typeof value==='string'&&value.trim()),id+' non-empty string fields');
 assert.equal(row[1],name,id+' stable appended identity');
 assert.ok(row[2].includes(age+' años'),id+' explicit adult age');
 assert.ok(['Masculino','Femenino','Otro'].includes(row[4]));
 assert.ok(row[5].split(',').length>=3);
 assert.equal(row[6].split(/(?<=[.!?])\s+/).filter(Boolean).length,4,id+' four sentences of voice, motivation and boundaries');
 assert.match(row[7],/^\*[^*]+\*\s+\S/,id+' action followed by dialogue');
 assert.doesNotMatch(row[7].match(/^\*([^*]+)\*/)[1],/\b(?:te |tu |tus |sientes|piensas|aceptas|decides)\b/i,id+' opening action does not control the user');
 const fields={name:row[1],desc:row[2],role:row[3],persona:row[6],greeting:row[7]};
 assert.equal(context.window.NubbiCharacterAgeIssue(fields),null,id+' valid age under shared contract');
 assert.deepEqual(Array.from(context.window.NubbiExtractAges([row[2],row[6],row[7]].join(' '))),[age],id+' no contradictory age');
 assert.ok(!catalog.slice(0,27).some(old=>old[1]===name),id+' distinct new name');
});
assert.match(catalog[33][2],/Gata antropomórfica/);assert.match(catalog[33][6],/antropomórfica adulta/);
assert.match(catalog[34][2],/Zorro antropomórfico/);assert.match(catalog[34][6],/antropomórfico adulto/);
console.log('Original characters: existing p0–p26 preserved, eight adult append-only p27–p34 entries, voice/boundaries/schema/ages/greetings: OK');
