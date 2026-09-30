import assert from 'node:assert/strict';import test from 'node:test';import {extractFunctions} from './_harness.mjs';
function fixture({direct=true}={}){
 let enabled=true,resolveInfo;const requests=[],fetchOptions=[],clock={now:Date.now()},timers=new Map();let id=0,renders=0;
 const el=()=>({attributes:new Map(),children:[],parentNode:null,textContent:'',setAttribute(k,v){this.attributes.set(k,String(v));},getAttribute(k){return this.attributes.get(k)??null;},removeAttribute(k){this.attributes.delete(k);},remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(c=>c!==this);this.parentNode=null;},appendChild(c){c.parentNode=this;this.children.push(c);return c;},insertBefore(c){this.appendChild(c);},get firstChild(){return this.children[0]||null;},get isConnected(){return !!this.parentNode;},querySelector(){return this.children.find(c=>c.getAttribute('data-dtu-course-eval-status')==='1')||null;}});
 const grid=el();const container=()=>grid.children.find(c=>c.getAttribute('data-dtu-course-eval')==='1')||null;
 const {api}=extractFunctions('darkmode.kurser-course-eval.js',['insertKurserCourseEvaluation'],{prelude:'var _courseEvalRequested=false,_courseEvalCourseCode=null,_courseEvalRetryTimer=null;',globals:{Date:class extends Date{static now(){return clock.now;}},isTopWindow:()=>true,isFeatureFlagEnabled:()=>enabled,getFeatureKurserCourseEvalKey:()=> 'evaluation',pruneCourseWidgetsGrid(){},isKurserCoursePage:()=>true,getKurserCourseCode:()=> '34032',getLayout:()=>({getOrCreateGrid:()=>grid}),findKurserCourseTitleElement:()=>({}),findKurserGradeStatsInsertAnchor:()=>({parentNode:{}}),markExt(){},renderCourseEvalShell:(c,t)=>{c.children=[];const status=el();status.textContent=t;status.setAttribute('data-dtu-course-eval-status','1');c.appendChild(status);return status;},renderCourseEvalEmpty:c=>{c.textContent='No evaluation yet';return c;},renderCourseEvaluationPanel:c=>{renders++;c.textContent='Results';},sendRuntimeMessage:(msg,cb)=>requests.push({msg,cb}),window:{location:{origin:'https://kurser.dtu.dk',pathname:'/course/34032'}},document:{readyState:'complete',querySelector:s=>s==='[data-dtu-course-eval]'?container():null,querySelectorAll:()=>direct?[{getAttribute:()=> 'https://evaluering.dtu.dk/kursus/34032/1',textContent:'Evaluation'}]:[],createElement:()=>el()},fetch:(_url,opts)=>{fetchOptions.push(opts);return new Promise(r=>resolveInfo=r);},setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:i=>timers.delete(i),console:{log(){}}}});
 return {api,requests,timers,fetchOptions,clock,container,enable(v){enabled=v;},info(html){resolveInfo({ok:true,text:async()=>html});},get renders(){return renders;}};
}
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
test('Course Evaluation off cancels a scheduled retry',()=>{
 const f=fixture();f.api.insertKurserCourseEvaluation();f.requests[0].cb({ok:false,error:'http'});assert.equal(f.timers.size,1);f.enable(false);f.api.insertKurserCourseEvaluation();assert.equal(f.container(),null);assert.equal(f.timers.size,0);
});
test('Course Evaluation ignores a late result after its widget is removed',()=>{
 const f=fixture();f.api.insertKurserCourseEvaluation();f.enable(false);f.api.insertKurserCourseEvaluation();f.requests[0].cb({ok:true,data:{}});assert.equal(f.renders,0);
});
test('a pending info response cannot start evaluation fetches after opt-out',async()=>{
 const f=fixture({direct:false});f.api.insertKurserCourseEvaluation();f.enable(false);f.api.insertKurserCourseEvaluation();f.info('<a href="https://evaluering.dtu.dk/kursus/34032/1">Evaluation</a>');await settle();assert.equal(f.requests.length,0);
});
test('info-page evaluation links must belong to the displayed course',async()=>{
 const f=fixture({direct:false});f.api.insertKurserCourseEvaluation();f.info('<a href="https://evaluering.dtu.dk/kursus/99999/999">Other course</a><a href="https://evaluering.dtu.dk/kursus/34032/1">This course</a>');await settle();assert.equal(f.requests[0].msg.url,'https://evaluering.dtu.dk/kursus/34032/1');
});
test('evaluation errors use a ten-minute backoff, not a repeated eight-second fetch',()=>{
 const f=fixture();f.api.insertKurserCourseEvaluation();f.requests[0].cb({ok:false,error:'http'});assert.ok([...f.timers.values()][0].ms>=600000);
});

test('a successful evaluation renders once and idle checks do not fetch again',()=>{
 const f=fixture();f.api.insertKurserCourseEvaluation();f.requests[0].cb({ok:true,data:{}});assert.equal(f.renders,1);for(let i=0;i<10;i++)f.api.insertKurserCourseEvaluation();assert.equal(f.requests.length,1);assert.equal(f.timers.size,0);
});

test('one short cookie fallback precedes ten-minute backoff for a truncated info page',async()=>{
 const f=fixture({direct:false});f.api.insertKurserCourseEvaluation();f.info('<html>Incomplete response</html>');await settle();
 const first=[...f.timers.values()][0];assert.equal(first.ms,1630);
 f.clock.now+=first.ms;first.fn();assert.equal(f.fetchOptions.length,2);assert.equal(f.fetchOptions[1].credentials,'same-origin');
 f.info('<html>Incomplete response</html>');await settle();
 assert.match(f.container().querySelector().textContent,/unavailable/i);
 assert.ok([...f.timers.values()].at(-1).ms>=600000);
});

test('a complete info page without evaluations stays empty without repeated fetches',async()=>{
 const f=fixture({direct:false});f.api.insertKurserCourseEvaluation();f.info('<html>'+ 'Course information. '.repeat(100)+'</html>');await settle();
 assert.equal(f.container().textContent,'No evaluation yet');assert.equal(f.requests.length,0);assert.equal(f.timers.size,0);
 for(let i=0;i<10;i++)f.api.insertKurserCourseEvaluation();assert.equal(f.fetchOptions.length,1);
});
