(function(G){'use strict';
// Engine Forge placement + bend controls. Pure geometry/packaging: these sliders do not feed the dyno physics.
const D=Math.PI/180,clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),num=(v,d,a,b)=>{v=+v;return Number.isFinite(v)?clamp(v,a,b):d;};
const V={add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],mul:(a,k)=>[a[0]*k,a[1]*k,a[2]*k],dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],len:a=>Math.hypot(a[0],a[1],a[2]),norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l];}};
function rot(v,axis,ang){const k=V.norm(axis),c=Math.cos(ang),s=Math.sin(ang),kv=V.cross(k,v),kd=V.dot(k,v);return[0,1,2].map(i=>v[i]*c+kv[i]*s+k[i]*kd*(1-c));}
// One circular bend between fixed end points. bend = deflection angle in degrees; swing 0 = bulge up, 180 = down.
function bendPath(A,B,bendDeg,swingDeg,radius){
 const AB=V.sub(B,A),L=V.len(AB),th=clamp(+bendDeg||0,0,150)*D;
 if(!(L>1e-6)||th<1e-3)return[A.slice(),B.slice()];
 const u=V.mul(AB,1/L);let ref=V.sub([0,1,0],V.mul(u,u[1]));if(V.len(ref)<1e-3)ref=V.sub([1,0,0],V.mul(u,u[0]));
 const n=rot(V.norm(ref),u,(+swingDeg||0)*D),C=V.add(V.add(A,V.mul(AB,.5)),V.mul(n,L/2*Math.tan(th/2)));
 const l1=V.len(V.sub(C,A)),l2=V.len(V.sub(B,C)),d1=V.norm(V.sub(C,A)),d2=V.norm(V.sub(B,C));
 let R=Math.max(1,+radius||1),t=R*Math.tan(th/2);const tMax=.45*Math.min(l1,l2);if(t>tMax){t=tMax;R=t/Math.tan(th/2);}
 const P1=V.sub(C,V.mul(d1,t)),P2=V.add(C,V.mul(d2,t)),axis=V.norm(V.cross(d1,d2)),O=V.add(P1,V.mul(V.norm(V.sub(d2,d1)),R)),r0=V.sub(P1,O),steps=Math.max(4,Math.ceil(th/(6*D))),pts=[A.slice(),P1];
 for(let i=1;i<steps;i++)pts.push(V.add(O,rot(r0,axis,th*i/steps)));pts.push(P2,B.slice());return pts;
}
const deflection=p=>{const a=V.norm(V.sub(p[1],p[0])),b=V.norm(V.sub(p.at(-1),p.at(-2)));return Math.acos(clamp(V.dot(a,b),-1,1))/D;};
const pathLen=p=>p.slice(1).reduce((s,q,i)=>s+V.len(V.sub(q,p[i])),0);
const DEFAULTS={plenumX:0,plenumY:0,plenumZ:0,collectorX:0,collectorY:0,collectorZ:0,boostX:0,boostY:0,boostZ:0,boostYaw:0,turboGap:0,icX:0,icY:0,icZ:0,bendRunner:30,swingRunner:0,bendPrimary:50,swingPrimary:180,bendFeed:30,swingFeed:0,bendDown:60,swingDown:180,bendCharge:40,swingCharge:0,bendBoost:25,swingBoost:0,bendRadius:2.5,runnerDia:0,primaryDia:0,chargeDia:0,downDia:0};
const PLUMB=/^(plenum|runner|primary|collector|turbine|compressor|filter|blower|charge|boost|icIn|intercooler|turbineFeed|downpipe|airInlet)/;
const sideSign=a=>Math.sin(a)<-1e-6?-1:1,toWorld=(a,p)=>[p[0],p[1]*Math.cos(a)-p[2]*Math.sin(a),p[1]*Math.sin(a)+p[2]*Math.cos(a)];
function rebuild(plan,spec,C,K){
 if(!plan||plan.kind!=='recip'||!plan.cyls)return plan;
 const p={...plan,parts:plan.parts.filter(q=>!PLUMB.test(q.id)),links:[],notes:[...(plan.notes||[])]},B=plan.B,nb=plan.nb||1,g=plan.g;
 const S=k=>num(spec[k],DEFAULTS[k],-5000,5000),ang=Array.from({length:nb},(_,b)=>plan.cyls.find(c=>c.bankIdx===b)?.ang||0),sg=ang.map(sideSign),W=(b,q)=>toWorld(ang[b],q);
 const add=q=>{q.mat=C.mat(spec,q.slot);q.massKg=K.massKg(q.shape,q.mat);p.parts.push(q);return q;};
 const bendR=clamp(S('bendRadius'),1,6),hy=plan.deck+1.6+.3*B,asp=C.byId(C.ASPIRATION,spec.aspiration),turbo=asp.kind==='turbo',boosted=asp.kind!=='na',itb=spec.intake==='itb';
 const hd=C.byId(C.HEADERS,spec.header),primL={long:600,short:300,race:650,open:180,cast:140,chamber:450}[hd.id]||300,runnerLen=Math.max(60,spec.runner||300);
 const rd=S('runnerDia')>0?clamp(S('runnerDia'),10,300):clamp(spec.ivd*.85,20,B),ed=S('primaryDia')>0?clamp(S('primaryDia'),10,300):clamp(spec.evd*.9,20,B);
 const chargeD=S('chargeDia')>0?clamp(S('chargeDia'),10,300):2*Math.max(15,spec.ivd*.55),downD=S('downDia')>0?clamp(S('downDia'),10,300):0;
 const pipe=(id,name,group,A,Bp,dia,bend,swing,ex)=>{const pts=bendPath(A,Bp,bend,swing,bendR*dia),role=group==='Exhaust'?'exhaust':'intake';
  const q=add({id,name,group,slot:group==='Exhaust'?'exManMat':'intakeManMat',frame:'root',role,pos:[0,0,0],explode:ex||[0,.6*B,group==='Exhaust'?2*B:-2*B],shape:{t:'path',pts,ro:dia/2+2.5,ri:dia/2},lenMm:pathLen(pts),illustrative:true,bendDeg:clamp(+bend||0,0,150)});
  p.links.push({id,a:A.slice(),b:Bp.slice()});return q;};
 if(g.layout.radial||nb>4){
  for(const c of plan.cyls){const b=c.bankIdx,s0=sg[b],x=plan.xOf(c);pipe('primary'+(c.idx+1),'Exhaust primary '+(c.idx+1),'Exhaust',W(b,[x,hy,s0*.7*B]),W(b,[x,hy-.1*B,s0*(B+60)]),ed,0,0);}
  p.notes.push('Many-bank / radial layout: intake, boost plumbing and bend sliders are not drawn.');return p;}
 const bank=[],plen=[];
 for(let b=0;b<nb;b++){
  const mine=plan.cyls.filter(c=>c.bankIdx===b);if(!mine.length)continue;const xs=mine.map(plan.xOf),xa=Math.min(...xs)-plan.pitch/2,xb=Math.max(...xs)+plan.pitch/2,xc=(xa+xb)/2,s0=sg[b],plenL=xb-xa,plenD=Math.sqrt(4*1.3*(g.vd_cc/nb)*1000/(Math.PI*plenL));
  const zEnd=.7*B+runnerLen*.62,yEnd=plan.headTop+.15*B+plenD/2,cen=itb?[xc+S('plenumX'),hy+.2*B+S('plenumY'),-s0*(.95*B+70+S('plenumZ'))]:[xc+S('plenumX'),yEnd+S('plenumY'),-s0*(zEnd+plenD*.25+S('plenumZ'))];
  const pr=itb?.55*B:plenD/2+2.5,hasBox=!itb||boosted;let ends=[];
  for(const c of mine){const x=plan.xOf(c),A=W(b,[x,hy,-s0*.7*B]),end=itb&&!boosted?[x,hy+.2*B,-s0*(.95*B+70)]:itb?[x,cen[1],cen[2]+s0*pr*.85]:[x,cen[1],cen[2]+s0*pr*.85];
   ends.push(end);pipe('runner'+(c.idx+1),itb?'Throttle body '+(c.idx+1):'Intake runner '+(c.idx+1),'Intake',A,W(b,end),rd,S('bendRunner'),S('swingRunner'),(()=>{const e=W(b,[0,.5*B,-1.6*B*s0]);return[e[0],e[1],e[2]];})());}
  if(hasBox){const q=add({id:'plenum'+b,name:itb?'Sealed ITB airbox '+(b+1):nb>1?'Intake plenum (bank '+(b+1)+')':'Intake plenum',group:'Intake',slot:'intakeManMat',frame:'bank:'+b,role:'intake',pos:cen,explode:[0,.6*B,-2.4*B*s0],shape:{t:'capsule',r:pr,len:plenL},orient:'x',illustrative:true});
   plen.push({b,center:W(b,cen),port:W(b,[cen[0]+Math.max(plenL,2*pr+1)/2,cen[1],cen[2]])});}
  const yc=hy-.45*B,zc=.7*B+primL*.7,C0=W(b,[xc+S('collectorX'),yc+S('collectorY'),s0*(zc+S('collectorZ'))]),C1=W(b,[xc+S('collectorX'),yc+S('collectorY'),s0*(zc+S('collectorZ')+90)]);
  for(const c of mine)pipe('primary'+(c.idx+1),'Exhaust primary '+(c.idx+1),'Exhaust',W(b,[plan.xOf(c),hy,s0*.7*B]),C0,ed,S('bendPrimary'),S('swingPrimary'));
  const cr=ed*Math.min(1.6,.6+.2*mine.length);pipe('collector'+b,nb>1?'Exhaust collector (bank '+(b+1)+')':'Exhaust collector','Exhaust',C0,C1,cr,0,0);bank.push({b,end:C1,cr});}
 if(!boosted||!plen.length)return p;
 const mean=vs=>[0,1,2].map(i=>vs.reduce((s,v)=>s+v[i],0)/vs.length),base=mean(plen.map(q=>q.center)),rear=Math.max(...plen.map(q=>q.port[0])),inletD=chargeD;
 const yawNode=(q,y)=>{q.yaw=y*D;return q;};
 if(!turbo){
  const xs=plan.cyls.map(plan.xOf),xc=(Math.min(...xs)+Math.max(...xs))/2,w=Math.max(B,plan.perBank*plan.pitch*.7),h=B*.75,d=B*1.1,yaw=S('boostYaw'),ctr=[xc+S('boostX'),Math.max(...plen.map(q=>q.center[1]))+B+S('boostY'),base[2]+S('boostZ')];
  yawNode(add({id:'blower',name:asp.name+' (illustrative housing)',group:'Forced induction',slot:'intakeManMat',frame:'root',role:'intake',pos:ctr,explode:[0,2*B,0],shape:{t:'box',w,h,d,round:B*.1},illustrative:true}),yaw);
  plen.forEach((q,i)=>{const sd=q.center[2]<ctr[2]?-1:1,out=V.add(ctr,rot([0,-h/2,sd*d*.22],[0,1,0],yaw*D));pipe('blowerOutlet'+i,'Blower outlet to bank '+(i+1),'Intake',out,q.port,inletD,S('bendBoost'),S('swingBoost'));});
  const inA=V.add(ctr,rot([-w/2,0,0],[0,1,0],yaw*D));pipe('blowerInlet','Supercharger inlet','Intake',inA,V.add(inA,rot([-B,0,0],[0,1,0],yaw*D)),inletD,0,0);
  p.notes.push('Supercharger housing and ducts are illustrative; pulley drive and type-specific internals are not modelled.');return p;}
 const td=spec.turboSize,rt=td*.9,rc=td*.85,ht=td*1.1,hc=td*.9,yaw=S('boostYaw')*D;let count=Math.max(1,Math.round(asp.units||1));if(['seq','compound'].includes(spec.aspiration))count=2;
 const clusters=[];
 for(let i=0;i<count;i++){const ci=i%bank.length,x=rear+td*2.1+B+Math.floor(i/bank.length)*(td*3+S('turboGap'))+S('boostX'),z=(count===1?base[2]:bank[ci].end[2])+S('boostZ'),y=base[1]+S('boostY'),O=[x,y,z];
  const at=v=>V.add(O,rot(v,[0,1,0],yaw)),T=at([0,0,ht/2+6]),Cc=at([0,0,-hc/2-6]),hot=at([-rt,0,ht/2+6]),cold=at([-rc,0,-hc/2-6]),outT=at([0,0,ht/2+6+ht*.8]),inC=at([0,0,-hc/2-6-hc*.8]);
  for(const [id,name,pos,r,h,k,o,slot,ex]of[['turbine','Turbine housing',T,rt,ht,'t','z','turbineMat',B],['compressor','Compressor housing',Cc,rc,hc,'c','-z','intakeManMat',-B]])
   yawNode(add({id:id+i,name:name+' '+(i+1),group:'Forced induction',slot,frame:'root',role:'turbo',pos,explode:[0,B,ex],shape:{t:'turbo',r,h,kind:k},orient:o,illustrative:true}),S('boostYaw'));
  const src=bank.filter((_,j)=>count===1||j%count===i||count>bank.length&&j===ci);
  for(const q of src)pipe('turbineFeed'+i+'_'+q.b,'Collector '+(q.b+1)+' to turbine '+(i+1),'Exhaust',q.end,hot,q.cr*2,S('bendFeed'),S('swingFeed'),[0,.8*B,3*B]);
  pipe('downpipe'+i,'Turbine downpipe '+(i+1),'Exhaust',outT,V.add(outT,rot([B,-2.2*B,2.5*B],[0,1,0],yaw)),downD||rt*.8,S('bendDown'),S('swingDown'),[0,-B,3*B]);
  pipe('airInlet'+i,'Compressor air inlet '+(i+1),'Intake',inC,V.add(inC,rot([0,0,-B],[0,1,0],yaw)),rc*.7,0,0);clusters.push({cold});}
 const junction=[rear+B*.45,base[1]+B*.6,base[2]];clusters.forEach((q,i)=>pipe('charge'+i,'Compressor charge pipe '+(i+1),'Intake',q.cold,junction,inletD,S('bendCharge'),S('swingCharge'),[0,1.2*B,-3*B]));
 let out=junction;const ic=C.byId(C.INTERCOOLERS,spec.intercooler);
 if(ic&&ic.id!=='none'){const ctr=[junction[0]+S('icX'),junction[1]+B+S('icY'),junction[2]+S('icZ')],sz={w:B*1.4,h:B*.7,d:B*1.4,round:8};
  add({id:'intercooler',name:'Intercooler',group:'Intake',slot:'intakeManMat',frame:'root',role:'intake',pos:ctr,explode:[0,B,0],shape:{t:'box',...sz},illustrative:true});
  pipe('icIn','Intercooler inlet','Intake',junction,[ctr[0],ctr[1]-sz.h/2,ctr[2]],inletD,S('bendCharge'),S('swingCharge'));out=[ctr[0],ctr[1]+sz.h/2,ctr[2]];}
 plen.forEach((q,i)=>pipe('boost'+i,'Boost pipe to bank '+(i+1),'Intake',out,q.port,inletD,S('bendBoost'),S('swingBoost'),[0,1.2*B,-3*B]));
 if(['seq','compound','twinch','etc'].includes(spec.aspiration))p.notes.push('Complex staged/twincharged routing is simplified to parallel turbo ducts in this viewer.');
 return p;}
const fld=(key,label,unit,min,max,step,extra={})=>({key,label,unit,type:'range',min,max,step,hardMin:extra.hardMin??-5000,...extra});
function groups(C){
 const piston=s=>!C.isEV(s)&&!C.isRotary(s),boosted=s=>piston(s)&&s.aspiration!=='na',turbo=s=>piston(s)&&C.isTurbo(s),ic=s=>boosted(s)&&s.intercooler!=='none';
 const axis=' X is along the crank (+ toward the rear), Y is up.';
 return[{id:'placement',title:'Placement',visible:piston,blurb:'Move manifolds and boost hardware. Connected pipes follow automatically.',fields:[
  fld('plenumX','Intake manifold: along crank','mm',-300,300,1,{help:'Moves each bank\'s plenum along the engine.'+axis}),fld('plenumY','Intake manifold: height','mm',-150,300,1),fld('plenumZ','Intake manifold: away from head','mm',-100,300,1,{help:'Positive moves the plenum farther from the cylinder head.'}),
  fld('collectorX','Header collector: along crank','mm',-300,500,1),fld('collectorY','Header collector: height','mm',-300,300,1),fld('collectorZ','Header collector: away from head','mm',-200,500,1),
  fld('boostX','Turbo / supercharger: forward-back','mm',-800,1500,1,{visible:boosted,help:'Positive moves it toward the rear.'}),fld('boostY','Turbo / supercharger: height','mm',-500,800,1,{visible:boosted}),fld('boostZ','Turbo / supercharger: sideways','mm',-800,800,1,{visible:boosted}),
  fld('boostYaw','Turbo / supercharger: rotation','°',-180,180,1,{visible:boosted,hardMin:-360}),fld('turboGap','Spacing between turbos','mm',0,600,1,{visible:turbo,hardMin:0}),
  fld('icX','Intercooler: forward-back','mm',-800,800,1,{visible:ic}),fld('icY','Intercooler: height','mm',-500,800,1,{visible:ic}),fld('icZ','Intercooler: sideways','mm',-800,800,1,{visible:ic})]},
 {id:'pipes',title:'Pipes & Bends',visible:piston,blurb:'Set each pipe\'s elbow in degrees. Swing 0° bulges up, 180° bulges down, ±90° bulges sideways. End points stay connected.',fields:[
  fld('bendRunner','Intake runner bend','°',0,150,1,{hardMin:0}),fld('swingRunner','Intake runner swing','°',-180,180,1,{hardMin:-360}),
  fld('bendPrimary','Header primary bend','°',0,150,1,{hardMin:0}),fld('swingPrimary','Header primary swing','°',-180,180,1,{hardMin:-360}),
  fld('bendFeed','Collector-to-turbine bend','°',0,150,1,{visible:turbo,hardMin:0}),fld('swingFeed','Collector-to-turbine swing','°',-180,180,1,{visible:turbo,hardMin:-360}),
  fld('bendDown','Downpipe bend','°',0,150,1,{visible:turbo,hardMin:0}),fld('swingDown','Downpipe swing','°',-180,180,1,{visible:turbo,hardMin:-360}),
  fld('bendCharge','Charge pipe bend','°',0,150,1,{visible:turbo,hardMin:0}),fld('swingCharge','Charge pipe swing','°',-180,180,1,{visible:turbo,hardMin:-360}),
  fld('bendBoost','Boost pipe bend','°',0,150,1,{visible:boosted,hardMin:0}),fld('swingBoost','Boost pipe swing','°',-180,180,1,{visible:boosted,hardMin:-360}),
  fld('bendRadius','Bend radius','× diameter',1,6,.1,{hardMin:1,help:'Tighter bends use a smaller radius; very short pipes automatically use the largest radius that fits.'}),
  fld('runnerDia','Intake runner diameter (0 = auto)','mm',0,120,1,{hardMin:0}),fld('primaryDia','Header primary diameter (0 = auto)','mm',0,120,1,{hardMin:0}),fld('chargeDia','Charge / boost pipe diameter (0 = auto)','mm',0,160,1,{visible:boosted,hardMin:0}),fld('downDia','Downpipe diameter (0 = auto)','mm',0,160,1,{visible:turbo,hardMin:0})]}];}
function register(M){
 Object.assign(M.catalog.BASE_SPEC,DEFAULTS);
 const ui=M.ui,idx=ui.GROUPS.findIndex(g=>g.id==='aspiration'),at=idx<0?ui.GROUPS.length:idx+1,list=groups(M.catalog);
 if(ui.GROUPS.some(g=>g.id==='placement'))return;ui.GROUPS.splice(at,0,...list);
 const li=ui.GROUP_LIST.findIndex(g=>g.id==='aspiration');ui.GROUP_LIST.splice(li<0?ui.GROUP_LIST.length:li+1,0,...list);
 const K=M.e3dcore,orig=K.buildPlan;K.buildPlan=(spec,deps)=>rebuild(orig(spec,deps),spec,deps.C||M.catalog,K);
}
G.EFWorkshopPose=nodes=>{for(const n of nodes.values()){const y=n.userData.part.yaw;if(y)n.rotation.y=y;}};
G.EngineForgeWorkshop={install(){},register,bendPath,deflection,rebuild,DEFAULTS,groups};
try{if(typeof __M!=='undefined')register(__M);}catch(e){console.error('Placement controls failed to initialise',e);}
if(typeof module!=='undefined')module.exports=G.EngineForgeWorkshop;
})(typeof window==='undefined'?globalThis:window);
