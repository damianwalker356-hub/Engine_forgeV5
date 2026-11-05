#!/usr/bin/env python3
"""Replace the first component workshop with the placement/bend controls inside the live simulator HTML."""
from pathlib import Path
import re, subprocess, sys, tempfile

MARK = '<!-- EF_PLACEMENT_V2 -->'
OLD_START = "(function(G){'use strict';\nconst cp=x=>JSON.parse(JSON.stringify(x))"
OLD_END = "})(typeof window==='undefined'?globalThis:window);"
MAIN = '__M["main"] = (function () {'

def integrate(html, block):
    if MARK in html:
        return html
    start = html.find(OLD_START)
    if start >= 0:
        end = html.index(OLD_END, start) + len(OLD_END)
        html = html[:start] + html[end:].lstrip('\n')
    elif 'EF_WORKSHOP_V1' in html:
        raise ValueError('Old workshop marker present but its code block was not found; refusing to guess.')
    if html.count(MAIN) != 1:
        raise ValueError('Expected exactly one bundled main module anchor')
    html = html.replace(MAIN, block.rstrip() + '\n' + MAIN, 1)
    install = 'window.EngineForgeWorkshop.install(__M,state);'
    if install not in html:
        anchor = 'window.__forge = state; // for QA'
        if html.count(anchor) != 1:
            raise ValueError('State export anchor missing')
        html = html.replace(anchor, anchor + '\n' + install, 1)
    pose = 'pose(sim.crank || 0, $("e3dExp").value / 100);'
    if 'window.EFWorkshopPose(nodes)' not in html:
        if html.count(pose) != 1:
            raise ValueError('3D pose anchor missing')
        html = html.replace(pose, pose + ' if(window.EFWorkshopPose)window.EFWorkshopPose(nodes);', 1)
    if html.count('</head>') != 1:
        raise ValueError('Expected one </head>')
    return html.replace('</head>', MARK + '\n</head>', 1)

def check(html):
    scripts = re.findall(r'<script\b[^>]*>([\s\S]*?)</script\s*>', html, re.I)
    if not scripts:
        raise ValueError('No inline scripts found')
    with tempfile.TemporaryDirectory() as d:
        for i, script in enumerate(scripts):
            path = Path(d) / f'check-{i}.js'
            path.write_text(script)
            subprocess.run(['node', '--check', str(path)], check=True)

if __name__ == '__main__':
    path = Path(sys.argv[1] if len(sys.argv) > 1 else 'index.html')
    block = Path(sys.argv[2] if len(sys.argv) > 2 else 'placement-v2.js').read_text()
    result = integrate(path.read_text(), block)
    check(result)
    if integrate(result, block) != result:
        raise ValueError('Integration is not idempotent')
    path.write_text(result)
    print('Placement controls embedded; inline JavaScript syntax passed.')
