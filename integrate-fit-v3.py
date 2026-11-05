from pathlib import Path
import json,re,subprocess,tempfile
htmlpath=Path('index.html');html=htmlpath.read_text();marker='<!-- EF_FIT_RUN3 -->'
if marker in html:
    print('Run 3 is already embedded; no change.')
    raise SystemExit(0)
if '<!-- EF_PISTON_RUN2 -->' not in html:raise ValueError('Run 2 must be integrated first')
paths=['piston-geometry.js','piston-preview.js','explicit-shortblock.js','test-piston-geometry.cjs','test-explicit-shortblock.cjs']
old={p:Path(p).read_text() for p in paths};new=dict(old)
def change(p,a,b):
    if new[p].count(a)!=1:raise ValueError('Missing/ambiguous replacement in '+p+': '+a)
    new[p]=new[p].replace(a,b,1)
k='piston-geometry.js'
change(k,"'sb_clipInset'","'sb_clipEndClearance'")
change(k,"if(k!=='sb_pinID'&&s[k]<=0)","if(k!=='sb_pinID'&&k!=='sb_clipEndClearance'&&s[k]<=0)")
change(k,"if(s.sb_pinID<0||s.sb_pinID>=s.sb_pinOD)","if(s.sb_clipEndClearance<0)throw Error('Clip end clearance must be nonnegative');if(s.sb_pinID<0||s.sb_pinID>=s.sb_pinOD)")
change(k,'clipX=s.sb_pinLength/2-s.sb_clipInset','clipX=s.sb_pinLength/2+s.sb_clipEndClearance+s.sb_clipWire/2')
change(k,'if(s.sb_clipMeanRadius-wr<s.sb_pinOD/2||s.sb_clipMeanRadius+wr>rb+s.sb_clipGrooveDepth)',"if(s.sb_clipMeanRadius-wr>=s.sb_pinOD/2||s.sb_clipMeanRadius+wr>rb+s.sb_clipGrooveDepth||s.sb_clipMeanRadius+wr<=rb)")
change(k,"throw Error('Clip cross-section does not fit the groove around the pin')","throw Error('Clip must project inside pin radius to retain it and engage the groove outside the bore')")
e='explicit-shortblock.js'
change(e,"F('clipInset','Pin end to retaining clip centre','mm',.1,30)","F('clipEndClearance','Pin end to clip axial clearance','mm',0,30)")
change(e,"if(has(['sb_pinLength','sb_clipInset'])&&2*s.sb_clipInset>=s.sb_pinLength)errors.push('Pin retaining-clip centres cross or coincide.');","if(has(['bore','sb_clearance','sb_pinLength','sb_clipWire','sb_clipEndClearance'])&&(s.sb_pinLength/2+s.sb_clipEndClearance+s.sb_clipWire>=(s.bore-s.sb_clearance)/2))errors.push('Retaining clip axial envelope extends beyond the piston radius.');")
change(e,'[-s.sb_pinLength/2+s.sb_clipInset,0,0],[s.sb_pinLength/2-s.sb_clipInset,0,0]','[-(s.sb_pinLength/2+s.sb_clipEndClearance+s.sb_clipWire/2),0,0],[s.sb_pinLength/2+s.sb_clipEndClearance+s.sb_clipWire/2,0,0]')
u='piston-preview.js'
change(u,'for(const f of fields){','for(const f of fields.concat(G.EngineForgeSmallEnd?.fields||[])){')
change(u,'worker=new Worker(url);','worker=new Worker(url);const jobWorker=worker;')
change(u,"timer=setTimeout(()=>{worker.terminate();status(","timer=setTimeout(()=>{jobWorker.terminate();if(id!==version)return;status(")
change(u,'worker.onerror=e=>{clearTimeout(timer);status','worker.onerror=e=>{if(id!==version)return;clearTimeout(timer);status')
change(u,'worker.onmessage=async e=>{clearTimeout(timer);worker.terminate();if(id!==version)return;','worker.onmessage=async e=>{jobWorker.terminate();if(id!==version)return;clearTimeout(timer);')
change(u,"triangles.toLocaleString()+' triangles. Piston-only prototype; full engine remains blocked.'","triangles.toLocaleString()+' triangles. Piston + small-end prototype; full engine remains blocked. '+(m.fit?m.fit.notes.join(' '):'')")
change(u,'Piston assembly preview — incomplete engine','Piston + small-end preview — incomplete engine')
change(u,'This shows only the specified piston, rings, wrist pin and clips.','This shows the specified piston, rings, wrist pin, clips, small-end eye and sleeve bushing. The rod beam and big end remain absent.')
change(u,"Generating piston-only mesh in a worker…","Generating piston + small-end mesh in a worker…")
for p in ['test-piston-geometry.cjs','test-explicit-shortblock.cjs']:change(p,'sb_clipInset:2','sb_clipEndClearance:.2')
change('test-piston-geometry.cjs','sb_clipMeanRadius:11','sb_clipMeanRadius:10.5')
change('test-piston-geometry.cjs','field.sdf(25.5,0,11)','field.sdf(28.45,0,11)')
change('test-explicit-shortblock.cjs','s.sb_pinLength=3;','s.sb_clipEndClearance=30;')
for p in ['explicit-shortblock.js','piston-geometry.js','piston-preview.js']:
    if html.count(old[p])!=1:raise ValueError('Embedded source mismatch: '+p)
    html=html.replace(old[p],new[p],1)
small=Path('small-end-v3.js').read_text()
needle=json.dumps(old[k])
if html.count(needle)!=1:raise ValueError('Worker kernel source mismatch')
html=html.replace(needle,json.dumps(new[k]+'\n'+small),1)
main='__M["main"] = (function () {'
if html.count(main)!=1:raise ValueError('Main module anchor mismatch')
html=html.replace(main,small+'\n'+main,1).replace('</head>',marker+'\n</head>',1)
scripts=re.findall(r'<script\b[^>]*>([\s\S]*?)</script\s*>',html,re.I)
if not scripts:raise ValueError('No inline scripts')
with tempfile.TemporaryDirectory() as d:
    for i,s in enumerate(scripts):
        f=Path(d)/f'check-{i}.js';f.write_text(s);subprocess.run(['node','--check',str(f)],check=True)
for p,text in new.items():Path(p).write_text(text)
htmlpath.write_text(html)
print('Run 3 embedded; clip retention corrected; small-end prototype added. Full-engine gate remains closed.')
