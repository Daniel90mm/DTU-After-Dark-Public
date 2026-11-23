import assert from 'node:assert/strict';import test from 'node:test';import {extractFunctions} from './_harness.mjs';
function fixture(){
 let enabled=true,code='34032';const clock={now:Date.now()},callbacks=[],timers=new Map();let id=0;
 const el=()=>({attributes:new Map(),children:[],parentNode:null,textContent:'',setAttribute(k,v){this.attributes.set(k,String(v));},getAttribute(k){return this.attributes.get(k)??null;},remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(c=>c!==this);this.parentNode=null;},appendChild(c){c.parentNode=this;this.children.push(c);},insertBefore(c){this.appendChild(c);},get firstChild(){return this.children[0]||null;},get isConnected(){return !!this.parentNode;}});
 const grid=el();const container=()=>grid.children.find(c=>c.getAttribute('data-dtu-grade-stats')==='1')||null;
 const {api}=extractFunctions('darkmode.kurser-widgets.js',['insertKurserGradeStats'],{prelude:'var _gradeStatsRequested=false,_gradeStatsCourseCode=null,_gradeStatsRetryTimer=null;',globals:{Date:class extends Date{static now(){return clock.now;}},isTopWindow:()=>true,isFeatureFlagEnabled:()=>enabled,getGradeStatsFeatureKey:()=> 'grades',pruneCourseWidgetsGrid(){},isKurserCoursePage:()=>true,getKurserCourseCode:()=>code,findKurserCourseTitleElement:()=>({}),findKurserGradeStatsInsertAnchor:()=>({parentNode:{}}),getOrCreateCourseWidgetsGrid:()=>grid,prepareCourseWidgetColumn(){},markExt(){},makeColumnHead:()=>el(),makeColumnSkeleton:()=>el(),revealColumn(){},makeEl:()=>el(),refreshCourseWidgetsLayout(){},buildGradeStatsSemesters:()=>['Winter-2025'],gradeStatsRequestSemesters:()=>({then:(f)=>f(['Winter-2025'])}),sendRuntimeMessage:(msg,cb)=>callbacks.push(cb),renderGradeStatsEmpty:c=>{c.textContent='No exam results yet';},renderGradeStatsUnavailable:c=>{c.textContent='Grades unavailable. Retrying automatically.';},renderGradeStatsColumn:c=>{c.textContent='Results';},document:{querySelector:()=>container(),createElement:()=>el()},setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:i=>timers.delete(i)}});
 return {api,callbacks,timers,clock,container,enable(v){enabled=v;},course(v){code=v;}};
}
test('Grade Statistics default empty state is reserved for a real no_data response',()=>{
 const f=fixture();f.api.insertKurserGradeStats();f.callbacks[0]({ok:false,error:'no_data'});assert.equal(f.container().textContent,'No exam results yet');assert.equal(f.timers.size,0);
});
test('Grade Statistics fetch failure shows unavailable and waits before retrying',()=>{
 const f=fixture();f.api.insertKurserGradeStats();f.callbacks[0]({ok:false,error:'fetch_failed'});assert.match(f.container().textContent,/unavailable/);assert.equal(f.timers.size,1);
 for(let i=0;i<10;i++)f.api.insertKurserGradeStats();assert.equal(f.callbacks.length,1);
 f.clock.now+=610000;[...f.timers.values()][0].fn();assert.equal(f.callbacks.length,2);
});
test('turning Grade Statistics off removes the widget and cancels pending retry',()=>{
 const f=fixture();f.api.insertKurserGradeStats();f.callbacks[0]({ok:false,error:'fetch_failed'});f.enable(false);f.api.insertKurserGradeStats();assert.equal(f.container(),null);assert.equal(f.timers.size,0);
});
test('a late grade response for a removed widget cannot render results',()=>{
 const f=fixture();f.api.insertKurserGradeStats();const old=f.container();f.enable(false);f.api.insertKurserGradeStats();f.callbacks[0]({ok:true,data:{total:10}});assert.notEqual(old.textContent,'Results');assert.equal(f.container(),null);
});
test('a grade column the page replaced mid-request gets the answer instead of loading forever',()=>{
 const f=fixture();f.api.insertKurserGradeStats();f.container().remove();f.api.insertKurserGradeStats();const redrawn=f.container();assert.equal(f.callbacks.length,1);
 f.callbacks[0]({ok:true,data:{total:10}});assert.equal(redrawn.textContent,'Results');
});
test('a grade answer with no column left lets the next check ask again',()=>{
 const f=fixture();f.api.insertKurserGradeStats();f.container().remove();f.callbacks[0]({ok:true,data:{total:10}});f.api.insertKurserGradeStats();assert.equal(f.callbacks.length,2);
});
test('grade terms turn on the Danish date, whatever the browser time zone',()=>{
 // 22:30 UTC on 30 June is 00:30 on 1 July in Denmark: the summer exams are over.
 const now=Date.parse('2026-06-30T22:30:00Z');class ClockDate extends Date{constructor(...a){if(a.length)super(...a);else super(now);}static now(){return now;}}
 const {api}=extractFunctions('darkmode.kurser-widgets.js',['danishToday','buildGradeStatsSemesters'],{globals:{Date:ClockDate}});
 assert.equal(api.buildGradeStatsSemesters()[0],'Winter-2026');
});
