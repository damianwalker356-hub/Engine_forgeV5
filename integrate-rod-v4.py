from pathlib import Path
import json,re,subprocess,tempfile
path=Path('index.html');html=path.read_text();marker='<!-- EF_ROD_RUN4 -->'
if marker in html:
    print('Rod run 4 already embedded.')
    raise SystemExit(0)
if '<!-- EF_FIT_RUN3 -->' not in html:raise ValueError('Run 3 must be integrated first')
oldSmall=Path('small-end-v3.js').read_text();newSmall=oldSmall.replace('Rod beam, big-end, bolts, oilways, loaded deformation, lubrication and full-cycle collision checks remain incomplete.','Small-end fit alone does not certify the rod; loaded deformation, lubrication and full-cycle collision checks remain incomplete.')
if oldSmall==newSmall:raise ValueError('Small-end disclaimer anchor missing')
oldUI=Path('piston-preview.js').read_text();newUI=oldUI
edits=[('fields.concat(G.EngineForgeSmallEnd?.fields||[])','fields.concat(G.EngineForgeSmallEnd?.fields||[],G.EngineForgeRod?.fields||[])'),('G.EngineForgePistonGeometry.verify(s);',"G.EngineForgePistonGeometry.verify(s);if(G.EngineForgeRod)G.EngineForgeRod.explicit(s);"),('Piston + small-end preview — incomplete engine','Piston + connecting-rod prototype — incomplete engine'),('The rod beam and big end remain absent.','Rod body, split cap and plain shell pair are shown as prototypes; bolts, oilways and load verification remain absent.'),('Piston + small-end prototype; full engine remains blocked.','Piston + rod prototype; full engine remains blocked.'),('Generating piston + small-end mesh in a worker…','Generating piston + rod mesh in a worker…')]
for a,b in edits:
    if newUI.count(a)!=1:raise ValueError('Preview anchor mismatch: '+a)
    newUI=newUI.replace(a,b,1)
for old,new in [(oldSmall,newSmall),(oldUI,newUI)]:
    if html.count(old)!=1:raise ValueError('Embedded module differs from standalone source')
    html=html.replace(old,new,1)
kernel=Path('piston-geometry.js').read_text();rod=Path('rod-v4.js').read_text();worker=json.dumps(kernel+'\n'+oldSmall)
if html.count(worker)!=1:raise ValueError('Worker kernel anchor mismatch')
html=html.replace(worker,json.dumps(kernel+'\n'+newSmall+'\n'+rod),1)
main='__M["main"] = (function () {'
if html.count(main)!=1:raise ValueError('Main module anchor mismatch')
html=html.replace(main,rod+'\n'+main,1).replace('</head>',marker+'\n</head>',1)
scripts=re.findall(r'<script\b[^>]*>([\s\S]*?)</script\s*>',html,re.I)
if not scripts:raise ValueError('No inline scripts')
with tempfile.TemporaryDirectory() as d:
    for i,s in enumerate(scripts):
        f=Path(d)/f'check-{i}.js';f.write_text(s);subprocess.run(['node','--check',str(f)],check=True)
path.write_text(html);Path('small-end-v3.js').write_text(newSmall);Path('piston-preview.js').write_text(newUI)
print('Rod beam, cap and shell-pair prototype embedded. Complete-engine gate remains closed.')
