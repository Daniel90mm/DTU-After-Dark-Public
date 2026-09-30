import assert from 'node:assert/strict';
import test from 'node:test';
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
 const f=depsFixture();let cards=0;const {api}=extractFunctions('darkmode.participant-intel-ui.js',['renderParticipantDemographics'],{globals:{getDeps:()=>f.deps,renderDemographicsCard:()=>cards++,getCurrentCourseRetentionSnapshots:()=>[],buildRetentionRadarSummary:()=>null}});
 api.renderParticipantDemographics([{program:'Physics'}],{total:42,complete:true});f.flags.composition=false;f.resolve({self:null});assert.equal(cards,0);
});
test('disabling Shared Course History during a storage read prevents late annotations',()=>{
 const f=depsFixture();let reads=0;f.deps.getCampusnetUsersParticipantElements=()=>[{querySelector(){reads++;return null;}}];
 const {api}=extractFunctions('darkmode.participant-intel-ui.js',['annotateParticipantHistory'],{globals:{getDeps:()=>f.deps,getIsDark:()=>false,document:{querySelectorAll:()=>[]}}});
 api.annotateParticipantHistory();f.flags.history=false;f.resolve({self:null,students:{}});assert.equal(reads,0);
});
test('disabling Participant Intelligence during retention storage read prevents a new snapshot',()=>{
 const f=depsFixture();let renders=0;
 const {api}=extractFunctions('darkmode.participant-intel-ui.js',['recordRetentionSnapshot'],{prelude:'var retentionSnapshotInFlight=false;',globals:{getDeps:()=>f.deps,renderRetentionIndicator:()=>renders++,insertParticipantDemographics(){}}});
 api.recordRetentionSnapshot();f.flags.master=false;const intel={retention:{}};f.resolve(intel);assert.equal(f.saves,0);assert.equal(renders,0);assert.deepEqual(intel.retention,{});
});
test('retention stores at most one snapshot per six hours and caps history',()=>{
 const f=depsFixture();let renders=0;f.flags.composition=false;f.deps.participantIntelMaxRetention=2;
 const {api}=extractFunctions('darkmode.participant-intel-ui.js',['recordRetentionSnapshot'],{prelude:'var retentionSnapshotInFlight=false;',globals:{getDeps:()=>f.deps,renderRetentionIndicator:()=>renders++,insertParticipantDemographics(){}}});
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
  const {api}=extractFunctions('darkmode.js',['loadFeatureFlags','isFeatureFlagEnabled'],{prelude:'const FEATURE_FLAG_DEFAULTS={intel:false,gpa:true};let _featureFlags={},_featureFlagsLoaded=false;',globals:{getExtensionStorageArea:()=>null,storageLocalGet:(defaults,cb)=>cb('intel' in defaults?{intel:value,gpa:false}:{}),setFeatureFlagEnabled(){}}});
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
});
test('a group inside a course keeps its own Retention Radar series', () => {
    const course = hostFixture('/cnnet/element/876717/participants', [courseCrumb, ['List of participants', '/cnnet/element/876717/participants']]);
    assert.equal(course.getCampusnetRetentionKey(), '12106_E2026');
    const group = hostFixture('/cnnet/element/898571/participants', [courseCrumb, ['Materials for building construction-Building - Group 14', '/cnnet/element/index.aspx?elementid=898571'], ['List of participants', '/cnnet/element/898571/participants']]);
    assert.equal(group.getCampusnetRetentionKey(), '12106_E2026_el898571');
    assert.equal(hostFixture('/cnnet/element/1/participants', []).getCampusnetRetentionKey(), '');
});
