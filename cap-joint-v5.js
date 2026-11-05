(function(G){'use strict';
const F=(k,label,min,max,step=.1,visible)=>({key:'cf_'+k,label,unit:'mm',type:'range',min,max,hardMin:min,step,...(visible?{visible}:{})});
const washers=s=>s.cf_washers==='two';
const fields=[{key:'cf_layout',label:'Cap fastening arrangement',type:'select',options:[{id:'',name:'Choose explicitly'},{id:'pair',name:'Symmetric through-fastener pair — unthreaded prototype'}]},F('spacing','Fastener centre spacing across cap',2,300),F('offsetX','Fastener axial offset from rod centre',-100,100),F('padHalfZ','Supporting pad half-width across cap',1,100),F('padHalfY','Supporting pad half-height along rod',1,100),F('holeD','Round through-hole diameter',1,40),F('shankD','Unthreaded shank diameter',1,40),F('shankL','Under-head shank length',2,300),F('headAF','Hex head across flats',2,80),F('headH','Hex head height',1,50),F('nutAF','Nut blank across flats',2,80),F('nutH','Nut blank height',1,50),F('nutBore','Unthreaded nut blank bore diameter',1,45),F('minLand','Minimum hole-to-bore / outer-edge ligament',.1,20),F('minSeat','Minimum material beyond seat envelope',.1,20),F('minProtrusion','Minimum shank projection beyond nut blank',0,50),{key:'cf_washers',label:'Washer selection',type:'select',options:[{id:'',name:'Choose explicitly'},{id:'none',name:'No washers'},{id:'two',name:'One washer under head and nut, per fastener'}]},F('washerOD','Washer outside diameter',2,100,.1,washers),F('washerID','Washer inside diameter',1,80,.1,washers),F('washerT','Washer thickness',.1,15,.1,washers),{key:'cf_boltMat',label:'Bolt envelope material',type:'material',role:'fastener'},{key:'cf_nutMat',label:'Nut blank material',type:'material',role:'fastener'},{key:'cf_washerMat',label:'Washer material',type:'material',role:'fastener',visible:washers}];
fields.push({...F('headClock','Head clock angle',-360,360,1),unit:'°'},{...F('nutClock','Nut clock angle',-360,360,1),unit:'°'});
function inspect(s){
 if(s.cf_layout!=='pair')throw Error('Choose the supported symmetric through-fastener pair; other joint types are not implemented');
 if(!['none','two'].includes(s.cf_washers))throw Error('Explicitly choose washers or no washers');
 for(const f of fields){if(f.visible&&!f.visible(s))continue;const v=s[f.key];if(f.type==='range'&&(!Number.isFinite(v)||v<f.min||v>f.max))throw Error('Missing or unsupported fastener dimension: '+f.label);if(f.type==='material'&&(typeof v!=='string'||!v))throw Error('Explicit material required: '+f.label);}
 const L=s.rod,W=s.rd_bigWidth,ri=s.rd_bigID/2,R=s.rd_bigOD/2,Z=s.cf_spacing/2,H=s.cf_padHalfY,rh=s.cf_holeD/2,x=s.cf_offsetX,wt=washers(s)?s.cf_washerT:0;
 if(![L,W,ri,R].every(v=>Number.isFinite(v)&&v>0))throw Error('Rod dimensions must be specified first');
 if(H>=R)throw Error('Prototype supports pads shorter than the circular big-end radius; alternate pad/beam blending is not implemented');
 if(s.cf_holeD<s.cf_shankD)throw Error('Shank envelope intersects its selected round clearance hole');
 if(s.cf_nutBore<s.cf_shankD)throw Error('Nut blank bore intersects shank envelope; threaded engagement is not yet modelled');
 if(s.cf_nutBore>=s.cf_nutAF)throw Error('Nut blank has no continuous material around its bore');
 if(Z-rh-ri<s.cf_minLand)throw Error('Fastener hole approaches or intersects the bearing bore beyond the specified ligament');
 if(W/2-Math.abs(x)-rh<s.cf_minLand||s.cf_padHalfZ-rh<s.cf_minLand)throw Error('Insufficient material beside the fastener hole');
 if(s.cf_padHalfZ>=Z)throw Error('Opposite supporting pads overlap the central bearing region in this construction');
 if(washers(s)){if(s.cf_washerID<s.cf_shankD||s.cf_washerID>=s.cf_washerOD)throw Error('Invalid washer opening or outside diameter');if(s.cf_washerID>=Math.min(s.cf_headAF,s.cf_nutAF))throw Error('Washer opening exceeds the supported head/nut inscribed seat');}
 const seatR=Math.max(s.cf_headAF/Math.sqrt(3),s.cf_nutAF/Math.sqrt(3),washers(s)?s.cf_washerOD/2:0),boreAtSeat=Math.sqrt(Math.max(0,ri*ri-H*H));
 if(s.cf_padHalfZ-seatR<s.cf_minSeat||W/2-Math.abs(x)-seatR<s.cf_minSeat||Z-seatR-boreAtSeat<s.cf_minSeat)throw Error('Head/nut/washer seat extends beyond its supporting material or into the bore');
 const needed=2*H+2*wt+s.cf_nutH+s.cf_minProtrusion;
 if(s.cf_shankL<needed)throw Error('Shank is too short for the selected pad, washer, nut and projection stack');
 const headSeat=-L-H-wt,nutBottom=-L+H+wt,notes=['Head/shank and nut are unthreaded envelopes, not complete fasteners. No thread engagement, preload, bolt stretch, joint strength or operating approval.'];
 if(s.cf_holeD===s.cf_shankD)notes.push('Zero nominal through-hole clearance; assembly and operation are unverified.');
 if(s.rd_capGap>0)notes.push('Cap has a positive parting gap; nominal contact is unseated.');
 notes.push('Fillets, stress concentrations, counterweight clearance and full-cycle collisions remain unverified.');
 return{L,W,ri,R,Z,H,rh,x,wt,seatR,boreAtSeat,headSeat,nutBottom,requiredShankLength:needed,shankProjection:s.cf_shankL-(2*H+2*wt+s.cf_nutH),holeLigament:Z-rh-ri,threadedJointComplete:false,notes};
}
function modify(s,d){const f=inspect(s),originalBody=d.body,originalCap=d.cap;
 const shared=(x,y,z,base,isCap)=>{const pad=Math.max(Math.abs(x)-f.W/2,Math.abs(y+f.L)-f.H,Math.abs(Math.abs(z)-f.Z)-s.cf_padHalfZ),split=isCap?y+f.L+s.rd_capGap/2:-f.L+s.rd_capGap/2-y;
  const merged=Math.min(base(x,y,z),Math.max(pad,split)),bore=Math.max(Math.hypot(y+f.L,z)-f.ri,Math.abs(x)-(f.W/2+1));
  const holes=Math.min(Math.hypot(x-f.x,z-f.Z)-f.rh,Math.hypot(x-f.x,z+f.Z)-f.rh);
  return Math.max(merged,-bore,-holes);};
 const z=Math.max(Math.abs(d.bodyBounds[0][2]),f.Z+s.cf_padHalfZ+2);
 return{...d,fastening:f,body:(x,y,z)=>shared(x,y,z,originalBody,false),cap:(x,y,z)=>shared(x,y,z,originalCap,true),bodyBounds:[d.bodyBounds[0].map((v,i)=>i===2?-z:v),d.bodyBounds[1].map((v,i)=>i===2?z:v)],capBounds:[d.capBounds[0].map((v,i)=>i===2?-z:v),d.capBounds[1].map((v,i)=>i===2?z:v)]};
}
function hex(af,bore,height,clock,segments){const n=Math.max(12,Math.ceil(segments/6)*6),each=n/6,R=af/Math.sqrt(3),r=bore/2,positions=[],indices=[];
 const point=i=>{const face=Math.floor(i/each),u=(i%each)/each,a=clock+Math.PI/6+face*Math.PI/3,b=a+Math.PI/3;return[R*((1-u)*Math.cos(a)+u*Math.cos(b)),R*((1-u)*Math.sin(a)+u*Math.sin(b))];};
 if(r===0){for(let side=0;side<2;side++)for(let i=0;i<n;i++){const [y,z]=point(i);positions.push(side?height/2:-height/2,y,z);}positions.push(-height/2,0,0,height/2,0,0);for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(i,j,n+j,i,n+j,n+i,2*n,j,i,2*n+1,n+i,n+j);}return{positions,indices,method:'unthreaded-hex-envelope'};}
 for(let i=0;i<n;i++){const [y,z]=point(i),a=Math.atan2(z,y);for(const [x,Y,Z]of [[-height/2,r*Math.cos(a),r*Math.sin(a)],[-height/2,y,z],[height/2,y,z],[height/2,r*Math.cos(a),height/2? r*Math.sin(a):r*Math.sin(a)]])positions.push(x,Y,Z);}
 for(let i=0;i<n;i++)for(let k=0;k<4;k++){const a=4*i+k,b=4*i+(k+1)%4,c=4*((i+1)%n)+(k+1)%4,d=4*((i+1)%n)+k;indices.push(a,c,b,a,d,c);}return{positions,indices,method:'unthreaded-hex-envelope'};
}
function place(mesh,centre){for(let i=0;i<mesh.positions.length;i+=3){const [x,y,z]=mesh.positions.slice(i,i+3);mesh.positions[i]=centre[0]+y;mesh.positions[i+1]=centre[1]-x;mesh.positions[i+2]=centre[2]+z;}return mesh;}
function attach(){const P=G.EngineForgePistonGeometry;if(!P||P.capJointAttached)return;P.capJointAttached=true;const original=P.build;
 P.build=(s,q='draft')=>{const f=inspect(s),m=original(s,q),n={draft:48,medium:96,high:192}[q],add=(id,material,mesh,centre)=>m.parts.push({id,material,mesh:place(mesh,centre)});
 for(const side of [-1,1]){const z=side*f.Z,x=f.x;
 add('shankEnvelope'+side,s.cf_boltMat,P.cylinder(s.cf_shankD/2,0,s.cf_shankL,n),[x,f.headSeat+s.cf_shankL/2,z]);
 add('headEnvelope'+side,s.cf_boltMat,hex(s.cf_headAF,0,s.cf_headH,s.cf_headClock*Math.PI/180,n),[x,f.headSeat-s.cf_headH/2,z]);
 add('nutBlank'+side,s.cf_nutMat,hex(s.cf_nutAF,s.cf_nutBore,s.cf_nutH,s.cf_nutClock*Math.PI/180,n),[x,f.nutBottom+s.cf_nutH/2,z]);
 if(washers(s)){add('headWasher'+side,s.cf_washerMat,P.cylinder(s.cf_washerOD/2,s.cf_washerID/2,f.wt,n),[x,-f.L-f.H-f.wt/2,z]);add('nutWasher'+side,s.cf_washerMat,P.cylinder(s.cf_washerOD/2,s.cf_washerID/2,f.wt,n),[x,-f.L+f.H+f.wt/2,z]);}}
 m.fit.notes=[...(m.fit.notes||[]),...f.notes];m.fit.capFastening={holeLigament:f.holeLigament,requiredShankLength:f.requiredShankLength,projection:f.shankProjection,threadedJointComplete:false};m.coverage.capClearanceHolesPrototype=true;m.coverage.fastenerEnvelopesOnly=true;m.coverage.completeRod=false;return m;};}
function explicit(s){for(const f of fields){if(f.visible&&!f.visible(s))continue;if(!G.EngineForgeExplicit.selected(s,f.key)||s[f.key]===null)throw Error('Explicit input missing: '+f.label);}}
function register(M){if(M.ui.GROUPS.some(g=>g.id==='capFastening'))return;for(const f of fields)M.catalog.BASE_SPEC[f.key]=null;const g={id:'capFastening',title:'Cap fastening interfaces',visible:s=>!M.catalog.isEV(s)&&!M.catalog.isRotary(s),blurb:'Run 5: paired round holes, pads and unthreaded head/nut/washer envelopes. Threaded joint and load behaviour are not complete.',fields};M.ui.GROUPS.push(g);M.ui.GROUP_LIST.push(g);}
G.EngineForgeCapJoint={fields,inspect,modify,hex,place,explicit,register};attach();if(typeof __M!=='undefined')register(__M);if(typeof module!=='undefined')module.exports=G.EngineForgeCapJoint;
})(typeof window==='undefined'?globalThis:window);
