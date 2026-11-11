import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { extractFunctions, loadModuleInternals, plain } from './_harness.mjs';
const {api: summary}=loadModuleInternals('darkmode.participant-intel-ui.js',['buildRetentionRadarSummary']);
test('retention sorts snapshots and reports both previous and baseline changes',()=>{
 const r=summary.buildRetentionRadarSummary([{count:42,ts:2000},{count:50,ts:1000},{count:40,ts:3000}],0);
 assert.equal(r.latestCount,40);assert.equal(r.previousDeltaCount,-2);assert.equal(r.windowDeltaCount,-10);assert.equal(r.windowDeltaPct,-20);assert.equal(r.peakCount,50);
});
test('retention rejects malformed snapshots and uses a single current count without invented changes',()=>{
 const r=summary.buildRetentionRadarSummary([null,{count:NaN,ts:1},{count:3,ts:'bad'}],42);
 assert.equal(r.latestCount,42);assert.equal(r.snapshotCount,1);assert.equal(r.previousDeltaCount,null);assert.equal(r.windowDeltaCount,null);
 assert.equal(summary.buildRetentionRadarSummary([],0),null);
});
function depsFixture(){
 const flags={master:true,composition:true,history:true,retention:true};let pending,saves=0;
 const deps={featureParticipantIntelKey:'master',featureParticipantIntelDemographicsKey:'composition',featureParticipantIntelSharedHistoryKey:'history',featureParticipantIntelRetentionKey:'retention',isFeatureFlagEnabled:k=>flags[k],
  isCampusnetParticipantPage:()=>true,getCampusnetUsersCountFromPage:()=>42,getCampusnetCourseCodeFromPage:()=> '34032',getCampusnetSemesterFromPage:()=> 'E2026',getCampusnetRetentionKey:()=> '34032_E2026',normalizeIntelCourseCode:v=>v,normalizeIntelCourseSemester:v=>v,
  loadParticipantIntel:cb=>{pending=cb;},saveParticipantIntel:()=>{saves++;},participantIntelMaxRetention:10,detectCampusnetSelfSNumberFromHeader:()=>''};
 return {flags,deps,resolve:v=>pending(v),get saves(){return saves;}};
}
test('disabling Course Composition during a storage read prevents late rendering',()=>{
 const f=depsFixture();let cards=0;const {api}=extractFunctions('darkmode.participant-intel-ui.js',['renderParticipantDemographics'],{prelude:'var piProgramMembers={};',globals:{getDeps:()=>f.deps,groupParticipantsByProgram:()=>({}),renderDemographicsCard:()=>cards++,getCurrentCourseRetentionSnapshots:()=>[],buildRetentionRadarSummary:()=>null}});
 api.renderParticipantDemographics([{program:'Physics'}],{total:42,complete:true});f.flags.composition=false;f.resolve({self:null});assert.equal(cards,0);
});
test('disabling Shared Course History during a storage read prevents late annotations',()=>{
 const f=depsFixture();let reads=0;f.deps.getCampusnetUsersParticipantElements=()=>[{querySelector(){reads++;return null;}}];
 const {api}=extractFunctions('darkmode.participant-intel-ui.js',['annotateParticipantHistory'],{globals:{getDeps:()=>f.deps,getIsDark:()=>false,document:{querySelectorAll:()=>[]}}});
 api.annotateParticipantHistory();f.flags.history=false;f.resolve({self:null,students:{}});assert.equal(reads,0);
});
test('disabling Participant Intelligence during retention storage read prevents a new snapshot',()=>{
 const f=depsFixture();let renders=0;
 const {api}=extractFunctions('darkmode.participant-intel-ui.js',['recordRetentionSnapshot','dropStaffOnlySnapshots'],{prelude:'var retentionSnapshotInFlight=false;',globals:{getDeps:()=>f.deps,readStaffPrefixCounts:()=>[3],renderRetentionIndicator:()=>renders++,insertParticipantDemographics(){}}});
 api.recordRetentionSnapshot();f.flags.master=false;const intel={retention:{}};f.resolve(intel);assert.equal(f.saves,0);assert.equal(renders,0);assert.deepEqual(intel.retention,{});
});
test('retention stores at most one snapshot per six hours and caps history',()=>{
 const f=depsFixture();let renders=0;f.flags.composition=false;f.deps.participantIntelMaxRetention=2;
 const {api}=extractFunctions('darkmode.participant-intel-ui.js',['recordRetentionSnapshot','dropStaffOnlySnapshots'],{prelude:'var retentionSnapshotInFlight=false;',globals:{getDeps:()=>f.deps,readStaffPrefixCounts:()=>[3],renderRetentionIndicator:()=>renders++,insertParticipantDemographics(){}}});
 const now=Date.now();const intel={retention:{'34032_E2026':[{count:50,ts:now-20*3600000},{count:45,ts:now-10*3600000}]}};
 api.recordRetentionSnapshot();f.resolve(intel);assert.equal(f.saves,1);assert.equal(intel.retention['34032_E2026'].length,2);assert.equal(intel.retention['34032_E2026'][1].count,42);
 api.recordRetentionSnapshot();f.resolve(intel);assert.equal(f.saves,1);assert.equal(renders,2);
});

test('Shared History collection stops before fetching when its setting is off',()=>{
 const f=depsFixture();f.flags.history=false;let requests=0;
 f.deps.isCampusnetLikelyAcademicCourse=()=>true;f.deps.getCampusnetCourseNameFromPage=()=> 'Synthetic course';
 const {api}=extractFunctions('darkmode.participant-intel-core.js',['collectParticipantData'],{globals:{getDeps:()=>f.deps,getFullParticipantList:()=>requests++,storeParticipantData(){}}});
 api.collectParticipantData();assert.equal(requests,0);
});
test('turning Shared History off during storage read prevents participant persistence',()=>{
 const f=depsFixture();let writes=0;f.deps.participantIntelMaxStudents=3;
 const {api}=extractFunctions('darkmode.participant-intel-core.js',['storeParticipantData'],{prelude:'var participantIntelLastCollectSig=null,participantIntelLastCollectTs=0;',globals:{getDeps:()=>f.deps,loadParticipantIntel:cb=>f.deps.loadParticipantIntel(cb),detectAndStoreSelf(){},saveParticipantIntel:()=>writes++}});
 api.storeParticipantData([{sNumber:'s123456',name:'Synthetic student',program:'Physics'}],'34032','E2026','Synthetic course');
 f.flags.history=false;const intel={students:{},courseNames:{},self:null};f.resolve(intel);assert.equal(writes,0);assert.deepEqual(intel.students,{});
});

test('turning Participant Intelligence off during an archive fetch stops collection and further requests',async()=>{
 const f=depsFixture();let resolve,requests=0,upserts=0;const timers=[];
 const {api}=extractFunctions('darkmode.participant-intel-backfill.js',['runCampusnetArchiveBackfill'],{prelude:'var campusnetArchiveBackfillRunning=false,campusnetArchiveBackfillAbort=false,campusnetArchiveBackfillProgress=null;',globals:{getDeps:()=>f.deps,window:{location:{hostname:'campusnet.dtu.dk'}},updateCampusnetArchiveBackfillWidgetStatus(){},fetchBestCampusnetParticipantsDoc:()=>{requests++;return new Promise(r=>resolve=r);},parseParticipantListFromDoc:()=>[{sNumber:'s123456'}],upsertParticipantsIntoIntel:()=>upserts++,setTimeout:fn=>timers.push(fn)}});
 f.deps.getCampusnetExplicitSemesterFromPage=()=> 'E2026';f.deps.getCampusnetCourseNameFromPage=()=> 'Synthetic course';
 const intel={self:null,backfill:{scanned:{}}};api.runCampusnetArchiveBackfill([{elementId:'1'},{elementId:'2'}],intel);
 f.flags.master=false;resolve({doc:{}});await Promise.resolve();await Promise.resolve();timers.shift()?.();
 assert.equal(upserts,0);assert.equal(requests,1);assert.deepEqual(intel.backfill.scanned,{});
});

test('unchanged standalone Retention Radar preserves its rendered children',()=>{
 const f=depsFixture();f.flags.composition=false;let card=null,renders=0;
 f.deps.getCampusnetUsersAnchorElement=()=>null;f.deps.getCampusnetParticipantsListRoot=()=>({});f.deps.markExt=()=>{};
 const {api}=extractFunctions('darkmode.participant-intel-ui.js',['renderRetentionIndicator'],{globals:{getDeps:()=>f.deps,getIsDark:()=>false,buildRetentionRadarSummary:summary.buildRetentionRadarSummary,placeParticipantIntelHost:e=>{card=e;},prepareParticipantIntelHost:()=>{renders++;return{setAttribute(){},appendChild(){}};},buildRetentionColumn:()=>({}),document:{querySelector:s=>s.includes('retention-indicator')?card:null,createElement:()=>{const a=new Map();return{setAttribute:(k,v)=>a.set(k,v),getAttribute:k=>a.get(k)??null};}}}});
 const snapshots=[{count:42,ts:1000}];api.renderRetentionIndicator(snapshots);api.renderRetentionIndicator(snapshots);assert.equal(renders,1);
});

test('non-boolean feature storage cannot enable opt-in Participant Intelligence',()=>{
 for(const value of ['false','true',1,{},null]){
  const {api}=extractFunctions('darkmode.feature-flags.js',['loadFeatureFlags','isFeatureFlagEnabled'],{prelude:'const FEATURE_FLAG_DEFAULTS={intel:false,gpa:true};let _featureFlags={},_featureFlagsLoaded=false;',globals:{getExtensionStorageArea:()=>null,storageLocalGet:(defaults,cb)=>cb('intel' in defaults?{intel:value,gpa:false}:{}),setFeatureFlagEnabled(){}}});
  api.loadFeatureFlags();assert.equal(api.isFeatureFlagEnabled('intel'),false);assert.equal(api.isFeatureFlagEnabled('gpa'),false);
 }
});

function archiveWidgetFixture() {
    const f = depsFixture(); let mounts = 0, onArchive = true;
    function node() {
        const attrs = new Map();
        return {
            children: [], listeners: {}, parentNode: null, style: { setProperty() {} },
            setAttribute: (k, v) => attrs.set(k, v), getAttribute: k => attrs.get(k),
            appendChild(c) { c.parentNode = this; this.children.push(c); },
            get firstChild() { return this.children[0]; },
            get isConnected() { return this === anchor || !!this.parentNode?.isConnected; },
            addEventListener(k, fn) { this.listeners[k] = fn; },
            querySelector(selector) {
                const key = selector.slice(1, -1);
                for (const c of this.children) { if (c.getAttribute(key)) return c; const found = c.querySelector(selector); if (found) return found; }
                return null;
            }
        };
    }
    const anchor = node(); const append = anchor.appendChild;
    anchor.appendChild = function (n) { mounts++; append.call(this, n); };
    Object.assign(f.deps, { isCampusnetGroupArchivePage: () => onArchive, isCampusnetLikelyAcademicCourse: () => true, markExt() {} });
    const { api } = extractFunctions('darkmode.participant-intel-backfill.js', ['insertCampusnetArchiveBackfillWidget'], {
        prelude: 'var archiveBackfillInsertPending=false,campusnetArchiveBackfillRunning=false,campusnetArchiveBackfillProgress=null;',
        globals: { getDeps: () => f.deps, getIsDark: () => false,
            parseCampusnetArchivedElements: () => [{ elementId: '1', codeHint: '34032', semesterHint: 'E2026', title: 'Synthetic course' }],
            formatShortDateTime: () => '', updateCampusnetArchiveBackfillWidgetStatus() {},
            runCampusnetArchiveBackfill() {}, document: { hidden: true, body: anchor,
                createElement: node, querySelector: s => s === '[data-dtu-archive-backfill]' ? anchor.querySelector(s) : anchor }
        }
    });
    return { ...f, api, anchor, off: key => { f.flags[key] = false; }, leave: () => { onArchive = false; }, get writes() { return f.saves; }, get mounts() { return mounts; } };
}
const syntheticArchiveIntel = () => ({ self: { sNumber: 's000001', courses: [] }, backfill: { scanned: {} } });
for (const feature of ['master', 'history']) {
    test(`pending archive widget cannot seed or mount after ${feature} opt-out`, () => {
        const f = archiveWidgetFixture(); const intel = syntheticArchiveIntel();
        f.api.insertCampusnetArchiveBackfillWidget(); f.off(feature); f.resolve(intel);
        assert.equal(f.writes, 0); assert.equal(f.mounts, 0); assert.deepEqual(intel.self.courses, []);
    });
}
test('pending archive widget cannot seed after leaving the archive page', () => {
    const f = archiveWidgetFixture(); f.api.insertCampusnetArchiveBackfillWidget(); f.leave(); f.resolve(syntheticArchiveIntel());
    assert.equal(f.writes, 0); assert.equal(f.mounts, 0);
});
test('enabled archive widget seeds and mounts normally', () => {
    const f = archiveWidgetFixture(); f.api.insertCampusnetArchiveBackfillWidget(); f.resolve(syntheticArchiveIntel());
    assert.equal(f.writes, 1); assert.equal(f.mounts, 1);
});
for (const control of ['start', 'auto-input']) {
    test(`pending archive ${control} storage callback stops after opt-out`, () => {
        const f = archiveWidgetFixture(); const intel = syntheticArchiveIntel(); intel.backfill.scanned['1'] = 1;
        f.api.insertCampusnetArchiveBackfillWidget(); f.resolve(intel);
        const button = f.anchor.querySelector(`[data-dtu-archive-backfill-${control}]`);
        button.listeners[control === 'start' ? 'click' : 'change'](); f.off('history'); f.resolve(intel);
        assert.equal(f.writes, 1); assert.equal(intel.backfill.autoWeekly, undefined); assert.equal(intel.backfill.lastRunTs, undefined);
    });
}

// Program and group-page parsing on the host module.
function hostFixture(pathname, crumbs) {
    const links = crumbs.map(([text, href]) => ({ textContent: text, getAttribute: k => (k === 'href' ? href : null) }));
    const breadcrumb = { querySelectorAll: () => links };
    const doc = { title: 'Participants', querySelector: s => (s.includes('breadcrumb') ? breadcrumb : null), querySelectorAll: () => [] };
    return loadModuleInternals('darkmode.participant-intel-host.js', ['pickParticipantProgram', 'getCampusnetRetentionKey'], {
        document: doc, window: { location: { pathname, hostname: 'campusnet.dtu.dk' } }
    }).api;
}
const courseCrumb = ['12106 Quantitative methods to assess sustainability (Polytechnical Foundation) E26', '/cnnet/element/index.aspx?elementid=876717'];
test('a student with a finished bachelor and a current master counts under the master', () => {
    const host = hostFixture('/cnnet/element/876717/participants', [courseCrumb]);
    assert.equal(host.pickParticipantProgram(['Bachelor program in Biomedical Engineering', 'Master of Science in Engineering Light']), 'Master of Science in Engineering Light');
    assert.equal(host.pickParticipantProgram(['Master of Science in Engineering Light', 'Bachelor program in Biomedical Engineering']), 'Master of Science in Engineering Light');
    assert.equal(host.pickParticipantProgram(['Master of Science in Physics', 'ph.d']), 'ph.d');
    assert.equal(host.pickParticipantProgram(['Gæst udl.', 'Exchange programme']), 'Exchange programme');
    assert.equal(host.pickParticipantProgram(['  ', 'Bachelor of Science in Chemistry']), 'Bachelor of Science in Chemistry');
    assert.equal(host.pickParticipantProgram([]), '');
    // Newer DTU masters are listed by name only, in either order.
    assert.equal(host.pickParticipantProgram(['Bachelor program in Biomedical Engineering', 'Biomaterial Engineering for Medicine']), 'Biomaterial Engineering for Medicine');
    assert.equal(host.pickParticipantProgram(['Biomaterial Engineering for Medicine', 'Bachelor program in Biomedical Engineering']), 'Biomaterial Engineering for Medicine');
    assert.equal(host.pickParticipantProgram(['Pharmaceutical Design and Engineering', 'Bachelor program in Life Science Engineering']), 'Pharmaceutical Design and Engineering');
    // A name-only BEng ranks below the master it is listed with.
    assert.equal(host.pickParticipantProgram(['Master of Science in Architectural Engineering', 'Civil Engineering']), 'Master of Science in Architectural Engineering');
    assert.equal(host.pickParticipantProgram(['Process and Innovation, B. Eng.', 'Master of Science in Sustainable Energy Technologies']), 'Master of Science in Sustainable Energy Technologies');
    // Single courses, open education, access course and guests never beat a degree.
    assert.equal(host.pickParticipantProgram(['Bachelor program in Architectural Engineering', 'enkeltfag']), 'Bachelor program in Architectural Engineering');
    assert.equal(host.pickParticipantProgram(['Master of Science in Civil Engineering', 'åben udd.']), 'Master of Science in Civil Engineering');
    assert.equal(host.pickParticipantProgram(['Master of Science in Computer Science and Engineering', 'Adgangskursus']), 'Master of Science in Computer Science and Engineering');
    assert.equal(host.pickParticipantProgram(['Master of Science in Business Analytics', '-']), 'Master of Science in Business Analytics');
    assert.equal(host.pickParticipantProgram(['Bachelor program in Biomedical Engineering', 'Gæst udl.']), 'Bachelor program in Biomedical Engineering');
    assert.equal(host.pickParticipantProgram(['enkeltfag']), 'enkeltfag');
    // Danish ø is not split by NFD; "Civilingeniør" is still a master.
    assert.equal(host.pickParticipantProgram(['Bachelor program in Biomedical Engineering', 'Civilingeniør i Byggeri og Infrastruktur']), 'Civilingeniør i Byggeri og Infrastruktur');
    // "BEng" written without dots is still a bachelor, above a guest.
    assert.equal(host.pickParticipantProgram(['BEng in Civil Engineering', 'Gæst udl.']), 'BEng in Civil Engineering');
    assert.equal(host.pickParticipantProgram(['Master of Science in Physics', 'Civil Engineering BEng']), 'Master of Science in Physics');
});
test('the Users heading count reads thousands written with a space, nbsp, dot or comma', () => {
    const host = loadModuleInternals('darkmode.participant-intel-host.js', ['getCampusnetUsersCountFromPage', 'getProgramLevel'], {
        document: { title: '', querySelector: () => null, querySelectorAll: () => [] },
        window: { location: { pathname: '/p', hostname: 'campusnet.dtu.dk' } }
    }).api;
    const doc = (text) => ({ querySelectorAll: (s) => (s === '.ui-participant-categorybar h3' ? [{ textContent: text, closest: () => ({}) }] : []) });
    assert.equal(host.getCampusnetUsersCountFromPage(doc('Users (18)')), 18);
    assert.equal(host.getCampusnetUsersCountFromPage(doc('Users (1 234)')), 1234);
    assert.equal(host.getCampusnetUsersCountFromPage(doc('Brugere (1 234)')), 1234);
    assert.equal(host.getCampusnetUsersCountFromPage(doc('Users (1.234)')), 1234);
    assert.equal(host.getCampusnetUsersCountFromPage(doc('Users (1,234)')), 1234);
    assert.equal(host.getCampusnetUsersCountFromPage(doc('Users')), null);
    assert.equal(host.getProgramLevel('BEng in Civil Engineering'), 2);
    assert.equal(host.getProgramLevel('Civilingeniør, cand.polyt.'), 3);
});
test('a group inside a course keeps its own Retention Radar series', () => {
    const course = hostFixture('/cnnet/element/876717/participants', [courseCrumb, ['List of participants', '/cnnet/element/876717/participants']]);
    assert.equal(course.getCampusnetRetentionKey(), '12106_E2026');
    const group = hostFixture('/cnnet/element/898571/participants', [courseCrumb, ['Materials for building construction-Building - Group 14', '/cnnet/element/index.aspx?elementid=898571'], ['List of participants', '/cnnet/element/898571/participants']]);
    assert.equal(group.getCampusnetRetentionKey(), '12106_E2026_el898571');
    assert.equal(hostFixture('/cnnet/element/1/participants', []).getCampusnetRetentionKey(), '');
});

test('retention saves nothing until the Users heading gives a count',()=>{
 const f=depsFixture();let loads=0;f.deps.getCampusnetUsersCountFromPage=()=>null;f.deps.loadParticipantIntel=()=>loads++;
 f.deps.getCampusnetUsersParticipantElements=()=>[1,2,3];
 const {api}=extractFunctions('darkmode.participant-intel-ui.js',['recordRetentionSnapshot','dropStaffOnlySnapshots'],{prelude:'var retentionSnapshotInFlight=false;',globals:{getDeps:()=>f.deps,readStaffPrefixCounts:()=>[3],renderRetentionIndicator(){},insertParticipantDemographics(){}}});
 api.recordRetentionSnapshot();assert.equal(loads,0);
});
test('retention drops an old reading that counted only the staff rows',()=>{
 const f=depsFixture();f.flags.composition=false;f.deps.getCampusnetUsersCountFromPage=()=>18;let shown=null;
 const {api}=extractFunctions('darkmode.participant-intel-ui.js',['recordRetentionSnapshot','dropStaffOnlySnapshots'],{prelude:'var retentionSnapshotInFlight=false;',globals:{getDeps:()=>f.deps,readStaffPrefixCounts:()=>[3],renderRetentionIndicator:s=>{shown=s;},insertParticipantDemographics(){}}});
 const now=Date.now();const intel={retention:{'34032_E2026':[{count:18,ts:now-5*86400000},{count:3,ts:now-3600000}]}};
 api.recordRetentionSnapshot();f.resolve(intel);
 assert.deepEqual(plain(intel.retention['34032_E2026'].map(s=>s.count)),[18,18]);assert.equal(intel.retention['34032_E2026'][1].src,'users');assert.equal(f.saves,1);
 const kept=api.dropStaffOnlySnapshots([{count:3,ts:1,src:'users'},{count:3,ts:2}],3,[3]);assert.equal(kept.length,2,'a staff-sized count that is also the Users count stays');
});
const {api: pf}=extractFunctions('darkmode.participant-intel-ui.js',['participantKey','groupParticipantsByProgram','summarizeProgramMembers','describeProgramFilter']);
test('study line hover lists who a program counts, then how many more',()=>{
 const g=pf.groupParticipantsByProgram([{name:'Anna',sNumber:'s1',program:'Physics'},{name:'Bo',sNumber:'s2',program:'Physics'},{name:'Cy',sNumber:'s3',program:''},{name:'',sNumber:'s4',program:'Physics'}]);
 assert.deepEqual(plain(Object.keys(g)),['Physics']);assert.equal(g.Physics.length,3);
 assert.deepEqual(plain(pf.summarizeProgramMembers(g.Physics,1)),{names:['Anna'],more:2});
 assert.deepEqual(plain(pf.summarizeProgramMembers(g.Physics,12)),{names:['Anna','Bo'],more:1});
});
test('study line filter says when part of the program is on other list pages',()=>{
 assert.equal(pf.describeProgramFilter('Physics',2,0,2),'Showing the 2 students in Physics.');
 assert.equal(pf.describeProgramFilter('Physics',0,68,68),'Showing the 68 students in Physics. All of them are from other pages of this list.');
 assert.equal(pf.describeProgramFilter('Physics',5,4,9),'Showing the 9 students in Physics. 4 of them are from other pages of this list.');
 assert.equal(pf.describeProgramFilter('Physics',5,0,9),'Showing 5 of the 9 students in Physics. The others are on other pages of this list.');
});
const {api: pk}=extractFunctions('darkmode.participant-intel-ui.js',['participantKey','groupParticipantsByProgram','describeProgramFilter','renumberBorrowedEntry'],{prelude:'var PI_BORROWED_ID_OFFSET=100000;'});
test('a study line member without an s-number is matched by user id, then by name',()=>{
 assert.equal(pk.participantKey({sNumber:'s123456',userId:'9',name:'A'}),'s123456');
 assert.equal(pk.participantKey({sNumber:'',userId:'9',name:'A'}),'u9');
 assert.equal(pk.participantKey({name:'  Anna   Berg '}),'nanna berg');
 assert.equal(pk.participantKey({}),'');
 const g=pk.groupParticipantsByProgram([{name:'Staff Person',userId:'77',program:'Physics'}]);
 assert.equal(g.Physics[0].key,'u77');
});
test('the filter bar says so when only this page of the list could be read',()=>{
 assert.equal(pk.describeProgramFilter('Physics',3,0,3,true),'Showing the 3 students in Physics on this page. The rest of the list could not be loaded.');
 assert.equal(pk.describeProgramFilter('Physics',1,0,1,true),'Showing the 1 student in Physics on this page. The rest of the list could not be loaded.');
});
function fakeEl(attrs){return {attrs:{...attrs},get id(){return this.attrs.id||'';},set id(v){this.attrs.id=v;},getAttribute(k){return k in this.attrs?this.attrs[k]:null;},setAttribute(k,v){this.attrs[k]=String(v);},removeAttribute(k){delete this.attrs[k];}};}
test('a copied entry gets its own arrow and detail box ids so its arrow opens its own details',()=>{
 const arrow=fakeEl({id:'participantarrow30',onclick:'ToggleAdditionalParticipantInformation(30)'});
 const entry={querySelector:s=>s==='.ui-participants-arrow'?arrow:null};const info=fakeEl({id:'participantinformation30'});
 pk.renumberBorrowedEntry(entry,info);
 assert.equal(arrow.id,'participantarrow100030');assert.equal(arrow.getAttribute('onclick'),'ToggleAdditionalParticipantInformation(100030)');assert.equal(info.id,'participantinformation100030');
 const odd=fakeEl({id:'something'});const info2=fakeEl({id:'participantinformation4'});
 pk.renumberBorrowedEntry({querySelector:()=>odd},info2);
 assert.equal(info2.getAttribute('id'),null,'an unknown arrow shape leaves no id that could clash');
});
const {api: hostApi}=extractFunctions('darkmode.participant-intel-host.js',['getCampusnetUsersParticipantElements','findCampusnetUsersParticipantElements'],{globals:{document:{},getCampusnetUsersCategoryMeta:()=>({containerEl:{querySelectorAll:()=>[{b:false,hasAttribute:()=>false},{b:true,hasAttribute:k=>k==='data-dtu-pi-borrowed'}]}})}});
test('entries copied in by the study line filter are not counted as CampusNet Users rows',()=>{
 const rows=hostApi.getCampusnetUsersParticipantElements();assert.equal(rows.length,1);assert.equal(rows[0].b,false);
});
test('a failed refresh of the full list keeps the last full list instead of only this page',async()=>{
 const deps={getCampusnetUsersCountFromPage:()=>786,getCampusnetUsersParticipantElements:()=>new Array(17)};
 const {api}=extractFunctions('darkmode.participant-intel-core.js',['getFullParticipantList'],{prelude:'var FULL_PARTICIPANT_LIST_TTL_MS=600000;var fullParticipantListCache={key:"/p",ts:0,participants:[{sNumber:"s1"},{sNumber:"s2"}],total:786,doc:{}};var fullParticipantListFailure=null;var fullParticipantListInFlight=null;var fullListDocCache=null;',globals:{getDeps:()=>deps,parseParticipantList:()=>[{sNumber:'s1'}],window:{location:{pathname:'/p'}},fetchParticipantExport:()=>Promise.reject(new Error('http_500')),fetchFullParticipantsHtml:()=>Promise.reject(new Error('http_500')),DOMParser:class{}}});
 const got=await new Promise(r=>api.getFullParticipantList((p,info)=>r({n:p.length,info})));
 assert.equal(got.n,2);assert.equal(got.info.complete,true);
 const again=await new Promise(r=>api.getFullParticipantList((p,info)=>r({n:p.length,info})));
 assert.equal(again.n,2,'the one-minute failure pause also keeps the last full list');
});
test('a list view without a Users heading (Roles) still loads the full list',async()=>{
 let fetched=0;const deps={getCampusnetUsersCountFromPage:d=>d?786:null,getCampusnetUsersParticipantElements:()=>new Array(50)};
 const {api}=extractFunctions('darkmode.participant-intel-core.js',['getFullParticipantList'],{prelude:'var FULL_PARTICIPANT_LIST_TTL_MS=600000;var fullParticipantListCache=null;var fullParticipantListFailure=null;var fullParticipantListInFlight=null;var fullListDocCache=null;',globals:{getDeps:()=>deps,parseParticipantList:d=>d?new Array(786).fill({}):new Array(50).fill({}),window:{location:{pathname:'/p'}},fetchParticipantExport:()=>Promise.reject(new Error('export_not_file')),fetchFullParticipantsHtml:()=>{fetched++;return Promise.resolve('<html>');},DOMParser:class{parseFromString(){return {doc:1};}}}});
 const got=await new Promise(r=>api.getFullParticipantList((p,info)=>r({n:p.length,info})));
 assert.equal(fetched,1);assert.equal(got.n,786);assert.equal(got.info.total,786);
});
const exportText='First name;Last name;Study number;Education;\r\nAmy;Ng;s234988;Bachelor program in Biomedical Engineering, Biomaterial Engineering for Medicine;\r\nBo;Li;;enkeltfag;\r\nCy;Ek;S215848;Process and Innovation, B. Eng.;\r\n';
const exportDeps={normalizeWhitespace:t=>String(t).replace(/\s+/g,' ').trim(),readExportProgram:t=>t,getCampusnetUsersCountFromPage:()=>786,getCampusnetUsersParticipantElements:()=>new Array(50)};
test('the composition is read from CampusNet\'s export when it answers, without the slow one-page list',async()=>{
 let html=0;
 const {api}=extractFunctions('darkmode.participant-intel-core.js',['getFullParticipantList','parseParticipantExport'],{prelude:'var FULL_PARTICIPANT_LIST_TTL_MS=600000;var fullParticipantListCache=null;var fullParticipantListFailure=null;var fullParticipantListInFlight=null;var fullListDocCache=null;',globals:{getDeps:()=>exportDeps,parseParticipantList:()=>[{sNumber:'s234988',userId:'356212'}],window:{location:{pathname:'/p'}},fetchParticipantExport:()=>Promise.resolve(exportText),fetchFullParticipantsHtml:()=>{html++;return Promise.resolve('');},DOMParser:class{}}});
 const got=await new Promise(r=>api.getFullParticipantList((p,info)=>r({p,info})));
 assert.equal(html,0);assert.equal(got.info.complete,true);assert.equal(got.info.total,786);
 assert.equal(got.p.map(x=>x.sNumber).join(','),'s234988,s215848','rows without a study number are skipped, study numbers lower-cased');
 assert.equal(got.p[0].name,'Amy Ng');assert.equal(got.p[0].userId,'356212','user id taken from this page');
});
test('an export with other columns is refused so the one-page list is used instead',()=>{
 const {api}=extractFunctions('darkmode.participant-intel-core.js',['parseParticipantExport'],{globals:{getDeps:()=>exportDeps}});
 assert.throws(()=>api.parseParticipantExport('First name;Last name;Email;Role;\r\nA;B;a@b;x;'),/export_columns/);
 assert.throws(()=>api.parseParticipantExport(''),/export_columns/);
});
test('the export file is read as UTF-16LE, as CampusNet sends it',()=>{
 const {api}=extractFunctions('darkmode.participant-intel-core.js',['decodeParticipantExport']);
 const bytes=Buffer.from('\uFEFFStudy number;Gæst udl.;','utf16le');
 assert.equal(api.decodeParticipantExport(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length)),'Study number;Gæst udl.;');
 const utf8=Buffer.from('Study number;','utf8');
 assert.equal(api.decodeParticipantExport(utf8.buffer.slice(utf8.byteOffset,utf8.byteOffset+utf8.length)),'Study number;');
});
test('the export\'s comma-joined programs are split, keeping "B. Eng." with its label',()=>{
 const host=loadModuleInternals('darkmode.participant-intel-host.js',['readExportProgram'],{document:{title:'',querySelector:()=>null,querySelectorAll:()=>[]},window:{location:{pathname:'/p',hostname:'campusnet.dtu.dk'}}}).api;
 assert.equal(host.readExportProgram('Process and Innovation, B. Eng., Master of Science in Sustainable Energy Technologies'),'Master of Science in Sustainable Energy Technologies');
 assert.equal(host.readExportProgram('enkeltfag, Bachelor program in Biomedical Engineering'),'Bachelor program in Biomedical Engineering');
 assert.equal(host.readExportProgram('Biomaterial Engineering for Medicine, Bachelor program in Biomedical Engineering'),'Biomaterial Engineering for Medicine');
 assert.equal(host.readExportProgram('Process and Innovation, B. Eng.'),'Process and Innovation, B. Eng.');
});
const {api: pfl}=extractFunctions('darkmode.participant-intel-ui.js',['describeProgramFilter']);
test('while the other pages load, the filter bar says so',()=>{
 assert.equal(pfl.describeProgramFilter('Biotechnology',0,0,68,false,true),'Showing 0 of the 68 students in Biotechnology. Loading the others from the other pages of this list.');
 assert.equal(pfl.describeProgramFilter('Biotechnology',68,0,68,false,true),'Showing the 68 students in Biotechnology.');
});
const {api: uh}=extractFunctions('darkmode.participant-intel-ui.js',['usersHeadingLabel']);
test('a filtered Users heading reads how many of the total are shown',()=>{
 assert.equal(uh.usersHeadingLabel('Users (786)',46),'Users (46 of 786)');
 assert.equal(uh.usersHeadingLabel('  Brugere\n (21) ',11),'Brugere (11 of 21)');
 assert.equal(uh.usersHeadingLabel('Users',3),'','no count, no label');
});
test('two features reading and saving participant data at once never drop each other\'s change',()=>{
 const store={};const pending=[];
 const deps={participantIntelStorageKey:'pi',
  storageLocalGet:(defaults,cb)=>{pending.push(()=>cb({pi:store.pi===undefined?null:JSON.parse(JSON.stringify(store.pi))}));},
  storageLocalSet:(obj)=>{store.pi=JSON.parse(JSON.stringify(obj.pi));}};
 const core=extractFunctions('darkmode.participant-intel-core.js',['loadParticipantIntel','saveParticipantIntel','runNextParticipantIntelLoad','readParticipantIntelResult'],{
  prelude:'var participantIntelLoadQueue=[],participantIntelLoadBusy=false;',
  globals:{getDeps:()=>deps,dedupeParticipantIntelData:()=>false}}).api;
 core.loadParticipantIntel(intel=>{intel.students.s123456={name:'A'};core.saveParticipantIntel(intel);});
 core.loadParticipantIntel(intel=>{intel.retention.c=[{count:42}];core.saveParticipantIntel(intel);});
 while(pending.length)pending.shift()();
 assert.ok(store.pi.students.s123456,'the student is kept');
 assert.equal(store.pi.retention.c.length,1,'the retention reading is kept');
});

test('archive backfill reads fetched pages with the one shared participant parser', () => {
    const src = readFileSync(new URL('../darkmode.participant-intel-backfill.js', import.meta.url), 'utf8');
    assert.doesNotMatch(src, /\.ui-participant-additional|\\\(\(\\d\+\)\\\)/, 'no second copy of the list parser or count regex');
    const doc = { tag: 'archived page' };
    let seen = null;
    const { api } = extractFunctions('darkmode.participant-intel-backfill.js', ['parseParticipantListFromDoc'], {
        globals: { getDeps: () => ({ parseParticipantList: (d) => { seen = d; return [{ sNumber: 's123456' }]; } }) }
    });
    assert.equal(api.parseParticipantListFromDoc(doc).length, 1);
    assert.equal(seen, doc, 'the fetched document, not the live page, is parsed');
});
