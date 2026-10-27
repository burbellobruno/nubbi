const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../public/app.js'),'utf8');
function element(tag){return {tag,children:[],className:'',textContent:'',appendChild(child){this.children.push(child)},set innerHTML(v){assert.equal(v,'');this.children=[]}};}
const context={document:{createElement:element,createTextNode:text=>({tag:'#text',textContent:text})}};
vm.createContext(context);vm.runInContext(source.slice(source.indexOf('function fmt(el,'),source.indexOf('\n',source.indexOf('function fmt(el,'))),context);
const target=element('div');
context.fmt(target,'*La lluvia golpeó la ventana.*\n\n«Todavía no», dijo Mara. **Esperó.**\n\n<img src=x onerror=alert(1)>');
assert.equal(target.children.length,3);
assert.ok(target.children.every(x=>x.tag==='p'&&x.className==='story-paragraph'));
assert.equal(target.children[0].children[0].tag,'i');
assert.equal(target.children[1].children[1].tag,'b');
assert.equal(target.children[2].children[0].tag,'#text','model HTML must remain inert text');
context.fmt(target,'*Una acción todavía en transmisión');
assert.equal(target.children.length,1,'partial streaming output remains readable');
context.fmt(target,'');assert.equal(target.children.length,0);
console.log('PASS narrative paragraphs, emphasis, inert HTML and streaming fragments');
