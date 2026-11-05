from pathlib import Path
import re,subprocess,tempfile
p=Path('index.html');html=p.read_text();js=Path('explicit-shortblock.js').read_text()
if '<!-- EF_EXPLICIT_RUN1 -->' not in html:
    edits=[('__M["main"] = (function () {',js+'\n__M["main"] = (function () {'),('window.__forge = state; // for QA','window.__forge = state; // for QA\nwindow.EngineForgeExplicit.install(__M,state);'),('</head>','<!-- EF_EXPLICIT_RUN1 -->\n</head>')]
    for old,new in edits:
        if html.count(old)!=1:raise ValueError('Missing/ambiguous integration anchor: '+old)
        html=html.replace(old,new,1)
scripts=re.findall(r'<script\b[^>]*>([\s\S]*?)</script\s*>',html,re.I)
if not scripts:raise ValueError('No inline scripts')
with tempfile.TemporaryDirectory() as d:
    for i,s in enumerate(scripts):
        f=Path(d)/f'check-{i}.js';f.write_text(s);subprocess.run(['node','--check',str(f)],check=True)
p.write_text(html)
print('Run 1 integrated; full-engine gate active, current incomplete models blocked.')
