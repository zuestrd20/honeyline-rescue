import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import * as engine from './engine.js';
import {levels} from './levels.js';

// Pure DOM/canvas mock: runs real app callbacks without a browser dependency.
const source=readFileSync(new URL('./app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
function boot(stored=null, options={}){
  let raf=null,clock=0;
  const context=new Proxy({}, {get(t,k){return t[k]??(()=>{});},set(t,k,v){t[k]=v;return true;}});
  class Node {
    constructor(id){this.id=id;this.listeners={};this.style={};this.hidden=false;this.disabled=false;this.open=false;this.textContent='';this.innerHTML='';this.attrs={};this.classList={add(){},remove(){}};this.child={style:{}};}
    addEventListener(event,callback){(this.listeners[event]??=[]).push(callback);}
    dispatch(event,properties={}){let e={target:this,preventDefault(){},button:0,pointerId:1,...properties};for(const callback of this.listeners[event]??[])callback(e);}
    click(){if(!this.disabled)this.onclick?.({target:this});}
    setAttribute(k,v){this.attrs[k]=v;}
    getContext(){return context;}
    getBoundingClientRect(){return{left:0,top:0,width:720,height:600};}
    setPointerCapture(){}
    releasePointerCapture(){}
    showModal(){this.open=true;}
    close(){this.open=false;}
    querySelector(){return this.child;}
    focus(){}
  }
  const nodes=new Map;const get=id=>{if(!nodes.has(id))nodes.set(id,new Node(id));return nodes.get(id);};
  const document=new Node('document');document.getElementById=get;
  const window=new Node('window');window.matchMedia=()=>({matches:false,addEventListener(){}});
  const saved=[];
  const sandbox=vm.createContext({console,document,window,localStorage:{getItem:()=>stored,setItem:(key,value)=>{if(options.storageThrows)throw new Error('Storage unavailable');saved.push({key,value});}},setTimeout:()=>1,clearTimeout(){},requestAnimationFrame(fn){raf=fn;},performance:{now:()=>clock},...engine,levels});
  vm.runInContext(source,sandbox);
  const frame=(delta=1/60)=>{clock+=delta*1000;raf(clock);};
  const state=()=>vm.runInContext('({index,strokes,active,pointer,game,mode,showHint,saved})',sandbox);
  const evaluate=s=>vm.runInContext(s,sandbox);
  const draw=(points,options={})=>{get('board').dispatch('pointerdown',{clientX:points[0].x,clientY:points[0].y});for(const point of points.slice(1,-1))get('board').dispatch('pointermove',{clientX:point.x,clientY:point.y});const last=points.at(-1);if(!options.releaseOnly)get('board').dispatch('pointermove',{clientX:last.x,clientY:last.y});get('board').dispatch('pointerup',{clientX:last.x,clientY:last.y});};
  return{get,document,window,saved,frame,state,evaluate,draw};
}
const cases=[];
function test(name,fn){try{fn();cases.push({name,pass:true});console.log(`PASS ${name}`);}catch(error){cases.push({name,pass:false,error:error.message});console.log(`FAIL ${name}: ${error.message}`);}}

test('Fresh game starts drawable, with undo/pause disabled',()=>{const a=boot();assert.equal(a.state().mode,'draw');assert.equal(a.get('start').disabled,false);assert.equal(a.get('undo').disabled,true);assert.equal(a.get('pause').disabled,true);});
test('Valid solution pointer input is saved, undo restores all ink',()=>{const a=boot();a.draw(levels[0].solution[0]);assert.equal(a.state().strokes.length,1);assert.equal(a.get('undo').disabled,false);a.get('undo').click();assert.equal(a.state().strokes.length,0);assert.equal(a.get('inkText').textContent,'100%');});
test('Fast pointer down/up stroke includes release coordinate',()=>{const a=boot();a.draw([{x:50,y:50},{x:200,y:50}],{releaseOnly:true});assert.equal(a.state().strokes.length,1);assert.equal(a.state().strokes[0].at(-1).x,200);});
test('Pointer release extends final segment',()=>{const a=boot();a.draw([{x:50,y:50},{x:100,y:50},{x:200,y:50}],{releaseOnly:true});assert.equal(a.state().strokes[0].at(-1).x,200);});
test('Ink is capped at budget and stroke can be committed',()=>{const a=boot();a.draw([{x:50,y:50},{x:650,y:50}]);assert.equal(a.state().strokes.length,1);assert.ok(Math.abs(engine.totalInk(a.state().strokes)-levels[0].ink)<0.01);assert.equal(a.state().active,null);assert.equal(a.get('inkText').textContent,'0%');});
test('Empty coalesced events retain pointermove event',()=>{const a=boot(),b=a.get('board');b.dispatch('pointerdown',{clientX:50,clientY:50});b.dispatch('pointermove',{clientX:100,clientY:50,getCoalescedEvents:()=>[]});assert.equal(a.state().active.length,2);});
test('Pointer cancel discards partial stroke',()=>{const a=boot(),b=a.get('board');b.dispatch('pointerdown',{clientX:50,clientY:50});b.dispatch('pointermove',{clientX:100,clientY:50});b.dispatch('pointercancel');assert.equal(a.state().active,null);assert.equal(a.state().strokes.length,0);});
test('Drawing through rabbit is rejected',()=>{const a=boot();a.draw([{x:310,y:420},{x:410,y:420}]);assert.equal(a.state().strokes.length,0);assert.notEqual(a.get('toast').textContent,'');});
test('Hint toggles and starting hides it',()=>{const a=boot();a.get('hint').click();assert.equal(a.state().showHint,true);a.get('hint').click();assert.equal(a.state().showHint,false);a.get('hint').click();a.get('start').click();assert.equal(a.state().showHint,false);});
test('Pause freezes simulation; resume continues',()=>{const a=boot();a.get('start').click();a.frame();a.get('pause').click();const time=a.state().game.elapsed;for(let i=0;i<60;i++)a.frame();assert.equal(a.state().game.elapsed,time);assert.equal(a.state().mode,'paused');a.get('resultAction').click();assert.equal(a.state().mode,'running');a.frame();assert.ok(a.state().game.elapsed>time);});
test('Visibility change pauses running game',()=>{const a=boot();a.get('start').click();a.document.hidden=true;a.document.dispatch('visibilitychange');assert.equal(a.state().mode,'paused');});
test('Map pauses game; locked levels stay disabled',()=>{const a=boot();a.get('start').click();a.get('levels').click();assert.equal(a.state().mode,'paused');assert.equal(a.get('map').open,true);assert.match(a.get('levelGrid').innerHTML,/data-level="1" disabled/);a.get('closeMap').click();assert.equal(a.get('map').open,false);assert.equal(a.state().mode,'paused');});
test('Empty defense loses and retry resets state',()=>{const a=boot();a.get('start').click();for(let i=0;i<700&&a.state().mode==='running';i++)a.frame();assert.equal(a.state().mode,'lost');assert.equal(a.get('overlay').hidden,false);a.get('resultAction').click();assert.equal(a.state().mode,'draw');assert.equal(a.state().game,null);assert.equal(a.get('overlay').hidden,true);});
test('Hint defense wins, saves stars, unlocks next level',()=>{const a=boot();a.draw(levels[0].solution[0]);a.get('start').click();for(let i=0;i<700&&a.state().mode==='running';i++)a.frame();assert.equal(a.state().mode,'won');assert.equal(a.state().saved.unlocked,2);assert.ok(a.state().saved.stars[0]>=1);assert.equal(a.saved.length,1);a.get('resultAction').click();assert.equal(a.state().index,1);assert.equal(a.state().mode,'draw');});
test('Invalid JSON storage falls back safely',()=>{const a=boot('garbage');assert.equal(a.state().saved.unlocked,1);a.get('levels').click();assert.equal(a.get('map').open,true);});
test('Corrupt/out-of-range stored stars do not break map',()=>{const a=boot(JSON.stringify({unlocked:2,stars:{0:4}}));a.get('levels').click();assert.equal(a.get('map').open,true);});
test('Non-object stored stars do not break saving a win',()=>{const a=boot(JSON.stringify({unlocked:2,stars:'bad'}));a.draw(levels[0].solution[0]);a.get('start').click();for(let i=0;i<700&&a.state().mode==='running';i++)a.frame();assert.equal(a.state().mode,'won');assert.ok(a.saved.length);});
test('Map cancellation refreshes active ink immediately',()=>{const a=boot(),b=a.get('board');b.dispatch('pointerdown',{clientX:50,clientY:50});b.dispatch('pointermove',{clientX:100,clientY:50});assert.notEqual(a.get('inkText').textContent,'100%');a.get('levels').click();a.get('closeMap').click();assert.equal(a.state().active,null);assert.equal(a.get('inkText').textContent,'100%');});
test('Stored unlock count caps at level count',()=>{const a=boot(JSON.stringify({unlocked:999,stars:{}}));assert.equal(a.state().saved.unlocked,levels.length);});
test('Storage write failure keeps completed level and unlock in memory',()=>{const a=boot(null,{storageThrows:true});a.draw(levels[0].solution[0]);a.get('start').click();for(let i=0;i<700&&a.state().mode==='running';i++)a.frame();assert.equal(a.state().mode,'won');assert.equal(a.state().saved.unlocked,2);assert.match(a.get('toast').textContent,/儲存/);});
test('Drawing during a running game is ignored',()=>{const a=boot();a.get('start').click();a.draw([{x:50,y:50},{x:200,y:50}]);assert.equal(a.state().strokes.length,0);assert.equal(a.state().active,null);});
test('Restart discards active input, game, and committed strokes',()=>{const a=boot();a.draw(levels[0].solution[0]);a.get('start').click();a.frame();a.get('retry').click();assert.equal(a.state().mode,'draw');assert.equal(a.state().game,null);assert.equal(a.state().strokes.length,0);assert.equal(a.state().active,null);});
test('Pointer coordinates scale to canvas geometry',()=>{const a=boot();a.get('board').getBoundingClientRect=()=>({left:10,top:20,width:360,height:300});a.draw([{x:35,y:45},{x:110,y:45}]);assert.equal(a.state().strokes[0][0].x,50);assert.equal(a.state().strokes[0].at(-1).x,200);});
test('Select unlocked level closes map and resets active game',()=>{const a=boot(JSON.stringify({unlocked:3,stars:{0:3,1:2}}));a.get('levels').click();a.get('map').dispatch('click',{target:{closest:()=>({disabled:false,dataset:{level:'2'}})}});assert.equal(a.state().index,2);assert.equal(a.state().mode,'draw');assert.equal(a.get('map').open,false);});
test('Last-level victory opens map instead of invalid next level',()=>{const a=boot(JSON.stringify({unlocked:16,stars:{}}));a.evaluate('load(levels.length-1)');for(const stroke of levels.at(-1).solution)a.draw(stroke);a.get('start').click();for(let i=0;i<800&&a.state().mode==='running';i++)a.frame();assert.equal(a.state().mode,'won');a.get('resultAction').click();assert.equal(a.get('map').open,true);assert.equal(a.state().index,levels.length-1);});
test('All 16 levels accept pointer-drawn hints and award three stars',()=>{const a=boot();for(let n=0;n<levels.length;n++){a.evaluate(`load(${n})`);for(const stroke of levels[n].solution)a.draw(stroke);assert.equal(a.state().strokes.length,levels[n].solution.length,`Level ${n+1} input`);a.get('start').click();for(let i=0;i<800&&a.state().mode==='running';i++)a.frame();assert.equal(a.state().mode,'won',`Level ${n+1} result`);assert.equal(a.state().saved.stars[n],3,`Level ${n+1} stars`);}assert.equal(a.state().saved.unlocked,16);});
console.log(`\n${cases.filter(c=>c.pass).length}/${cases.length} UI checks passed.`);
process.exitCode=cases.every(c=>c.pass)?0:1;
