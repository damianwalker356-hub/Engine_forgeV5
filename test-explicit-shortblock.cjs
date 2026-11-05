const a=require('node:assert/strict'),S=require('./explicit-shortblock.js');let checks=0;const t=f=>{f();checks++;};
function filled(){const s={bore:86,rod:139,stroke:86,pistonMat:'al2618',pinMat:'s8620',ringCoat:'chrome',sb_ringMat:'gci30',sb_clipMat:'s9254',sb_pistonHeight:60,sb_compressionHeight:32,sb_clearance:.08,sb_crown:6,sb_skirtWall:5,sb_pinOD:20,sb_pinID:12,sb_pinLength:55,sb_ringCount:3,sb_ringTop:6,sb_ringHeight:1.2,sb_ringDepth:2,sb_ringLand:2,sb_ringGap:.4,sb_grooveClearance:.05,sb_pinBoreClearance:.015,sb_bossWall:4,sb_clipWire:1.5,sb_clipInset:2};s.enteredValues={};for(const k of [...S.FIELDS.map(f=>f.key),...S.REQUIRED])s.enteredValues[k]=JSON.stringify(s[k]);return s;}
t(()=>{const s=filled();a.equal(S.inspect(s).constructionReady,true);a.equal(S.inspect(s).fullEngineReady,false);});
t(()=>{const s=filled();delete s.enteredValues;a.ok(S.inspect(s).missing.length);a.throws(()=>S.construction(s));});
t(()=>{const s=filled();s.sb_pinID=22;a.ok(S.inspect(s).errors.some(e=>e.includes('inner diameter')));});
t(()=>{const s=filled();s.sb_pinID=Infinity;a.ok(S.inspect(s).errors.length);});
t(()=>{const s=filled();s.sb_ringCount=2.5;a.ok(S.inspect(s).errors.some(e=>e.includes('integer')));});
t(()=>{const s=filled();s.sb_compressionHeight=12;a.ok(S.inspect(s).errors.some(e=>e.includes('crown')));});
t(()=>{const s=filled();s.sb_pistonHeight=35;a.ok(S.inspect(s).errors.some(e=>e.includes('below')));});
t(()=>{const s=filled();s.sb_ringTop=30;a.ok(S.inspect(s).errors.some(e=>e.includes('overlaps')));});
t(()=>{const s=filled();s.sb_ringTop=60;a.ok(S.inspect(s).errors.some(e=>e.includes('past')));});
t(()=>{const s=filled();s.sb_ringDepth=6;a.ok(S.inspect(s).errors.some(e=>e.includes('wall')));});
t(()=>{const s=filled();s.sb_pinLength=3;a.ok(S.inspect(s).errors.some(e=>e.includes('clip')));});
t(()=>{const s=filled();s.rod=43;a.ok(S.inspect(s).errors.some(e=>e.includes('throw')));});
t(()=>{const s=filled();s.sb_clearance=90;a.ok(S.inspect(s).errors.some(e=>e.includes('positive')));});
t(()=>{const s=filled();s.sb_crown=null;a.ok(S.inspect(s).missing.length);});
t(()=>{const s=filled();s.sb_crown=7;a.equal(S.selected(s,'sb_crown'),false);});
t(()=>{const s=filled(),r=S.construction(s);a.equal(r.rings.length,3);a.equal(r.pin.innerRadius,6);a.equal(r.pin.length,55);a.equal(r.piston.outerRadius,42.96);a.equal(r.coverage.complete,false);a.equal(r.coverage.pinBoreCut,false);});
t(()=>{const s=filled(),r=S.construction(s);for(const ring of r.rings){a.ok(ring.sweep>0&&ring.sweep<2*Math.PI);a.ok(Math.abs((2*Math.PI-ring.sweep)*(ring.outerRadius+ring.innerRadius)/2-s.sb_ringGap)<1e-10);}a.ok(r.piston.profile.every(v=>v.every(Number.isFinite)));});
t(()=>{const s=filled(),r=S.construction(s);a.equal(r.retainingClips.centres[0][0],-r.retainingClips.centres[1][0]);});
t(()=>{const s=filled(),before=JSON.stringify(s);S.inspect(s);S.construction(s);a.equal(JSON.stringify(s),before);});
t(()=>{const f={key:'x',label:'X',type:'range',min:0},s={x:2,enteredValues:{x:'2'}};a.equal(S.active(s,[{fields:[f,f]}]).length,1);});
let seed=23;const rnd=()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
for(let i=0;i<1000;i++){const s=filled();s.sb_ringGap=.1+rnd()*.8;s.sb_clearance=.02+rnd()*.12;s.enteredValues.sb_ringGap=JSON.stringify(s.sb_ringGap);s.enteredValues.sb_clearance=JSON.stringify(s.sb_clearance);t(()=>{const q=S.construction(s);a.ok(q.rings.every(r=>r.outerRadius>r.innerRadius&&r.axialHeight>0));a.ok(q.piston.profile.every(v=>v.every(Number.isFinite)));});}
console.log(JSON.stringify({checks,failed:0}));
