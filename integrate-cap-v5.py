from pathlib import Path
import json,re,subprocess,tempfile
path=Path('index.html');html=path.read_text();marker='<!-- EF_CAP_RUN5 -->'
if marker in html:
    print('Cap run 5 already embedded.')
    raise SystemExit(0)
if '<!-- EF_ROD_RUN4 -->' not in html:raise ValueError('Run 4 must be integrated first')
oldRod=Path('rod-v4.js').read_text();newRod=oldRod
anchor='return{...d,body,cap,bodyBounds:[[-width/2,-L-2,-z],[width/2,E+2,z]],capBounds:[[-width/2,-L-R-2,-z],[width/2,-L+2,z]]};'
replacement='const result={...d,body,cap,bodyBounds:[[-width/2,-L-2,-z],[width/2,E+2,z]],capBounds:[[-width/2,-L-R-2,-z],[width/2,-L+2,z]]};return G.EngineForgeCapJoint?G.EngineForgeCapJoint.modify(s,result):result;'
if newRod.count(anchor)!=1:raise ValueError('Rod solid factory anchor mismatch')
newRod=newRod.replace(anchor,replacement,1)
a='Cap is shown without bolts or dowels. Beam/eye fillets, fastener holes, oilways, moving clearances, shell backing layers and load calculations are incomplete.'
b='Fastener holes/envelopes are supplied only when the cap-joint module is active. Thread engagement, dowels, beam/eye fillets, oilways, moving clearances, shell backing layers and load calculations remain incomplete.'
if newRod.count(a)!=1:raise ValueError('Rod disclaimer anchor mismatch')
newRod=newRod.replace(a,b,1)
oldUI=Path('piston-preview.js').read_text();newUI=oldUI
edits=[('fields.concat(G.EngineForgeSmallEnd?.fields||[],G.EngineForgeRod?.fields||[])','fields.concat(G.EngineForgeSmallEnd?.fields||[],G.EngineForgeRod?.fields||[],G.EngineForgeCapJoint?.fields||[])'),('if(G.EngineForgeRod)G.EngineForgeRod.explicit(s);','if(G.EngineForgeRod)G.EngineForgeRod.explicit(s);if(G.EngineForgeCapJoint)G.EngineForgeCapJoint.explicit(s);'),('Rod body, split cap and plain shell pair are shown as prototypes; bolts, oilways and load verification remain absent.','Pads, clearance holes and unthreaded fastener envelopes are shown as prototypes. Threads, oilways and joint load verification remain absent.'),('Piston + rod prototype; full engine remains blocked.','Piston + rod/cap-interface prototype; full engine remains blocked.'),("new T.MeshPhysicalMaterial({color:colour,metalness:","new T.MeshPhysicalMaterial({flatShading:p.mesh.method==='unthreaded-hex-envelope',color:colour,metalness:")]
for a,b in edits:
    if newUI.count(a)!=1:raise ValueError('Preview anchor mismatch: '+a)
    newUI=newUI.replace(a,b,1)
for old,new in [(oldRod,newRod),(oldUI,newUI)]:
    if html.count(old)!=1:raise ValueError('Embedded module mismatch')
    html=html.replace(old,new,1)
kernel=Path('piston-geometry.js').read_text();small=Path('small-end-v3.js').read_text();cap=Path('cap-joint-v5.js').read_text()
worker=json.dumps(kernel+'\n'+small+'\n'+oldRod)
if html.count(worker)!=1:raise ValueError('Worker source anchor mismatch')
html=html.replace(worker,json.dumps(kernel+'\n'+small+'\n'+newRod+'\n'+cap),1)
main='__M["main"] = (function () {'
if html.count(main)!=1:raise ValueError('Main module anchor mismatch')
html=html.replace(main,cap+'\n'+main,1).replace('</head>',marker+'\n</head>',1)
scripts=re.findall(r'<script\b[^>]*>([\s\S]*?)</script\s*>',html,re.I)
if not scripts:raise ValueError('No inline scripts')
with tempfile.TemporaryDirectory() as d:
    for i,s in enumerate(scripts):
        f=Path(d)/f'check-{i}.js';f.write_text(s);subprocess.run(['node','--check',str(f)],check=True)
path.write_text(html);Path('rod-v4.js').write_text(newRod);Path('piston-preview.js').write_text(newUI)
print('Cap interface prototype embedded; unthreaded envelopes only, full-engine gate retained.')
