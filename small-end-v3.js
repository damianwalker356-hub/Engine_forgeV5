(function(G){'use strict';
const F=(key,label,min,max,step=.01)=>({key:'se_'+key,label,unit:'mm',type:'range',min,max,hardMin:min,step});
const fields=[F('eyeWidth','Rod small-end eye axial width',1,200),F('eyeOD','Rod small-end eye outer diameter',2,250),F('eyeID','Rod small-end housing bore diameter',1,200),F('bushOD','Unloaded bushing outer diameter',1,200),F('bushID','Unloaded bushing inner diameter',1,200),F('bushWidth','Bushing axial width',1,200),F('minSide','Required minimum side clearance, each side',0,30,.001),F('minSupport','Required minimum pin engagement, each boss',.1,100),{key:'se_mode',label:'Small-end pin arrangement',type:'select',options:[{id:'',name:'Choose explicitly'},{id:'floating',name:'Floating pin with plain sleeve bushing (prototype)'}]},{key:'se_eyeMat',label:'Small-end eye material',type:'material',role:'rod'},{key:'se_bushMat',label:'Small-end bushing material',type:'material',role:'bearing'}];
function fit(s,quality='draft'){
 const keys=['se_eyeWidth','se_eyeOD','se_eyeID','se_bushOD','se_bushID','se_bushWidth','se_minSide','se_minSupport'];
 for(const k of keys)if(typeof s[k]!=='number'||!Number.isFinite(s[k])||s[k]<0||(k!=='se_minSide'&&s[k]===0))throw Error('Missing or invalid dimension: '+k);
 if(s.se_mode!=='floating')throw Error('Select the supported floating-pin arrangement; other arrangements are not yet modelled');
 const d=G.EngineForgePistonGeometry.verify(s),E=s.se_eyeOD/2,width=Math.max(s.se_eyeWidth,s.se_bushWidth),side=d.R>0?(2*s.sb_bossInnerX-width)/2:0;
 if(s.se_eyeID>=s.se_eyeOD)throw Error('Eye housing bore removes the entire small-end eye');
 if(s.se_bushID>=s.se_bushOD)throw Error('Bushing inner diameter must be smaller than outer diameter');
 if(s.se_bushOD>s.se_eyeOD)throw Error('Bushing outer diameter exceeds the entire eye outer diameter');
 const running=s.se_bushID-s.sb_pinOD,press=s.se_bushOD-s.se_eyeID;
 if(running<0)throw Error('Negative pin running clearance conflicts with the selected floating-pin arrangement');
 if(side< -1e-9)throw Error('Rod eye or bushing is wider than the space between piston bosses');
 if(side+1e-9<s.se_minSide)throw Error('Specified minimum rod side clearance is not met');
 const outerSupport=Math.sqrt(Math.max(0,d.R*d.R-d.rb*d.rb)),support=Math.min(s.sb_pinLength/2,outerSupport)-s.sb_bossInnerX;
 if(support+1e-9<s.se_minSupport)throw Error('Specified minimum pin engagement in each boss is not met');
 if(E>=d.top-s.sb_crown)throw Error('Eye envelope intersects the piston crown in this neutral pose');
 if(Math.hypot(width/2,E)>=d.R-s.sb_skirtWall)throw Error('Small-end eye envelope intersects the constant-wall piston interior');
 const notes=[];if(E>=-d.bot)notes.push('Eye extends below the skirt; lower-skirt and rod sweep require separate checks.');
 if(press>0)notes.push('Nominal press-fit interference '+press.toFixed(4)+' mm: unloaded geometry overlaps; elastic insertion and installed bushing ID are not solved.');
 if(press<0)notes.push('Bushing is loose in its housing; retention has not been specified.');
 if(running===0)notes.push('Zero nominal running clearance; running reliability is not established.');
 const step={draft:3,medium:1.5,high:.85}[quality];if(!step)throw Error('Unknown quality');
 const minFeature=Math.min(s.sb_ringHeight+s.sb_grooveClearance,s.sb_clipGrooveWidth,s.sb_clipGrooveDepth,s.sb_bossWall);
 if(minFeature<2*step)notes.push('Some solid features are narrower than two mesh cells and may not be resolved.');
 const pinRadial=s.sb_pinBoreClearance/2;
 if(step>=pinRadial)notes.push('Piston mesh grid is larger than pin radial clearance; rendered pin-to-piston clearance is unverified.');
 notes.push('Rod beam, big-end, bolts, oilways, loaded deformation, lubrication and full-cycle collision checks remain incomplete.');
 return{mode:'floating',pinRunningClearanceDiametral:running,pinToPistonClearanceDiametral:s.sb_pinBoreClearance,sideClearanceEach:side,pinEngagementEach:support,unloadedBushingInterferenceDiametral:press,clipClearanceEach:s.sb_clipEndClearance,retentionRadialOverlap:s.sb_pinOD/2-(s.sb_clipMeanRadius-s.sb_clipWire/2),gridStep:step,minimumSolidFeature:minFeature,installedPressFitSolved:false,meshClearanceCertified:false,completeRod:false,notes};
}
function attach(){const P=G.EngineForgePistonGeometry;if(!P||P.smallEndAttached)return;P.smallEndAttached=true;const original=P.build;
 P.build=(s,q='draft')=>{const report=fit(s,q),m=original(s,q),n={draft:48,medium:96,high:192}[q];
 m.parts.push({id:'smallEndEye',material:s.se_eyeMat,mesh:P.cylinder(s.se_eyeOD/2,s.se_eyeID/2,s.se_eyeWidth,n)},{id:'smallEndBushing',material:s.se_bushMat,mesh:P.cylinder(s.se_bushOD/2,s.se_bushID/2,s.se_bushWidth,n)});
 m.fit=report;m.coverage.smallEndEyePrototype=true;m.coverage.plainBushingPrototype=true;m.coverage.completeRod=false;m.warning+=' '+report.notes.join(' ');return m;};}
function register(M){if(M.ui.GROUPS.some(g=>g.id==='smallEndFit'))return;for(const f of fields)M.catalog.BASE_SPEC[f.key]=null;const g={id:'smallEndFit',title:'Rod eye & pin fit',visible:s=>!M.catalog.isEV(s)&&!M.catalog.isRotary(s),blurb:'Run 3: explicit floating-pin eye and sleeve-bushing dimensions. Nominal press-fit deformation is not solved.',fields};M.ui.GROUPS.push(g);M.ui.GROUP_LIST.push(g);}
G.EngineForgeSmallEnd={fields,fit,register};attach();if(typeof __M!=='undefined')register(__M);if(typeof module!=='undefined')module.exports=G.EngineForgeSmallEnd;
})(typeof window==='undefined'?globalThis:window);
