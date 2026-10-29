// Descriptive measurements only: repeated phrases are review cues, not semantic grades.
const story=require('../public/story-engine.js');
const words=text=>String(text||'').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];
function summarize(rows){const openings={},paragraphs={},profiles={};let totalWords=0,questions=0,cutoffs=0,tokens=0;
for(const row of rows){const text=row.text||'',clean=text.replace(/^\s*\[[^\]\n]+\]\s*/,''),count=words(clean).length;totalWords+=count;questions+=/\?\s*\*?$/.test(clean)?1:0;cutoffs+=row.finish==='length'?1:0;tokens+=Number(row.usage?.total_tokens)||0;
const blocks=story.formatNarrative(clean),action=blocks.flat().find(part=>part.kind==='action'),opening=action?words(action.text).slice(0,4).join(' '):'';if(opening)openings[opening]=(openings[opening]||0)+1;
for(const part of clean.split(/\n\s*\n/)){const normalized=words(part).join(' ');if(normalized.split(' ').length>=8)paragraphs[normalized]=(paragraphs[normalized]||0)+1;}
const group=profiles[row.profile]||={turns:0,words:0,blocks:0};group.turns++;group.words+=count;group.blocks+=blocks.length;}
return {responses:rows.length,meanWords:rows.length?+(totalWords/rows.length).toFixed(1):0,questionEndings:questions,tokenCutoffs:cutoffs,reportedTotalTokens:tokens,repeatedActionOpenings:Object.entries(openings).filter(([,n])=>n>1).sort((a,b)=>b[1]-a[1]),repeatedParagraphs:Object.entries(paragraphs).filter(([,n])=>n>1),profiles:Object.fromEntries(Object.entries(profiles).map(([k,v])=>[k,{turns:v.turns,meanWords:+(v.words/v.turns).toFixed(1),meanRenderedBlocks:+(v.blocks/v.turns).toFixed(1)}]))};}
module.exports={summarize};
if(require.main===module){const fs=require('fs'),input=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));console.log(JSON.stringify(summarize(input.turns||input.cases||[]),null,2));}
